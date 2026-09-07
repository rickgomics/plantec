'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import { HiLink, HiClipboard, HiXMark, HiArrowDownTray } from 'react-icons/hi2'
import BOMTable from '@/components/BOMTable'
import AlertPanel from '@/components/AlertPanel'
import ProductSearchModal from '@/components/ProductSearchModal'
import AIGenerateButton from '@/components/AIGenerateButton'
import MermaidDiagram from '@/components/MermaidDiagram'
import IntelbrasModal, { IntelbrasProduct } from '@/components/IntelbrasModal'
import AIProjectModal, { AIProjectImportItem } from '@/components/AIProjectModal'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Proposal, ProposalItem, Product, RuleEngineResult, CompanyProfile } from '@/types'
import { COVER_STYLES, getCoverStyle } from '@/lib/coverStyles'
import toast from 'react-hot-toast'

const STATUS_FLOW: Record<string, string> = {
  draft: 'generated',
  generated: 'sent',
  sent: 'approved',
}

type Tab = 'bom' | 'cover' | 'intro' | 'scenario'

// ── Scope visual preview ────────────────────────────────────────────────────
type ParsedLine =
  | { type: 'gap' }
  | { type: 'header'; text: string; excluded: boolean }
  | { type: 'bullet'; text: string; excluded: boolean }
  | { type: 'text'; text: string }

function parseScopeLines(raw: string): ParsedLine[] {
  let inExcluded = false
  const result: ParsedLine[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) { result.push({ type: 'gap' }); continue }
    if (t.endsWith(':') && t.length < 80) {
      inExcluded = /não|fora|exclu/i.test(t)
      result.push({ type: 'header', text: t.slice(0, -1), excluded: inExcluded })
      continue
    }
    const bulletMatch = t.match(/^([•\-*→✓✗✕×])\s+(.+)/)
    if (bulletMatch) {
      const neg = inExcluded || '✗✕×'.includes(bulletMatch[1])
      result.push({ type: 'bullet', text: bulletMatch[2], excluded: neg })
    } else {
      result.push({ type: 'text', text: t })
    }
  }
  return result
}

function ScopePreview({ text }: { text: string }) {
  const lines = parseScopeLines(text)
  return (
    <div className="space-y-1 text-sm">
      {lines.map((item, i) => {
        if (item.type === 'gap') return <div key={i} className="h-1" />
        if (item.type === 'header') return (
          <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? 'mt-2' : ''}`}>
            <div className={`h-px flex-1 ${item.excluded ? 'bg-red-200' : 'bg-brand-200'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${item.excluded ? 'text-red-400' : 'text-brand-500'}`}>
              {item.text}
            </span>
            <div className={`h-px flex-1 ${item.excluded ? 'bg-red-200' : 'bg-brand-200'}`} />
          </div>
        )
        if (item.type === 'bullet') return (
          <div key={i} className={`flex items-start gap-2.5 px-3 py-1.5 rounded-lg ${item.excluded ? 'bg-red-50' : 'bg-brand-50/60'}`}>
            <span className={`mt-0.5 text-xs font-black flex-shrink-0 w-3 text-center ${item.excluded ? 'text-red-500' : 'text-brand-600'}`}>
              {item.excluded ? '✕' : '✓'}
            </span>
            <span className={`font-medium leading-snug ${item.excluded ? 'text-red-700' : 'text-ink/75'}`}>{item.text}</span>
          </div>
        )
        return <p key={i} className="text-ink/55 leading-relaxed px-1">{item.text}</p>
      })}
    </div>
  )
}

export default function ProposalDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [ruleResult, setRuleResult] = useState<RuleEngineResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('bom')
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])

  // editable fields for new tabs
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [scope, setScope] = useState('')
  const [scenarioDesc, setScenarioDesc] = useState('')
  const [coverStyle, setCoverStyle] = useState('teal')
  const [coverProfileId, setCoverProfileId] = useState<string>('')
  const [introProfileId, setIntroProfileId] = useState<string>('')
  const [introText, setIntroText] = useState('')
  const [showUnitPrice, setShowUnitPrice] = useState(true)
  const [externalProjectId, setExternalProjectId] = useState('')
  const [linkingExt, setLinkingExt] = useState(false)

  // UI edit mode toggles
  const [editingScope, setEditingScope] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)

  // Scenario diagram — each type keeps its own content, switching never destroys the other
  const [diagramType, setDiagramType] = useState<'mermaid' | 'eraser'>('mermaid')
  const [mermaidCode, setMermaidCode] = useState('')
  const [eraserCode, setEraserCode] = useState('')
  const [eraserPreviewUrl, setEraserPreviewUrl] = useState<string | null>(null)
  const [eraserPreviewing, setEraserPreviewing] = useState(false)

  // Derived: active diagram content routes to the right state
  const scenarioDiagram = diagramType === 'eraser' ? eraserCode : mermaidCode
  const setScenarioDiagram = (v: string) => {
    if (diagramType === 'eraser') setEraserCode(v)
    else setMermaidCode(v)
  }

  const [scenarioGenerating, setScenarioGenerating] = useState(false)
  const [scenarioStep, setScenarioStep] = useState<'idle' | 'desc' | 'diagram'>('idle')

  const loadProposal = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`)
    const data = await res.json()
    if (data.proposal) {
      const p: Proposal = data.proposal
      setProposal(p)
      setGlobalDiscount(Number(p.discount))
      setExecutiveSummary(p.executiveSummary ?? '')
      setScope(p.scope ?? '')
      setScenarioDesc(p.scenarioDesc ?? '')
      const savedType = (p.diagramType as 'mermaid' | 'eraser') ?? 'mermaid'
      setDiagramType(savedType)
      // Populate the right slot — the other slot stays empty until the user generates it
      if (savedType === 'eraser') {
        setEraserCode(p.scenarioDiagram ?? '')
      } else {
        setMermaidCode(p.scenarioDiagram ?? '')
      }
      setEraserPreviewUrl(p.eraserImageUrl ?? null)
      setCoverStyle(p.coverStyle ?? 'teal')
      setCoverProfileId(p.coverProfileId ?? '')
      setIntroProfileId(p.introProfileId ?? '')
      setShowUnitPrice(p.showUnitPrice !== false)
      setExternalProjectId(p.externalProjectId ?? '')
    }
    setLoading(false)
  }, [id])

  const evaluate = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/evaluate`, { method: 'POST' })
    const data = await res.json()
    setRuleResult(data)
  }, [id])

  useEffect(() => { loadProposal() }, [loadProposal])
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles`).then(r => r.json()).then(d => setProfiles(d.profiles ?? []))
  }, [])
  useEffect(() => {
    if (introProfileId && profiles.length > 0) {
      const p = profiles.find(pr => pr.id === introProfileId)
      if (p?.description) setIntroText(p.description)
    }
  }, [introProfileId, profiles])
  useEffect(() => {
    if (proposal?.items?.length) evaluate()
  }, [proposal?.items, evaluate])

  // Auto-render Eraser preview when entering scenario tab with Eraser content
  useEffect(() => {
    if (
      activeTab === 'scenario' &&
      diagramType === 'eraser' &&
      scenarioDiagram.trim() &&
      !eraserPreviewUrl &&
      !eraserPreviewing
    ) {
      handleEraserPreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, diagramType])

  const computeTotals = (items: ProposalItem[], disc: number) => {
    const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
    const itemDisc = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity * (Number(i.discount) / 100), 0)
    const globalAmt = (subtotal - itemDisc) * disc / 100
    const totalDiscount = itemDisc + globalAmt
    const totalPrice = subtotal - totalDiscount
    const totalCost = items.reduce((s, i) => s + Number(i.cost) * i.quantity, 0)
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0
    return { subtotal, totalDiscount, totalPrice, totalCost, margin }
  }

  const totals = proposal ? computeTotals(proposal.items, globalDiscount) : null

  const handleAddProduct = async (product: Product, quantity: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity }),
    })
    await loadProposal()
  }

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    })
    await loadProposal()
  }

  const handleDiscountChange = async (itemId: string, discount: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, discount }),
    })
    await loadProposal()
  }

  const handlePriceChange = async (itemId: string, unitPrice: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, unitPrice }),
    })
    await loadProposal()
  }

  const handleRemoveItem = async (itemId: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items?itemId=${itemId}`, { method: 'DELETE' })
    await loadProposal()
  }

  const handleSave = async () => {
    if (!proposal || !totals) return
    setSaving(true)
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...proposal,
        discount: globalDiscount,
        totalCost: totals.totalCost,
        totalPrice: totals.totalPrice,
        totalDiscount: totals.totalDiscount,
        margin: totals.margin,
        executiveSummary,
        scope,
        scenarioDesc,
        scenarioDiagram,
        diagramType,
        coverStyle,
        showUnitPrice,
        coverProfileId: coverProfileId || null,
        introProfileId: introProfileId || null,
        externalProjectId: externalProjectId || null,
      }),
    })
    setSaving(false)
  }

  const handleAdvanceStatus = async () => {
    if (!proposal) return
    const next = STATUS_FLOW[proposal.status]
    if (!next) return
    setSaving(true)
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await loadProposal()
    setSaving(false)
  }

  const handleAddSuggestion = async (skus: string[]) => {
    for (const sku of skus) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products?search=${sku}`)
      const data = await res.json()
      const product = (data.products ?? []).find((p: Product) => p.sku === sku)
      if (product) await handleAddProduct(product, 1)
    }
  }

  // Build context object for AI calls (items capped at 20 for token budget)
  const buildScenarioContext = () => ({
    title: proposal?.title,
    vertical: proposal?.vertical,
    customer: proposal?.customer?.companyName,
    items: proposal?.items?.slice(0, 20).map(i => ({
      name: i.product.name, sku: i.product.sku,
      category: i.product.category, brand: i.product.brand,
      quantity: i.quantity,
    })),
  })

  // Generate description only (always regenerates)
  const handleGenerateDesc = async () => {
    setScenarioGenerating(true)
    setScenarioStep('desc')
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'scenarioDescription', context: buildScenarioContext() }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.text) {
        setScenarioDesc(d.text)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioDesc: d.text }),
        })
      }
    } catch (e) { toast.error(`Erro ao gerar descrição: ${e instanceof Error ? e.message : e}`) }
    finally { setScenarioGenerating(false); setScenarioStep('idle') }
  }

  // Generate diagram only (always regenerates, auto-renders Eraser)
  const handleGenerateDiagram = async (descOverride?: string) => {
    setScenarioGenerating(true)
    setScenarioStep('diagram')
    const desc = descOverride ?? scenarioDesc
    const aiType = diagramType === 'eraser' ? 'scenarioDiagramEraser' : 'scenarioDiagram'
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: aiType, context: { ...buildScenarioContext(), description: desc } }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.text) {
        setScenarioDiagram(d.text)
        setEraserPreviewUrl(null)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioDiagram: d.text, diagramType, eraserImageUrl: null }),
        })
        // Auto-render if Eraser mode
        if (diagramType === 'eraser') {
          setScenarioGenerating(false)
          setScenarioStep('idle')
          // slight delay so state settles before render call
          setTimeout(() => handleEraserPreviewWith(d.text), 200)
          return
        }
      }
    } catch (e) { toast.error(`Erro ao gerar diagrama: ${e instanceof Error ? e.message : e}`) }
    finally { setScenarioGenerating(false); setScenarioStep('idle') }
  }

  // Generate description then diagram sequentially
  const handleGenerateScenario = async () => {
    setScenarioGenerating(true)
    setScenarioStep('desc')
    let desc = scenarioDesc
    try {
      // always regenerate description
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'scenarioDescription', context: buildScenarioContext() }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      if (d.text) {
        desc = d.text
        setScenarioDesc(d.text)
        // Save description immediately so it's not lost if diagram step fails
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioDesc: d.text }),
        })
      }
    } catch (e) {
      toast.error(`Erro ao gerar descrição: ${e instanceof Error ? e.message : e}`)
      setScenarioGenerating(false); setScenarioStep('idle'); return
    }
    // Now generate diagram with fresh description
    setScenarioStep('diagram')
    const aiType = diagramType === 'eraser' ? 'scenarioDiagramEraser' : 'scenarioDiagram'
    try {
      const r2 = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: aiType, context: { ...buildScenarioContext(), description: desc } }),
      })
      const d2 = await r2.json()
      if (d2.error) throw new Error(d2.error)
      if (d2.text) {
        setScenarioDiagram(d2.text)
        setEraserPreviewUrl(null)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioDesc: desc, scenarioDiagram: d2.text, diagramType, eraserImageUrl: null }),
        })
        if (diagramType === 'eraser') {
          setScenarioGenerating(false); setScenarioStep('idle')
          setTimeout(() => handleEraserPreviewWith(d2.text), 200)
          return
        }
      }
    } catch (e) { toast.error(`Erro ao gerar diagrama: ${e instanceof Error ? e.message : e}`) }
    finally { setScenarioGenerating(false); setScenarioStep('idle') }
  }

  const saveEraserDiagram = async (text: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioDiagram: text, diagramType: 'eraser' }),
    })
  }

  // Core Eraser render — accepts explicit text so it works right after AI generation
  const handleEraserPreviewWith = async (text: string) => {
    if (!text.trim()) return
    setEraserPreviewing(true)
    setEraserPreviewUrl(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/eraser-render`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        setEraserPreviewUrl(data.imageUrl)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eraserImageUrl: data.imageUrl }),
        })
      } else toast.error(data.error ?? 'Eraser não retornou imagem')
    } catch { toast.error('Erro ao conectar com Eraser') }
    finally { setEraserPreviewing(false) }
  }

  const handleEraserPreview = () => handleEraserPreviewWith(scenarioDiagram)

  const isEraserDsl = (text: string) =>
    /\[icon:/i.test(text) || /^title\s/im.test(text) || /^direction\s/im.test(text)

  const handleDiagramTypeChange = async (t: 'mermaid' | 'eraser') => {
    if (t === diagramType) return
    setDiagramType(t)
    // Restore saved Eraser preview when switching back to eraser
    if (t === 'mermaid') setEraserPreviewUrl(null)
    // Persist only the type change — diagram content of each mode is preserved independently
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagramType: t }),
    })
  }

  // AI project analysis
  const [showAIProject, setShowAIProject] = useState(false)

  const handleAIProjectImport = async (items: AIProjectImportItem[]) => {
    let imported = 0
    for (const it of items) {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: it.productId, quantity: it.quantity }),
      })
      imported++
    }
    await loadProposal()
    if (imported > 0) toast.success(`${imported} produto${imported > 1 ? 's' : ''} adicionado${imported > 1 ? 's' : ''} à BOM`)
  }

  // Intelbras Hub import
  const [showIntelbras, setShowIntelbras] = useState(false)

  const handleIntelbrasImport = async (products: IntelbrasProduct[]) => {
    let imported = 0
    for (const p of products) {
      const code = (p.codigo_produto ?? p.cod_produto ?? '').trim()
      if (!code) continue
      const res  = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products?search=${encodeURIComponent(code)}&limit=1`)
      const data = await res.json()
      const local = (data.products ?? [])[0]
      if (local) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ productId: local.id, quantity: 1 }),
        })
        imported++
      }
    }
    await loadProposal()
    const miss = products.length - imported
    if (imported > 0) toast.success(`${imported} produto${imported > 1 ? 's' : ''} Intelbras adicionado${imported > 1 ? 's' : ''} à BOM`)
    if (miss > 0)    toast.error(`${miss} produto${miss > 1 ? 's' : ''} não encontrado${miss > 1 ? 's' : ''} no catálogo local`)
  }

  // Portal Plantec import
  const [showPortalImport, setShowPortalImport] = useState(false)
  const [portalQuotationId, setPortalQuotationId] = useState('')
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [portalImporting, setPortalImporting] = useState(false)
  const [portalItems, setPortalItems] = useState<{ code: string; name: string; quantity: number; unitPrice: number }[]>([])
  const [portalError, setPortalError] = useState('')
  const [portalStep, setPortalStep] = useState<'input' | 'preview'>('input')

  const handlePortalFetch = async () => {
    if (!portalQuotationId.trim()) return
    setPortalImporting(true)
    setPortalError('')
    try {
      const body: Record<string, string> = { quotationId: portalQuotationId.trim() }
      if (portalEmail.trim())    body.email    = portalEmail.trim()
      if (portalPassword.trim()) body.password = portalPassword.trim()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/portal-plantec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao buscar orçamento')
      if (!data.items?.length) throw new Error('Nenhum item encontrado no orçamento')
      setPortalItems(data.items)
      setPortalStep('preview')
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : String(e))
    } finally {
      setPortalImporting(false)
    }
  }

  const handlePortalImport = async () => {
    setPortalImporting(true)
    let imported = 0
    for (const item of portalItems) {
      // Search by SKU or name in the local product catalog
      const query = item.code || item.name.split(' ').slice(0, 3).join(' ')
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products?search=${encodeURIComponent(query)}&limit=1`)
      const data = await res.json()
      const product = (data.products ?? [])[0]
      if (product) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantity: item.quantity }),
        })
        imported++
      }
    }
    await loadProposal()
    setPortalImporting(false)
    setShowPortalImport(false)
    setPortalStep('input')
    setPortalItems([])
    setPortalQuotationId('')
    toast.success(`${imported} de ${portalItems.length} produtos importados`)
  }

  // Auto-fill BOM Técnica: AI roles + product descriptions as "Descritivo"
  const [fillingBom, setFillingBom] = useState(false)
  const handleFillBomTech = async () => {
    if (!proposal || proposal.items.length === 0) return
    setFillingBom(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bomRoles',
          context: {
            title: proposal.title,
            vertical: proposal.vertical,
            customer: proposal.customer.companyName,
            items: proposal.items.map(i => ({
              sku: i.product.sku,
              name: i.product.name,
              category: i.product.category,
              brand: i.product.brand,
              quantity: i.quantity,
              description: i.product.description?.slice(0, 200),
            })),
          },
        }),
      })
      const data = await res.json()
      let roles: { sku: string; role: string }[] = []
      try { roles = JSON.parse(data.text || '[]') } catch { /* ignore */ }

      for (const item of proposal.items) {
        const matched = roles.find(r => r.sku === item.product.sku)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}/items`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: item.id,
            role: matched?.role ?? item.role,
            technicalNotes: item.product.description ?? item.technicalNotes,
          }),
        })
      }
      await loadProposal()
    } catch { alert('Erro ao preencher BOM técnica') }
    finally { setFillingBom(false) }
  }

  // Save intro text back to the selected company profile
  const [savingProfile, setSavingProfile] = useState(false)
  const handleSaveProfileDesc = async () => {
    if (!introProfileId) return
    setSavingProfile(true)
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/${introProfileId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: introText }),
    })
    setProfiles(prev => prev.map(p => p.id === introProfileId ? { ...p, description: introText } : p))
    setSavingProfile(false)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const canAdvance = proposal && STATUS_FLOW[proposal.status] && !ruleResult?.isBlocked

  const coverProfile = profiles.find(p => p.id === coverProfileId)
  const introProfile = profiles.find(p => p.id === introProfileId)
  const aiContext = {
    title: proposal?.title,
    vertical: proposal?.vertical,
    customer: proposal?.customer?.companyName,
    itemCount: proposal?.items?.length,
    totalPrice: totals?.totalPrice,
  }
  const scenarioAiContext = {
    ...aiContext,
    description: scenarioDesc,
    items: proposal?.items?.map(i => ({
      name: i.product.name,
      sku: i.product.sku,
      category: i.product.category,
      brand: i.product.brand,
      quantity: i.quantity,
      description: i.product.description?.slice(0, 120),
    })),
  }

  if (loading) {
    return <AppLayout><div className="p-10 text-center text-ink/45">Carregando proposta...</div></AppLayout>
  }
  if (!proposal) {
    return <AppLayout><div className="p-10 text-center text-ink/45">Proposta não encontrada.</div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="shell">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-ink/45">{proposal.number}</span>
              <StatusBadge status={proposal.status} />
            </div>
            <div className="eyebrow">Proposta</div>
            <h1 className="page-title truncate">{proposal.title}</h1>
            <p className="text-ink/55 text-sm">
              {proposal.customer.companyName} · {proposal.vertical} ·{' '}
              Válida por {proposal.validityDays} dias
            </p>

            {/* Vínculo externo */}
            {externalProjectId ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1">
                  <HiLink className="w-3.5 h-3.5" />
                  Projeto externo: <span className="font-mono">{externalProjectId}</span>
                </span>
                <button
                  title="Copiar link de abertura"
                  onClick={() => {
                    const url = `${window.location.origin}/open/${externalProjectId}`
                    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!'))
                  }}
                  className="p-1 text-ink/45 hover:text-brand-600 transition-colors"
                >
                  <HiClipboard className="w-4 h-4" />
                </button>
                <button
                  title="Desvincular"
                  onClick={async () => {
                    setExternalProjectId('')
                    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ externalProjectId: null }),
                    })
                    toast.success('Proposta desvinculada')
                  }}
                  className="p-1 text-ink/45 hover:text-red-500 transition-colors"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                {linkingExt ? (
                  <form
                    onSubmit={async e => {
                      e.preventDefault()
                      const val = (e.currentTarget.elements.namedItem('extid') as HTMLInputElement).value.trim()
                      if (!val) return
                      setExternalProjectId(val)
                      setLinkingExt(false)
                      await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ externalProjectId: val }),
                      })
                      toast.success('Proposta vinculada')
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      name="extid"
                      autoFocus
                      placeholder="ID do projeto externo"
                      className="text-xs border rounded-full px-3 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <button type="submit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">OK</button>
                    <button type="button" onClick={() => setLinkingExt(false)} className="text-xs text-ink/45 hover:text-ink/65">×</button>
                  </form>
                ) : (
                  <button
                    onClick={() => setLinkingExt(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-ink/45 hover:text-brand-600 transition-colors"
                  >
                    <HiLink className="w-3.5 h-3.5" />
                    Vincular projeto externo
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleSave} disabled={saving} className="btn-secondary">
              {saving ? 'Salvando...' : '💾 Salvar'}
            </button>
            {canAdvance && (
              <button onClick={handleAdvanceStatus} disabled={saving} className="btn-primary">
                {proposal.status === 'draft' ? '⚡ Gerar Proposta' :
                 proposal.status === 'generated' ? '📧 Marcar Enviada' :
                 '✅ Aprovar'}
              </button>
            )}
            <Link href={`/proposals/${id}/pdf`} target="_blank" className="btn-secondary">
              👁 Preview
            </Link>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/proposals/${id}/download`} download className="btn-primary flex items-center gap-1.5 text-sm">
              ⬇ Baixar PDF
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-6 border-b border-line/15">
          {([
            { key: 'bom',      label: 'BOM'        },
            { key: 'cover',    label: 'Capa'       },
            { key: 'intro',    label: 'Introdução' },
            { key: 'scenario', label: 'Cenário'    },
          ] as { key: Tab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-ink/45 hover:text-ink/65 hover:border-line/15'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: BOM */}
        {activeTab === 'bom' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="card">
                <div className="flex items-center justify-between px-5 py-4 border-b gap-3">
                  <h2 className="font-black text-ink tracking-tight">BOM Comercial</h2>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="flex items-center gap-2 text-sm">
                      <label className="text-ink/45 text-xs font-semibold">Desc. global:</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="w-14 text-center border border-line/15 rounded-lg px-1.5 py-1 text-sm font-semibold focus:ring-2 focus:ring-brand-400 focus:outline-none"
                      />
                      <span className="text-ink/45 text-xs font-semibold">%</span>
                    </div>
                    {proposal.items.length > 0 && (
                      <button
                        onClick={handleFillBomTech}
                        disabled={fillingBom}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-50"
                        title="Gera função de cada item com IA e preenche Descritivo com a descrição do produto"
                      >
                        {fillingBom ? <span className="animate-spin">◌</span> : '◈'}
                        {fillingBom ? 'Preenchendo…' : 'Preencher BOM Técnica'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowAIProject(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                      title="Montar BOM automaticamente com IA"
                    >
                      ✨ IA
                    </button>
                    <button
                      onClick={() => setShowIntelbras(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      title="Buscar produtos no catálogo Intelbras"
                    >
                      📷 Intelbras
                    </button>
                    <button
                      onClick={() => { setShowPortalImport(true); setPortalStep('input'); setPortalError(''); setPortalItems([]) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      title="Importar itens de um orçamento do Portal Plantec"
                    >
                      <HiArrowDownTray className="w-3.5 h-3.5" />
                      Portal Plantec
                    </button>
                    <button onClick={() => setShowAddProduct(true)} className="btn-primary text-xs px-3 py-1.5">
                      + Adicionar Produto
                    </button>
                  </div>
                </div>
                <BOMTable
                  items={proposal.items}
                  onQuantityChange={handleQuantityChange}
                  onDiscountChange={handleDiscountChange}
                  onPriceChange={handlePriceChange}
                  onRemove={handleRemoveItem}
                />
              </div>

              {totals && proposal.items.length > 0 && (
                <div className="card p-5">
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2 text-sm">
                      <div className="flex justify-between text-ink/65">
                        <span>Subtotal:</span><span>{fmt(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-ink/65">
                        <span>Descontos:</span><span className="text-red-600">-{fmt(totals.totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-ink text-base pt-2 border-t border-line/15">
                        <span>Total:</span><span>{fmt(totals.totalPrice)}</span>
                      </div>
                      <div className={`flex justify-between font-medium ${totals.margin >= 15 ? 'text-green-600' : totals.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        <span>Margem estimada:</span><span>{totals.margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo Executivo */}
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-black text-ink tracking-tight text-sm">Resumo Executivo</h3>
                    <p className="text-xs text-ink/45 font-medium mt-0.5">Destaque o valor entregue e o diferencial da Plantec</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AIGenerateButton type="executiveSummary" context={aiContext} onGenerated={(t) => { setExecutiveSummary(t); setEditingSummary(false) }} />
                    {executiveSummary && (
                      <button onClick={() => setEditingSummary(e => !e)} className="btn-secondary text-xs px-3 py-1.5">
                        {editingSummary ? 'Ver' : 'Editar'}
                      </button>
                    )}
                  </div>
                </div>

                {editingSummary || !executiveSummary ? (
                  <textarea
                    value={executiveSummary}
                    onChange={e => setExecutiveSummary(e.target.value)}
                    rows={5}
                    placeholder="Descreva o valor entregue ao cliente, o diferencial da solução e os benefícios esperados..."
                    className="input"
                    autoFocus={editingSummary}
                  />
                ) : (
                  <div
                    className="relative bg-brand-50/40 border border-brand-100 rounded-xl p-4 cursor-pointer group"
                    onClick={() => setEditingSummary(true)}
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-brand-500 bg-surface px-2 py-0.5 rounded-full border border-brand-200">editar</span>
                    </div>
                    <p className="text-sm text-ink/75 leading-relaxed whitespace-pre-line">{executiveSummary}</p>
                  </div>
                )}
              </div>

              {/* Escopo */}
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-black text-ink tracking-tight text-sm">Escopo do Projeto</h3>
                    <p className="text-xs text-ink/45 font-medium mt-0.5">O que está e não está incluso nesta proposta</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AIGenerateButton
                      type="scope"
                      context={{ ...aiContext, items: proposal.items.map(i => ({ name: i.product.name, category: i.product.category, quantity: i.quantity })) }}
                      onGenerated={(t) => { setScope(t); setEditingScope(false) }}
                    />
                    {scope && (
                      <button onClick={() => setEditingScope(e => !e)} className="btn-secondary text-xs px-3 py-1.5">
                        {editingScope ? 'Ver' : 'Editar'}
                      </button>
                    )}
                  </div>
                </div>

                {editingScope || !scope ? (
                  <textarea
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    rows={8}
                    placeholder={`Está incluso:\n• Item 1\n• Item 2\n\nNão está incluso:\n• Item A\n• Item B`}
                    className="input font-medium text-sm"
                    autoFocus={editingScope}
                  />
                ) : (
                  <div
                    className="cursor-pointer group"
                    onClick={() => setEditingScope(true)}
                  >
                    <div className="flex justify-end mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">editar</span>
                    </div>
                    <ScopePreview text={scope} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <AlertPanel result={ruleResult} onAddSuggestion={handleAddSuggestion} />
              <div className="card p-4 text-sm space-y-2">
                <h3 className="font-semibold text-ink/75 mb-2">Informações</h3>
                <div className="flex justify-between">
                  <span className="text-ink/55">Itens na BOM:</span>
                  <span className="font-medium">{proposal.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/55">Criada em:</span>
                  <span>{new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/55">Validade:</span>
                  <span>{proposal.validityDays} dias</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Capa */}
        {activeTab === 'cover' && (
          <div className="max-w-2xl space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-ink">Perfil da Capa</h2>
              <p className="text-sm text-ink/55">Selecione o perfil que aparecerá na capa da proposta.</p>

              <div>
                <label className="block text-sm font-medium text-ink/75 mb-2">Empresa na Capa</label>
                <select
                  value={coverProfileId}
                  onChange={e => setCoverProfileId(e.target.value)}
                  className="input"
                >
                  <option value="">— Sem perfil (Plantec padrão) —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.type === 'plantec' ? 'Plantec' : 'Parceiro'}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {coverProfile && (
                <div className="border rounded-xl p-4 bg-background space-y-2">
                  <div className="flex items-center gap-4">
                    {coverProfile.logoBase64 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverProfile.logoBase64} alt={coverProfile.name} className="h-16 object-contain" />
                    )}
                    <div>
                      <div className="font-semibold">{coverProfile.name}</div>
                      {coverProfile.website && <div className="text-xs text-blue-600">{coverProfile.website}</div>}
                      {coverProfile.phone && <div className="text-xs text-ink/55">{coverProfile.phone}</div>}
                    </div>
                  </div>
                  {coverProfile.description && (
                    <p className="text-xs text-ink/65">{coverProfile.description}</p>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Link href="/settings/profiles" className="text-sm text-blue-600 hover:underline">
                  + Criar ou editar perfis de empresa →
                </Link>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-ink/75 text-sm">Estilo da Capa</h3>
              {/* Clássicos */}
              <div>
                <p className="text-xs text-ink/45 font-semibold uppercase tracking-wider mb-2">Clássicos</p>
                <div className="flex gap-3 flex-wrap">
                  {COVER_STYLES.filter(s => !s.vertical).map(s => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        setCoverStyle(s.id)
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ coverStyle: s.id }),
                        })
                      }}
                      title={s.name}
                      className={`relative rounded-xl overflow-hidden w-24 h-14 transition-all ${
                        coverStyle === s.id
                          ? 'ring-2 ring-brand-500 ring-offset-2 shadow-md scale-105'
                          : 'hover:scale-102 opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: s.bg }}
                    >
                      {s.pattern && <div className="absolute inset-0" style={{ background: s.pattern }} />}
                      <div className="absolute inset-x-0 bottom-0 py-1 text-center"
                        style={{ background: 'rgba(0,0,0,0.28)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: s.text }}>
                        {s.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Verticais */}
              <div>
                <p className="text-xs text-ink/45 font-semibold uppercase tracking-wider mb-2">Por Vertical</p>
                <div className="flex gap-3 flex-wrap">
                  {COVER_STYLES.filter(s => !!s.vertical).map(s => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        setCoverStyle(s.id)
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ coverStyle: s.id }),
                        })
                      }}
                      title={s.vertical}
                      className={`relative rounded-xl overflow-hidden w-28 h-16 transition-all ${
                        coverStyle === s.id
                          ? 'ring-2 ring-brand-500 ring-offset-2 shadow-md scale-105'
                          : 'hover:scale-102 opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: s.bg }}
                    >
                      {s.pattern && <div className="absolute inset-0" style={{ background: s.pattern }} />}
                      {/* mini accent bar */}
                      <div className="absolute top-2 left-2 w-5 h-0.5 rounded" style={{ background: s.accent }} />
                      <div className="absolute inset-x-0 bottom-0 py-1 px-1 text-center"
                        style={{ background: 'rgba(0,0,0,0.35)', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: s.text, lineHeight: 1.3 }}>
                        {s.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-ink/75 mb-3 text-sm">Pré-visualização</h3>
              {(() => {
                const s = getCoverStyle(coverStyle)
                return (
                  <div className="rounded-2xl overflow-hidden min-h-[300px] flex flex-col relative"
                    style={{ background: s.bg }}>
                    {s.pattern && <div className="absolute inset-0 pointer-events-none" style={{ background: s.pattern }} />}
                    {/* SVG decoration */}
                    {s.decorationSvg && (
                      <div
                        className="absolute inset-0 pointer-events-none overflow-hidden"
                        style={{ zIndex: 0 }}
                        dangerouslySetInnerHTML={{ __html: s.decorationSvg }}
                      />
                    )}
                    {/* Top bar */}
                    <div className="flex justify-between items-center px-8 py-5 relative z-10"
                      style={{ borderBottom: `1px solid ${s.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                      {coverProfile?.logoBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverProfile.logoBase64} alt={coverProfile.name} className="h-10 object-contain" style={{ filter: s.dark ? 'brightness(0) invert(1)' : 'none' }} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: s.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
                            <span className="font-black text-sm" style={{ color: s.text }}>P</span>
                          </div>
                          <span className="font-black text-sm tracking-tight" style={{ color: s.text }}>PLANTEC</span>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: s.subText }}>Proposta Comercial</div>
                        <div className="font-mono text-xs font-semibold mt-0.5" style={{ color: s.subText }}>{proposal.number}</div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 flex flex-col justify-center px-8 py-8 relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-0.5 rounded" style={{ background: s.accent }} />
                        <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: s.accentLight }}>{proposal.vertical}</div>
                      </div>
                      <div className="font-black text-2xl leading-tight tracking-tight mb-4" style={{ color: s.text }}>{proposal.title}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-px" style={{ background: s.dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />
                        <div className="text-sm font-semibold" style={{ color: s.subText }}>{proposal.customer.companyName}</div>
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="px-8 py-4 relative z-10" style={{ background: s.footerBg, borderTop: `1px solid ${s.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: s.subText }}>
                        Válida por {proposal.validityDays} dias
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Tab: Introdução */}
        {activeTab === 'intro' && (
          <div className="max-w-2xl space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-ink">Empresa Apresentada</h2>
              <div>
                <label className="block text-sm font-medium text-ink/75 mb-2">Perfil de Introdução</label>
                <select
                  value={introProfileId}
                  onChange={e => {
                    setIntroProfileId(e.target.value)
                    const p = profiles.find(x => x.id === e.target.value)
                    if (p?.description) setIntroText(p.description)
                  }}
                  className="input"
                >
                  <option value="">— Selecione um perfil —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.type === 'plantec' ? 'Plantec' : 'Parceiro'}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {introProfile?.logoBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={introProfile.logoBase64} alt={introProfile.name} className="h-14 object-contain" />
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="label">Texto de Apresentação</label>
                    {introProfileId && (
                      <p className="text-[10px] text-ink/45 font-medium mt-0.5">
                        Edições aqui podem ser salvas de volta ao perfil
                      </p>
                    )}
                  </div>
                  <AIGenerateButton
                    type="introText"
                    context={{ company: introProfile?.name ?? 'Plantec Distribuidora', ...aiContext }}
                    onGenerated={setIntroText}
                    label="Gerar com IA"
                  />
                </div>
                <textarea
                  value={introText}
                  onChange={e => setIntroText(e.target.value)}
                  rows={10}
                  placeholder="Descreva a empresa apresentada nesta proposta..."
                  className="input"
                />
                {introProfileId && introText && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-ink/45 font-medium">
                      Este texto será salvo na proposta. Para reutilizar em outras propostas, salve no perfil.
                    </p>
                    <button
                      onClick={handleSaveProfileDesc}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-50 flex-shrink-0 ml-3"
                    >
                      {savingProfile ? '…' : '↑'} Salvar no Perfil
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-line/10">
                <Link href="/settings/profiles" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  + Criar ou editar perfis de empresa →
                </Link>
                {introProfile && (
                  <span className="text-[10px] text-ink/45 font-medium">
                    Perfil: {introProfile.type === 'plantec' ? 'Plantec' : 'Parceiro'} · {introProfile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Opções do PDF */}
            <div className="card p-6 space-y-3">
              <h2 className="font-semibold text-ink text-sm">Opções do PDF</h2>
              <p className="text-xs text-ink/45">Controle o que é exibido na tabela de produtos da proposta.</p>

              <label className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                  hover:border-brand-200 hover:bg-brand-50/40"
                style={{ borderColor: showUnitPrice ? 'var(--brand-500, #00928E)' : '#E2E8F0',
                         background:   showUnitPrice ? '#F0FAFA' : 'white' }}
                onClick={async () => {
                  const next = !showUnitPrice
                  setShowUnitPrice(next)
                  await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ showUnitPrice: next }),
                  })
                }}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${showUnitPrice ? 'border-brand-500 bg-brand-500' : 'border-line/20 bg-surface'}`}>
                  {showUnitPrice && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink/80">
                    {showUnitPrice ? 'Exibir preço unitário e desconto' : 'Exibir apenas preço total'}
                  </div>
                  <div className="text-xs text-ink/55 mt-0.5 leading-relaxed">
                    {showUnitPrice
                      ? 'A BOM mostrará: SKU · Produto · Qtd · Preço Unit. · Desc. · Total'
                      : 'A BOM mostrará apenas: SKU · Produto · Qtd · Total — sem detalhar preço unitário nem desconto por item'}
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Tab: Cenário */}
        {activeTab === 'scenario' && (
          <div className="space-y-5">

            {/* Description row */}
            <div className="card p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-black text-ink tracking-tight">Cenário Técnico</h2>
                  <p className="text-xs text-ink/45 font-medium mt-0.5">
                    Ambiente · Arquitetura · Vantagens · Benefícios — a IA gera tudo com base na BOM
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {/* Primary: generate all */}
                  <button
                    onClick={handleGenerateScenario}
                    disabled={scenarioGenerating}
                    className="btn-primary flex items-center gap-2 text-xs px-4 py-2 whitespace-nowrap"
                  >
                    {scenarioGenerating ? (
                      <>
                        <span className="animate-spin text-base">◌</span>
                        {scenarioStep === 'desc' ? 'Descrevendo…' : 'Desenhando…'}
                      </>
                    ) : '✦ Gerar Tudo'}
                  </button>

                  {/* Secondary: individual buttons */}
                  {!scenarioGenerating && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleGenerateDesc}
                        disabled={scenarioGenerating}
                        className="btn-secondary text-[10px] px-3 py-1.5 whitespace-nowrap"
                      >
                        ↺ Só Descrição
                      </button>
                      <button
                        onClick={() => handleGenerateDiagram()}
                        disabled={scenarioGenerating || !scenarioDesc.trim()}
                        className="btn-secondary text-[10px] px-3 py-1.5 whitespace-nowrap disabled:opacity-40"
                      >
                        ↺ Só Diagrama
                      </button>
                    </div>
                  )}

                  {/* Progress steps */}
                  {scenarioGenerating && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className={`px-2 py-0.5 rounded-full ${scenarioStep === 'desc' ? 'bg-brand-500 text-white' : 'bg-ink/5 text-ink/45'}`}>
                        1 Descrição
                      </span>
                      <span className="text-ink/35">→</span>
                      <span className={`px-2 py-0.5 rounded-full ${scenarioStep === 'diagram' ? 'bg-brand-500 text-white' : 'bg-ink/5 text-ink/45'}`}>
                        2 Diagrama
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <textarea
                value={scenarioDesc}
                onChange={e => setScenarioDesc(e.target.value)}
                onBlur={e => {
                  if (e.target.value.trim()) fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenarioDesc: e.target.value }),
                  })
                }}
                rows={10}
                placeholder={`A IA irá gerar um cenário completo com:\n\n• Descrição do ambiente físico e infraestrutura\n• Arquitetura da solução com os equipamentos da BOM\n• Integração com sistemas existentes e dependências externas\n\nVANTAGENS TÉCNICAS:\n• Redundância, escalabilidade, integração com sistemas legados…\n\nBENEFÍCIOS PARA O CLIENTE:\n• Redução de custos operacionais, aumento de segurança, ROI…`}
                className="input font-sans text-sm leading-relaxed"
              />

              {/* BOM context chips */}
              {proposal.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {proposal.items.slice(0, 12).map(i => (
                    <span key={i.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold ring-1 ring-inset ring-brand-200">
                      <span className="font-mono text-brand-400">{i.quantity}×</span> {i.product.name}
                    </span>
                  ))}
                  {proposal.items.length > 12 && (
                    <span className="px-2 py-0.5 rounded-full bg-ink/5 text-ink/45 text-[10px] font-semibold">
                      +{proposal.items.length - 12} itens
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Diagram row: code + preview */}
            <div className="grid grid-cols-5 gap-5">

              {/* Left: type selector + code editor */}
              <div className="col-span-2 card p-5 flex flex-col gap-3">

                {/* Type toggle */}
                <div className="flex items-center gap-1 bg-ink/5 rounded-lg p-1 self-start">
                  <button
                    onClick={() => handleDiagramTypeChange('mermaid')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${diagramType === 'mermaid' ? 'bg-surface shadow text-ink' : 'text-ink/55 hover:text-ink/75'}`}
                  >
                    Mermaid
                  </button>
                  <button
                    onClick={() => handleDiagramTypeChange('eraser')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${diagramType === 'eraser' ? 'bg-surface shadow text-ink' : 'text-ink/55 hover:text-ink/75'}`}
                  >
                    ✦ Eraser
                  </button>
                </div>

                {diagramType === 'mermaid' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="label">Código Mermaid</span>
                      <span className="text-[10px] text-ink/45 font-semibold font-mono bg-ink/5 px-2 py-0.5 rounded-md">editável</span>
                    </div>
                    <textarea
                      value={scenarioDiagram}
                      onChange={e => setScenarioDiagram(e.target.value)}
                      onBlur={e => {
                        if (e.target.value.trim()) fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/proposals/${id}`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scenarioDiagram: e.target.value, diagramType: 'mermaid' }),
                        })
                      }}
                      rows={20}
                      spellCheck={false}
                      placeholder={'graph TD\n\n  subgraph Internet\n    CLOUD["☁ Nuvem"]\n  end\n\n  CAM["Câmera IP"] -->|"PoE"| SW\n  SW["Switch"] --> NVR\n  NVR --> CLOUD'}
                      className="input font-mono text-xs leading-relaxed flex-1 resize-none"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    />
                    <div className="text-[10px] text-ink/45 font-medium space-y-0.5">
                      <div><span className="inline-block w-3 h-3 rounded-sm bg-brand-50 border border-brand-300 mr-1" />Equipamentos propostos</div>
                      <div><span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border border-amber-300 mr-1" />Sistemas existentes</div>
                      <div><span className="inline-block w-3 h-3 rounded-sm border border-line/20 mr-1" style={{ background: 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 2px,#fff 2px,#fff 5px)' }} />Módulos externos/faltantes</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="label">Prompt / Código Eraser</span>
                      <a href="https://docs.eraser.io/docs/syntax" target="_blank" rel="noreferrer"
                        className="text-[10px] text-brand-500 hover:underline font-semibold">
                        sintaxe ↗
                      </a>
                    </div>
                    <textarea
                      value={scenarioDiagram}
                      onChange={e => { setScenarioDiagram(e.target.value); setEraserPreviewUrl(null) }}
                      onBlur={e => { if (e.target.value.trim()) saveEraserDiagram(e.target.value) }}
                      rows={18}
                      spellCheck={false}
                      placeholder={`Descreva a arquitetura em linguagem natural ou use a sintaxe Eraser:\n\nCloud provider: AWS\n\nUsers > Internet Gateway\nInternet Gateway > Load Balancer\nLoad Balancer > [App Server 1, App Server 2]\n[App Server 1, App Server 2] > Database\n\n// Ou simplesmente descreva:\n// "NVR conectado via switch PoE a 12 câmeras IP\n//  em 3 andares, com acesso remoto via VPN"`}
                      className="input text-xs leading-relaxed flex-1 resize-none"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    />
                    <button
                      onClick={handleEraserPreview}
                      disabled={eraserPreviewing || !scenarioDiagram.trim()}
                      className="btn-primary text-xs py-2 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {eraserPreviewing ? (
                        <><span className="animate-spin">◌</span> Gerando…</>
                      ) : (
                        <>✦ Gerar Preview</>
                      )}
                    </button>
                    <p className="text-[10px] text-ink/45 leading-relaxed">
                      Requer plano Starter+ do Eraser. Configure <code className="bg-ink/5 px-1 rounded">ERASER_API_KEY</code> no <code className="bg-ink/5 px-1 rounded">.env</code>.
                    </p>
                  </>
                )}
              </div>

              {/* Right: preview panel */}
              <div className="col-span-3 card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="label">{diagramType === 'eraser' ? 'Diagrama Eraser' : 'Topologia de Rede'}</span>
                  {scenarioDiagram && diagramType === 'mermaid' && (
                    <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-brand-200">
                      ● ao vivo
                    </span>
                  )}
                  {eraserPreviewUrl && (
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-violet-200">
                      ✦ Eraser
                    </span>
                  )}
                </div>

                {diagramType === 'eraser' ? (
                  eraserPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={eraserPreviewUrl} alt="Diagrama Eraser" className="w-full rounded-lg border border-line/10 object-contain" style={{ maxHeight: 480 }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 min-h-[440px] border-2 border-dashed border-violet-100 rounded-xl text-center bg-violet-50/30">
                      <div className="text-4xl mb-3 opacity-30 select-none">✦</div>
                      <p className="text-sm font-semibold text-ink/45">Preview do Eraser</p>
                      <p className="text-xs text-ink/35 mt-1 font-medium">
                        {scenarioDiagram.trim() ? 'Clique em "Gerar Preview" para renderizar' : 'Preencha o prompt à esquerda'}
                      </p>
                    </div>
                  )
                ) : scenarioDiagram ? (
                  <MermaidDiagram code={scenarioDiagram} className="min-h-[440px] flex-1" />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[440px] border-2 border-dashed border-line/10 rounded-xl text-center">
                    <div className="text-5xl mb-3 opacity-20 select-none">◈</div>
                    <p className="text-sm font-semibold text-ink/45">Diagrama de topologia aparece aqui</p>
                    <p className="text-xs text-ink/35 mt-1 font-medium">Descreva o cenário acima e clique em &quot;Gerar Diagrama&quot;</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {showAddProduct && (
        <ProductSearchModal
          onClose={() => setShowAddProduct(false)}
          onAdd={handleAddProduct}
        />
      )}

      {/* AI Project Analysis Modal */}
      {showAIProject && (
        <AIProjectModal
          onClose={() => setShowAIProject(false)}
          onImport={handleAIProjectImport}
        />
      )}

      {/* Intelbras Hub Modal */}
      {showIntelbras && (
        <IntelbrasModal
          onClose={() => setShowIntelbras(false)}
          onImport={handleIntelbrasImport}
        />
      )}

      {/* Portal Plantec Import Modal */}
      {showPortalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line/10">
              <div>
                <h2 className="font-black text-ink">Importar do Portal Plantec</h2>
                <p className="text-xs text-ink/45 mt-0.5">Informe o número do orçamento para buscar os itens</p>
              </div>
              <button
                onClick={() => { setShowPortalImport(false); setPortalStep('input'); setPortalItems([]); setPortalError('') }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink/45 hover:bg-ink/5 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {portalStep === 'input' ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink/55 uppercase tracking-wider mb-2">
                    Número do Orçamento
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={portalQuotationId}
                    onChange={e => setPortalQuotationId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePortalFetch()}
                    placeholder="Ex: 20917181"
                    className="w-full border border-line/15 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
                <div className="border-t border-line/10 pt-4">
                  <p className="text-xs text-ink/45 mb-3 font-medium">
                    Credenciais do Portal Plantec <span className="text-ink/35">(deixe em branco para usar as configuradas no servidor)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink/55 uppercase tracking-wider mb-1.5">E-mail</label>
                      <input
                        type="email"
                        value={portalEmail}
                        onChange={e => setPortalEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full border border-line/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink/55 uppercase tracking-wider mb-1.5">Senha</label>
                      <input
                        type="password"
                        value={portalPassword}
                        onChange={e => setPortalPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-line/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                {portalError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
                    {portalError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowPortalImport(false); setPortalError('') }}
                    className="flex-1 btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePortalFetch}
                    disabled={portalImporting || !portalQuotationId.trim()}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {portalImporting ? (
                      <><span className="animate-spin">◌</span> Buscando...</>
                    ) : (
                      <><HiArrowDownTray className="w-4 h-4" /> Buscar Orçamento</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="text-sm text-ink/55 font-medium">
                  {portalItems.length} itens encontrados no orçamento <span className="font-bold text-ink/80">#{portalQuotationId}</span>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line/10">
                  <table className="w-full text-xs">
                    <thead className="bg-background border-b border-line/10">
                      <tr>
                        <th className="text-left px-3 py-2 font-black text-ink/45 uppercase tracking-wider">Código</th>
                        <th className="text-left px-3 py-2 font-black text-ink/45 uppercase tracking-wider">Produto</th>
                        <th className="text-center px-3 py-2 font-black text-ink/45 uppercase tracking-wider">Qtd</th>
                        <th className="text-right px-3 py-2 font-black text-ink/45 uppercase tracking-wider">Preço Unit.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/5">
                      {portalItems.map((item, i) => (
                        <tr key={i} className="hover:bg-background">
                          <td className="px-3 py-2 font-mono text-ink/45">{item.code || '—'}</td>
                          <td className="px-3 py-2 text-ink/75 font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-ink/65">
                            {item.unitPrice > 0 ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-ink/45">
                  Os produtos serão buscados no catálogo local por SKU ou nome. Produtos não encontrados serão ignorados.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setPortalStep('input'); setPortalItems([]) }}
                    className="flex-1 btn-secondary"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={handlePortalImport}
                    disabled={portalImporting}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {portalImporting ? (
                      <><span className="animate-spin">◌</span> Importando...</>
                    ) : (
                      <>+ Importar {portalItems.length} Itens</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
