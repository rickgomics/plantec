'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { DashboardStats, Proposal } from '@/types'

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string; icon: string; color: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão geral do Plantec BOM Builder</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Carregando...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard
                title="Total de Propostas"
                value={stats.totalProposals}
                sub={`${stats.draftProposals} rascunhos`}
                icon="📋"
                color="bg-blue-50"
              />
              <StatCard
                title="Propostas Aprovadas"
                value={stats.approvedProposals}
                icon="✅"
                color="bg-green-50"
              />
              <StatCard
                title="Receita Gerada"
                value={fmt(stats.totalRevenue)}
                sub="propostas geradas/enviadas/aprovadas"
                icon="💰"
                color="bg-yellow-50"
              />
              <StatCard
                title="Produtos Ativos"
                value={stats.totalProducts}
                icon="📦"
                color="bg-purple-50"
              />
              <StatCard
                title="Clientes Cadastrados"
                value={stats.totalCustomers}
                icon="🏢"
                color="bg-indigo-50"
              />
              <div className="card p-5 flex items-center justify-center">
                <Link href="/proposals/new" className="btn-primary text-center">
                  + Nova Proposta
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Propostas Recentes</h2>
                <Link href="/proposals" className="text-sm text-blue-600 hover:underline">
                  Ver todas →
                </Link>
              </div>
              {stats.recentProposals.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  Nenhuma proposta criada ainda.{' '}
                  <Link href="/proposals/new" className="text-blue-600 hover:underline">
                    Criar primeira proposta
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Número</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Título</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Cliente</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentProposals.map((p: Proposal) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.number}</td>
                        <td className="px-5 py-3">
                          <Link href={`/proposals/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{p.customer?.companyName}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {fmt(Number(p.totalPrice))}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-400 text-xs">
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
