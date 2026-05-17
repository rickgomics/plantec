'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import BOMTable from '@/components/BOMTable'
import AlertPanel from '@/components/AlertPanel'
import ProductSearchModal from '@/components/ProductSearchModal'
import AIGenerateButton from '@/components/AIGenerateButton'
import MermaidDiagram from '@/components/MermaidDiagram'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Proposal, ProposalItem, Product, RuleEngineResult, CompanyProfile } from '@/types'

const STATUS_FLOW: Record<string, string> = {
  draft: 'generated',
  generated: 'sent',
  sent: 'approved',
}

type Tab = 'bom' | 'cover' | 'intro' | 'scenario'

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
  const [scenarioDiagram, setScenarioDiagram] = useState('')
  const [coverProfileId, setCoverProfileId] = useState<string>('')
  const [introProfileId, setIntroProfileId] = useState<string>('')
  const [introText, setIntroText] = useState('')

  const loadProposal = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}`)
    const data = await res.json()
    if (data.proposal) {
      const p: Proposal = data.proposal
      setProposal(p)
      setGlobalDiscount(Number(p.discount))
      setExecutiveSummary(p.executiveSummary ?? '')
      setScope(p.scope ?? '')
      setScenarioDesc(p.scenarioDesc ?? '')
      setScenarioDiagram(p.scenarioDiagram ?? '')
      setCoverProfileId(p.coverProfileId ?? '')
      setIntroProfileId(p.introProfileId ?? '')
    }
    setLoading(false)
  }, [id])

  const evaluate = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}/evaluate`, { method: 'POST' })
    const data = await res.json()
    setRuleResult(data)
  }, [id])

  useEffect(() => { loadProposal() }, [loadProposal])
  useEffect(() => {
    fetch('/api/company-profiles').then(r => r.json()).then(d => setProfiles(d.profiles ?? []))
  }, [])
  useEffect(() => {
    if (proposal?.items?.length) evaluate()
  }, [proposal?.items, evaluate])

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
    await fetch(`/api/proposals/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity }),
    })
    await loadProposal()
  }

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    await fetch(`/api/proposals/${id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    })
    await loadProposal()
  }

  const handleDiscountChange = async (itemId: string, discount: number) => {
    await fetch(`/api/proposals/${id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, discount }),
    })
    await loadProposal()
  }

  const handleRemoveItem = async (itemId: string) => {
    await fetch(`/api/proposals/${id}/items?itemId=${itemId}`, { method: 'DELETE' })
    await loadProposal()
  }

  const handleSave = async () => {
    if (!proposal || !totals) return
    setSaving(true)
    await fetch(`/api/proposals/${id}`, {
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
        coverProfileId: coverProfileId || null,
        introProfileId: introProfileId || null,
      }),
    })
    setSaving(false)
  }

  const handleAdvanceStatus = async () => {
    if (!proposal) return
    const next = STATUS_FLOW[proposal.status]
    if (!next) return
    setSaving(true)
    await fetch(`/api/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await loadProposal()
    setSaving(false)
  }

  const handleAddSuggestion = async (skus: string[]) => {
    for (const sku of skus) {
      const res = await fetch(`/api/products?search=${sku}`)
      const data = await res.json()
      const product = (data.products ?? []).find((p: Product) => p.sku === sku)
      if (product) await handleAddProduct(product, 1)
    }
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
    return <AppLayout><div className="p-10 text-center text-gray-400">Carregando proposta...</div></AppLayout>
  }
  if (!proposal) {
    return <AppLayout><div className="p-10 text-center text-gray-400">Proposta não encontrada.</div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-gray-400">{proposal.number}</span>
              <StatusBadge status={proposal.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{proposal.title}</h1>
            <p className="text-gray-500 text-sm">
              {proposal.customer.companyName} · {proposal.vertical} ·{' '}
              Válida por {proposal.validityDays} dias
            </p>
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
              📄 PDF
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-6 border-b border-gray-200">
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
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
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
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h2 className="font-semibold text-gray-900">BOM Comercial</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <label className="text-gray-500">Desconto global:</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border border-gray-200 rounded px-1.5 py-1 text-sm"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                    <button onClick={() => setShowAddProduct(true)} className="btn-primary text-sm">
                      + Adicionar Produto
                    </button>
                  </div>
                </div>
                <BOMTable
                  items={proposal.items}
                  onQuantityChange={handleQuantityChange}
                  onDiscountChange={handleDiscountChange}
                  onRemove={handleRemoveItem}
                />
              </div>

              {totals && proposal.items.length > 0 && (
                <div className="card p-5">
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span><span>{fmt(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Descontos:</span><span className="text-red-600">-{fmt(totals.totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                        <span>Total:</span><span>{fmt(totals.totalPrice)}</span>
                      </div>
                      <div className={`flex justify-between font-medium ${totals.margin >= 15 ? 'text-green-600' : totals.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        <span>Margem estimada:</span><span>{totals.margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Texts editable in BOM tab */}
              <div className="card p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Resumo Executivo</label>
                    <AIGenerateButton
                      type="executiveSummary"
                      context={aiContext}
                      onGenerated={setExecutiveSummary}
                    />
                  </div>
                  <textarea
                    value={executiveSummary}
                    onChange={e => setExecutiveSummary(e.target.value)}
                    rows={5}
                    placeholder="Descreva o valor entregue..."
                    className="input"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Escopo do Projeto</label>
                    <AIGenerateButton
                      type="scope"
                      context={aiContext}
                      onGenerated={setScope}
                    />
                  </div>
                  <textarea
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    rows={5}
                    placeholder="O que está incluso nesta proposta..."
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AlertPanel result={ruleResult} onAddSuggestion={handleAddSuggestion} />
              <div className="card p-4 text-sm space-y-2">
                <h3 className="font-semibold text-gray-700 mb-2">Informações</h3>
                <div className="flex justify-between">
                  <span className="text-gray-500">Itens na BOM:</span>
                  <span className="font-medium">{proposal.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Criada em:</span>
                  <span>{new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Validade:</span>
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
              <h2 className="font-semibold text-gray-900">Perfil da Capa</h2>
              <p className="text-sm text-gray-500">Selecione o perfil que aparecerá na capa da proposta.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa na Capa</label>
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
                <div className="border rounded-xl p-4 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-4">
                    {coverProfile.logoBase64 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverProfile.logoBase64} alt={coverProfile.name} className="h-16 object-contain" />
                    )}
                    <div>
                      <div className="font-semibold">{coverProfile.name}</div>
                      {coverProfile.website && <div className="text-xs text-blue-600">{coverProfile.website}</div>}
                      {coverProfile.phone && <div className="text-xs text-gray-500">{coverProfile.phone}</div>}
                    </div>
                  </div>
                  {coverProfile.description && (
                    <p className="text-xs text-gray-600">{coverProfile.description}</p>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Link href="/settings/profiles" className="text-sm text-blue-600 hover:underline">
                  + Criar ou editar perfis de empresa →
                </Link>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Pré-visualização da Capa</h3>
              <div className="rounded-2xl overflow-hidden min-h-[300px] flex flex-col"
                style={{ background: 'linear-gradient(135deg, #002827 0%, #005F5C 60%, #00928E 100%)' }}>
                {/* Top bar */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-white/10">
                  {coverProfile?.logoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverProfile.logoBase64} alt={coverProfile.name} className="h-10 object-contain brightness-0 invert" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
                        <span className="text-white font-black text-sm">P</span>
                      </div>
                      <span className="text-white font-black text-sm tracking-tight">PLANTEC</span>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Proposta Comercial</div>
                    <div className="font-mono text-white/70 text-xs font-semibold mt-0.5">{proposal.number}</div>
                  </div>
                </div>
                {/* Body */}
                <div className="flex-1 flex flex-col justify-center px-8 py-8">
                  <div className="text-[10px] text-brand-300 uppercase tracking-widest font-black mb-2">{proposal.vertical}</div>
                  <div className="text-white font-black text-2xl leading-tight tracking-tight mb-3">{proposal.title}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-px bg-white/30" />
                    <div className="text-white/70 text-sm font-semibold">{proposal.customer.companyName}</div>
                  </div>
                </div>
                {/* Footer */}
                <div className="px-8 py-4 bg-black/20 border-t border-white/10">
                  <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
                    Válida por {proposal.validityDays} dias
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Introdução */}
        {activeTab === 'intro' && (
          <div className="max-w-2xl space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Empresa Apresentada</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Perfil de Introdução</label>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Texto de Apresentação</label>
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
                  rows={8}
                  placeholder="Descreva a empresa apresentada nesta proposta..."
                  className="input"
                />
              </div>

              <div className="pt-2">
                <Link href="/settings/profiles" className="text-sm text-blue-600 hover:underline">
                  + Criar ou editar perfis de empresa →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Cenário */}
        {activeTab === 'scenario' && (
          <div className="space-y-5">

            {/* Description row */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-black text-gray-900 tracking-tight">Cenário Técnico</h2>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Descreva o ambiente físico, sistemas existentes e necessidades — a IA gera o diagrama de topologia com os equipamentos da BOM.
                  </p>
                </div>
                <AIGenerateButton
                  type="scenarioDiagram"
                  context={scenarioAiContext}
                  onGenerated={setScenarioDiagram}
                  label="Gerar Diagrama"
                />
              </div>
              <textarea
                value={scenarioDesc}
                onChange={e => setScenarioDesc(e.target.value)}
                rows={5}
                placeholder={`Descreva o cenário técnico. Exemplo:\n\nEdifício comercial de 5 andares com recepção, escritórios e estacionamento. Rede IP existente com switch 24p no 2º andar. Necessidade de 16 câmeras IP conectadas a NVR central com 30 dias de retenção. Integração com DDNS para acesso remoto via app mobile.`}
                className="input"
              />
              {/* BOM context badge */}
              {proposal.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {proposal.items.map(i => (
                    <span key={i.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold ring-1 ring-inset ring-brand-200">
                      <span className="font-mono text-brand-400">{i.quantity}×</span> {i.product.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Diagram row: code + preview */}
            <div className="grid grid-cols-5 gap-5">

              {/* Mermaid code editor */}
              <div className="col-span-2 card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="label">Código Mermaid</span>
                  <span className="text-[10px] text-gray-400 font-semibold font-mono bg-gray-100 px-2 py-0.5 rounded-md">
                    editável
                  </span>
                </div>
                <textarea
                  value={scenarioDiagram}
                  onChange={e => setScenarioDiagram(e.target.value)}
                  rows={22}
                  spellCheck={false}
                  placeholder={'graph TD\n\n  subgraph Internet\n    CLOUD["☁ Nuvem"]\n  end\n\n  CAM["Câmera IP"] -->|"PoE"| SW\n  SW["Switch"] --> NVR\n  NVR --> CLOUD'}
                  className="input font-mono text-xs leading-relaxed flex-1 resize-none"
                  style={{ fontFamily: "'Courier New', monospace" }}
                />
                <div className="text-[10px] text-gray-400 font-medium space-y-0.5">
                  <div><span className="inline-block w-3 h-3 rounded-sm bg-brand-50 border border-brand-300 mr-1" />Equipamentos propostos</div>
                  <div><span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border border-amber-300 mr-1" />Sistemas existentes</div>
                  <div><span className="inline-block w-3 h-3 rounded-sm border border-gray-300 mr-1" style={{ background: 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 2px,#fff 2px,#fff 5px)' }} />Módulos externos/faltantes</div>
                </div>
              </div>

              {/* Live preview */}
              <div className="col-span-3 card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="label">Topologia de Rede</span>
                  {scenarioDiagram && (
                    <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-brand-200">
                      ● ao vivo
                    </span>
                  )}
                </div>

                {scenarioDiagram ? (
                  <MermaidDiagram code={scenarioDiagram} className="min-h-[440px] flex-1" />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[440px] border-2 border-dashed border-gray-100 rounded-xl text-center">
                    <div className="text-5xl mb-3 opacity-20 select-none">◈</div>
                    <p className="text-sm font-semibold text-gray-400">Diagrama de topologia aparece aqui</p>
                    <p className="text-xs text-gray-300 mt-1 font-medium">Descreva o cenário acima e clique em &quot;Gerar Diagrama&quot;</p>
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
    </AppLayout>
  )
}
