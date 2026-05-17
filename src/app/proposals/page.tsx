'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { Proposal } from '@/types'

const STATUSES = ['draft', 'generated', 'sent', 'approved', 'rejected']

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Propostas</h1>
            <p className="text-gray-500 text-sm mt-0.5">{proposals.length} proposta(s)</p>
          </div>
          <Link href="/proposals/new" className="btn-primary">+ Nova Proposta</Link>
        </div>

        <div className="card mb-4 p-4 flex gap-3">
          <input
            className="input flex-1"
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Carregando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vertical</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Margem</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proposals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.number}</td>
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.customer?.companyName}</td>
                    <td className="px-4 py-3 text-gray-500">{p.vertical}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(Number(p.totalPrice))}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(p.margin) >= 15 ? 'text-green-600' : Number(p.margin) >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Number(p.margin) > 0 ? `${Number(p.margin).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/proposals/${p.id}`} className="text-blue-600 hover:underline text-xs mr-3">Abrir</Link>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
                    </td>
                  </tr>
                ))}
                {proposals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Nenhuma proposta encontrada.{' '}
                      <Link href="/proposals/new" className="text-blue-600 hover:underline">Criar primeira proposta</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
