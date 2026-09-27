'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { DashboardStats, Proposal } from '@/types'
import { FiPlus, FiArrowRight } from 'react-icons/fi'
import { fmtBRL, fmtCompacto, fmtData } from '@/lib/format'

function StatCard({ title, value, sub, accent = false, titleAttr }: {
  title: string
  value: string | number
  sub?: string
  accent?: boolean
  /** valor completo no hover, quando o cartão mostra o compacto */
  titleAttr?: string
}) {
  // .info-card do Padrão Visual do Portal. O cartão de destaque troca só o
  // fundo pelo brand-soft — o padrão reserva o teal cheio para ação, não
  // para superfície de leitura.
  return (
    <div className="info-card" style={accent ? { background: 'var(--pt-brand-soft)', borderColor: 'var(--pt-brand)' } : undefined}>
      <div className="info-label" style={accent ? { color: 'var(--pt-brand-ink)' } : undefined}>{title}</div>
      <div className="info-value" title={titleAttr} style={accent ? { color: 'var(--pt-brand-ink)' } : undefined}>{value}</div>
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

  return (
    <AppLayout>
      <div className="shell">
        <div className="page-header flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Portal Plantec · BOM Builder</div>
            <h1 className="page-title">Painel</h1>
            <p className="page-subtitle">Propostas em andamento e o que foi gerado, enviado e aprovado.</p>
          </div>
          <Link href="/proposals/new" className="btn-primary">
            <FiPlus className="w-4 h-4" />Nova proposta
          </Link>
        </div>

        {loading ? (
          <div className="empty-msg">Carregando…</div>
        ) : stats ? (
          <>
            <div className="cards-5">
              <StatCard title="Propostas" value={stats.totalProposals} sub={`${stats.draftProposals} em rascunho`} />
              <StatCard title="Aprovadas" value={stats.approvedProposals} />
              <StatCard
                title="Receita"
                value={fmtCompacto(stats.totalRevenue)}
                titleAttr={fmtBRL(stats.totalRevenue)}
                sub="geradas, enviadas e aprovadas"
                accent
              />
              <StatCard title="Produtos" value={stats.totalProducts.toLocaleString('pt-BR')} sub="no catálogo" />
              <StatCard title="Clientes" value={stats.totalCustomers} />
            </div>

            <div className="table-card">
              <div className="px-5 py-4 border-b border-line/10 flex items-center justify-between">
                <h2 className="font-display font-extrabold uppercase text-[19px] leading-tight text-ink">Propostas recentes</h2>
                <Link href="/proposals" className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-1">
                  Ver todas <FiArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {stats.recentProposals.length === 0 ? (
                <div className="empty-msg">
                  Nenhuma proposta ainda.{' '}
                  <Link href="/proposals/new" className="text-brand-700 font-semibold hover:underline">Criar a primeira</Link>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Número</th><th>Título</th><th>Cliente</th><th>Status</th>
                        <th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentProposals.map((p: Proposal) => (
                        <tr key={p.id}>
                          <td className="num-mono text-ink/55">{p.number}</td>
                          <td className="!whitespace-normal max-w-[360px]">
                            <Link href={`/proposals/${p.id}`} className="font-semibold text-ink hover:text-brand-700">{p.title}</Link>
                          </td>
                          <td className="text-ink/65 !whitespace-normal max-w-[240px]">{p.customer?.companyName}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td className="num-mono text-right font-semibold" title={fmtBRL(Number(p.totalPrice))}>{fmtBRL(Number(p.totalPrice))}</td>
                          <td className="num-mono text-right text-ink/55">{fmtData(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
