'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useRouter } from 'next/navigation'
import { Customer } from '@/types'

const VERTICALS = ['CFTV', 'Redes', 'Energia', 'Controle de Acesso', 'Infraestrutura', 'Serviços', 'Geral']

export default function NewProposalPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({
    title: '',
    customerId: '',
    vertical: 'CFTV',
    executiveSummary: '',
    scope: '',
    commercialTerms: 'Pagamento: 30 dias após aprovação.\nEntrega: prazo conforme disponibilidade de estoque.\nGarantia: conforme fabricante.',
    validityDays: 30,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.customerId) {
      setError('Título e cliente são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/proposals/${data.proposal.id}`)
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nova Proposta</h1>
          <p className="text-gray-500 text-sm mt-0.5">Preencha os dados para iniciar a proposta</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Título da Proposta *</label>
            <input
              className="input"
              placeholder="Ex.: Sistema CFTV - Supermercado Bom Preço"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select
                className="input"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
              >
                <option value="">Selecione o cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Vertical</label>
              <select
                className="input"
                value={form.vertical}
                onChange={(e) => setForm({ ...form, vertical: e.target.value })}
              >
                {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Resumo Executivo</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Descreva brevemente o objetivo e contexto da proposta..."
              value={form.executiveSummary}
              onChange={(e) => setForm({ ...form, executiveSummary: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Escopo do Projeto</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Descreva o que está incluído no escopo..."
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Condições Comerciais</label>
            <textarea
              className="input"
              rows={3}
              value={form.commercialTerms}
              onChange={(e) => setForm({ ...form, commercialTerms: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Validade da Proposta (dias)</label>
            <input
              type="number"
              min={1}
              max={365}
              className="input w-32"
              value={form.validityDays}
              onChange={(e) => setForm({ ...form, validityDays: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Criando...' : 'Criar Proposta →'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
