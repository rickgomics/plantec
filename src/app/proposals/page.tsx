'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { HiTrash, HiArrowTopRightOnSquare } from 'react-icons/hi2'
import { Proposal } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  draft:     'Rascunho',
  generated: 'Gerada',
  sent:      'Enviada',
  approved:  'Aprovada',
  rejected:  'Recusada',
}

const STATUSES = ['draft', 'generated', 'sent', 'approved', 'rejected']

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[40, 180, 120, 80, 80, 90, 60, 70, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-gray-100 rounded-full" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (status) p.set('status', status)
    const res = await fetch(`/api/proposals?${p}`)
    const data = await res.json()
    setProposals(data.proposals ?? [])
    setLoading(false)
  }, [search, status])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir proposta?')) return
    await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Propostas</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              {loading ? 'Carregando...' : `${proposals.length} proposta${proposals.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/proposals/new" className="btn-primary">+ Nova Proposta</Link>
        </div>

        {/* Filtros */}
        <div className="card mb-4 p-4 flex gap-3">
          <input
            className="input flex-1"
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-48"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vertical</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <p className="text-sm font-semibold text-gray-400">Nenhuma proposta encontrada.</p>
                    <Link href="/proposals/new" className="text-brand-600 hover:text-brand-700 text-sm font-semibold mt-1 inline-block">
                      Criar primeira proposta →
                    </Link>
                  </td>
                </tr>
              ) : proposals.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-400 font-semibold">{p.number}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/proposals/${p.id}`}
                      className="font-semibold text-gray-900 hover:text-brand-600 transition-colors"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{p.customer?.companyName}</td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{p.vertical}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                    {fmt(Number(p.totalPrice))}
                  </td>
                  <td className={`px-4 py-3.5 text-right font-semibold ${
                    Number(p.margin) >= 15 ? 'text-emerald-600' :
                    Number(p.margin) >= 10 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {Number(p.margin) > 0 ? `${Number(p.margin).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-400 text-xs font-semibold">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/proposals/${p.id}`}
                        className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Abrir"
                      >
                        <HiArrowTopRightOnSquare className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
