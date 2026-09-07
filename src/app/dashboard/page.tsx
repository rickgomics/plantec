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
  // .info-card do Padrão Visual do Portal. O cartão de destaque troca só o
  // fundo pelo brand-soft — o padrão reserva o teal cheio para ação, não
  // para superfície de leitura.
  return (
    <div className="info-card" style={accent ? { background: 'var(--pt-brand-soft)', borderColor: 'var(--pt-brand)' } : undefined}>
      <div className="info-label" style={accent ? { color: 'var(--pt-brand-ink)' } : undefined}>{title}</div>
      <div className="info-value" style={accent ? { color: 'var(--pt-brand-ink)' } : undefined}>{value}</div>
      {sub && <div className="info-sub">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/dashboard`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AppLayout>
      <div className="shell">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Cubo colorido + wordmark outline: visível em ambos os modos */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/plantec-logo-full.png`}
              alt="Plantec IA" className="h-16 w-auto" />
            <div className="text-xs text-ink/40 font-semibold tracking-widest uppercase mt-1 ml-1">BOM Builder</div>
          </div>
          <Link href="/proposals/new" className="btn-primary">
            + Nova Proposta
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-ink/35 font-semibold">Carregando...</div>
        ) : stats ? (
          <>
            {/* Stats grid */}
            <div className="cards-5">
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
              <div className="px-6 py-4 border-b border-line/10 flex items-center justify-between">
                <h2 className="font-black text-ink tracking-tight">Propostas Recentes</h2>
                <Link href="/proposals" className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider">
                  Ver todas →
                </Link>
              </div>

              {stats.recentProposals.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-semibold text-ink/45">Nenhuma proposta criada ainda.</p>
                  <Link href="/proposals/new" className="text-brand-600 hover:underline text-sm font-semibold mt-1 inline-block">
                    Criar primeira proposta →
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-background border-b border-line/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Número</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Título</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Total</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/5">
                    {stats.recentProposals.map((p: Proposal) => (
                      <tr key={p.id} className="hover:bg-brand-50/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-[11px] text-ink/45 font-semibold">{p.number}</td>
                        <td className="px-6 py-3.5">
                          <Link href={`/proposals/${p.id}`} className="font-semibold text-ink hover:text-brand-600 transition-colors">
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-ink/55 font-medium">{p.customer?.companyName}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={p.status} /></td>
                        <td className="px-6 py-3.5 text-right font-bold text-ink">
                          {fmt(Number(p.totalPrice))}
                        </td>
                        <td className="px-6 py-3.5 text-right text-ink/45 text-xs font-semibold">
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
