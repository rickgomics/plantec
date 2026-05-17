'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { DashboardStats, Proposal } from '@/types'

function StatCard({ title, value, sub, accent = false }: {
  title: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`card p-5 ${accent ? 'bg-brand-500 border-brand-400 text-white' : ''}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${accent ? 'text-brand-100' : 'text-gray-400'}`}>
        {title}
      </p>
      <p className={`text-2xl font-black tracking-tight ${accent ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1 font-medium ${accent ? 'text-brand-200' : 'text-gray-400'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">Visão geral do Plantec BOM Builder</p>
          </div>
          <Link href="/proposals/new" className="btn-primary">
            + Nova Proposta
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-300 font-semibold">Carregando...</div>
        ) : stats ? (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard
                title="Propostas"
                value={stats.totalProposals}
                sub={`${stats.draftProposals} rascunhos`}
              />
              <StatCard
                title="Aprovadas"
                value={stats.approvedProposals}
              />
              <StatCard
                title="Receita"
                value={fmt(stats.totalRevenue)}
                sub="geradas + enviadas + aprovadas"
                accent
              />
              <StatCard
                title="Produtos"
                value={stats.totalProducts}
              />
              <StatCard
                title="Clientes"
                value={stats.totalCustomers}
              />
            </div>

            {/* Recent proposals */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-black text-gray-900 tracking-tight">Propostas Recentes</h2>
                <Link href="/proposals" className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider">
                  Ver todas →
                </Link>
              </div>

              {stats.recentProposals.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-semibold text-gray-400">Nenhuma proposta criada ainda.</p>
                  <Link href="/proposals/new" className="text-brand-600 hover:underline text-sm font-semibold mt-1 inline-block">
                    Criar primeira proposta →
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.recentProposals.map((p: Proposal) => (
                      <tr key={p.id} className="hover:bg-brand-50/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-[11px] text-gray-400 font-semibold">{p.number}</td>
                        <td className="px-6 py-3.5">
                          <Link href={`/proposals/${p.id}`} className="font-semibold text-gray-900 hover:text-brand-600 transition-colors">
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 font-medium">{p.customer?.companyName}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={p.status} /></td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          {fmt(Number(p.totalPrice))}
                        </td>
                        <td className="px-6 py-3.5 text-right text-gray-400 text-xs font-semibold">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
