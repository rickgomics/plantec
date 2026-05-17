'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import BOMTable from '@/components/BOMTable'
import AlertPanel from '@/components/AlertPanel'
import ProductSearchModal from '@/components/ProductSearchModal'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Proposal, ProposalItem, Product, RuleEngineResult } from '@/types'

const STATUS_FLOW: Record<string, string> = {
  draft: 'generated',
  generated: 'sent',
  sent: 'approved',
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

  const loadProposal = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}`)
    const data = await res.json()
    if (data.proposal) {
      setProposal(data.proposal)
      setGlobalDiscount(Number(data.proposal.discount))
    }
    setLoading(false)
  }, [id])

  const evaluate = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}/evaluate`, { method: 'POST' })
    const data = await res.json()
    setRuleResult(data)
  }, [id])

  useEffect(() => {
    loadProposal()
  }, [loadProposal])

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
            <Link
              href={`/proposals/${id}/pdf`}
              target="_blank"
              className="btn-secondary"
            >
              📄 PDF
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main BOM area */}
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
                      className="w-16 text-center border border-gray-200 rounded px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="btn-primary text-sm"
                  >
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

            {/* Totals */}
            {totals && proposal.items.length > 0 && (
              <div className="card p-5">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{fmt(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Descontos:</span>
                      <span className="text-red-600">-{fmt(totals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                      <span>Total:</span>
                      <span>{fmt(totals.totalPrice)}</span>
                    </div>
                    <div className={`flex justify-between font-medium ${totals.margin >= 15 ? 'text-green-600' : totals.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      <span>Margem estimada:</span>
                      <span>{totals.margin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposal.executiveSummary && (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-700 text-sm mb-2">Resumo Executivo</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{proposal.executiveSummary}</p>
                </div>
              )}
              {proposal.scope && (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-700 text-sm mb-2">Escopo</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{proposal.scope}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: alerts */}
          <div className="space-y-4">
            <AlertPanel result={ruleResult} onAddSuggestion={handleAddSuggestion} />

            {/* Quick info */}
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
