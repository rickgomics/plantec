'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { ExternalProject } from '@/app/api/external-projects/route'
import {
  HiArrowDownTray,
  HiCheckCircle,
  HiXCircle,
  HiArrowTopRightOnSquare,
  HiExclamationTriangle,
} from 'react-icons/hi2'

interface ImportResult {
  projectId: string
  success: boolean
  proposalNumber?: string
  proposalId?: string
  error?: string
}

const VERTICAL_COLOR: Record<string, string> = {
  CFTV:          'bg-brand-50 text-brand-700 ring-brand-200',
  Redes:         'bg-brand-50 text-brand-700 ring-brand-200',
  Telecom:       'bg-brand-50 text-brand-700 ring-brand-200',
  Infraestrutura:'bg-amber-50 text-amber-700 ring-amber-200',
  Alarme:        'bg-red-50 text-red-700 ring-red-200',
}
function verticalBadge(v: string) {
  const cls = VERTICAL_COLOR[v] ?? 'bg-ink/5 text-ink/65 ring-line/15'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${cls}`}>
      {v}
    </span>
  )
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

export default function ImportPage() {
  const [projects, setProjects]     = useState<ExternalProject[]>([])
  const [loading, setLoading]       = useState(true)
  const [apiError, setApiError]     = useState<string | null>(null)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [importing, setImporting]   = useState(false)
  const [results, setResults]       = useState<ImportResult[] | null>(null)
  const [search, setSearch]         = useState('')

  const load = async () => {
    setLoading(true)
    setApiError(null)
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/external-projects`)
      const data = await res.json()
      if (data.error) { setApiError(data.error); setProjects([]) }
      else setProjects(data.projects ?? [])
    } catch {
      setApiError('Falha ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visible = projects.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.customer.companyName.toLowerCase().includes(q) ||
      p.vertical.toLowerCase().includes(q) ||
      (p.customer.cnpj ?? '').includes(q)
    )
  })

  const allVisibleSelected = visible.length > 0 && visible.every(p => selected.has(p.id))

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(s => { const n = new Set(s); visible.forEach(p => n.delete(p.id)); return n })
    } else {
      setSelected(s => { const n = new Set(s); visible.forEach(p => n.add(p.id)); return n })
    }
  }

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleImport = async () => {
    const toImport = projects.filter(p => selected.has(p.id))
    if (!toImport.length) return
    setImporting(true)
    setResults(null)
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/external-projects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: toImport }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results)
      const ok  = (data.results as ImportResult[]).filter(r => r.success).length
      const err = (data.results as ImportResult[]).length - ok
      if (ok > 0) toast.success(`${ok} proposta${ok > 1 ? 's' : ''} criada${ok > 1 ? 's' : ''} com sucesso`)
      if (err > 0) toast.error(`${err} projeto${err > 1 ? 's' : ''} com erro`)
      setSelected(new Set())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na importação')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Importar Projetos</h1>
            <p className="text-sm text-ink/55 mt-1">
              Projetos pendentes no sistema de registro. Selecione e importe para criar propostas no BOM Builder.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>↺</span>
            Atualizar
          </button>
        </div>

        {/* API not configured warning */}
        {apiError && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <HiExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Sistema externo indisponível</div>
              <div className="text-sm text-amber-700 mt-0.5">{apiError}</div>
              {apiError.includes('EXTERNAL_PROJECTS_URL') && (
                <div className="mt-2 text-xs text-amber-600 font-mono bg-amber-100 rounded px-2 py-1">
                  Configure EXTERNAL_PROJECTS_URL e EXTERNAL_PROJECTS_TOKEN no arquivo .env
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import results */}
        {results && (
          <div className="mb-6 p-4 rounded-xl bg-surface border border-line/15 shadow-sm">
            <div className="text-sm font-bold text-ink/80 mb-3">Resultado da importação</div>
            <div className="space-y-2">
              {results.map(r => {
                const proj = projects.find(p => p.id === r.projectId)
                return (
                  <div key={r.projectId} className={`flex items-center gap-3 p-3 rounded-lg ${r.success ? 'bg-brand-50' : 'bg-red-50'}`}>
                    {r.success
                      ? <HiCheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      : <HiXCircle    className="w-5 h-5 text-red-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink/80 truncate">{proj?.title ?? r.projectId}</div>
                      {r.success
                        ? <div className="text-xs text-brand-700">Proposta criada: <span className="font-mono font-bold">{r.proposalNumber}</span></div>
                        : <div className="text-xs text-red-700">{r.error}</div>}
                    </div>
                    {r.success && r.proposalId && (
                      <Link href={`/proposals/${r.proposalId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-semibold whitespace-nowrap">
                        Abrir <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        {!apiError && (
          <div className="flex items-center gap-3 mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, cliente, vertical ou CNPJ…"
              className="input text-sm flex-1 max-w-sm"
            />
            <div className="flex-1" />
            {selected.size > 0 && (
              <span className="text-sm text-ink/55 font-medium">
                {selected.size} selecionado{selected.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {importing
                ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <HiArrowDownTray className="w-4 h-4" />}
              {importing ? 'Importando…' : `Importar ${selected.size > 0 ? selected.size : ''} projeto${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-ink/45">
            <span className="animate-spin inline-block w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full mb-3" />
            <p className="text-sm font-medium">Buscando projetos…</p>
          </div>
        ) : !apiError && visible.length === 0 ? (
          <div className="text-center py-16 text-ink/45">
            <p className="font-medium">{search ? 'Nenhum projeto encontrado' : 'Nenhum projeto disponível no sistema externo'}</p>
          </div>
        ) : !apiError ? (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background border-b border-line/15">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-brand-500 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink/55 uppercase tracking-wider">Projeto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink/55 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink/55 uppercase tracking-wider">Vertical</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink/55 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink/55 uppercase tracking-wider">Escopo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {visible.map(p => {
                  const isSelected = selected.has(p.id)
                  const result     = results?.find(r => r.projectId === p.id)
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors cursor-pointer ${
                        result?.success
                          ? 'bg-brand-50/60'
                          : isSelected
                          ? 'bg-brand-50'
                          : 'hover:bg-background'
                      }`}
                      onClick={() => !result?.success && toggle(p.id)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {result?.success ? (
                          <HiCheckCircle className="w-5 h-5 text-brand-500" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(p.id)}
                            className="w-4 h-4 accent-brand-500 rounded"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink leading-snug">{p.title}</div>
                        <div className="text-[10px] text-ink/45 font-mono mt-0.5">{p.id}</div>
                        {result?.success && (
                          <Link
                            href={`/proposals/${result.proposalId}`}
                            className="inline-flex items-center gap-1 text-[10px] text-brand-600 hover:underline font-bold mt-0.5"
                            onClick={e => e.stopPropagation()}
                          >
                            {result.proposalNumber} <HiArrowTopRightOnSquare className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink/80">{p.customer.companyName}</div>
                        {p.customer.cnpj && (
                          <div className="text-[10px] text-ink/45 font-mono mt-0.5">{p.customer.cnpj}</div>
                        )}
                        {p.customer.contactName && (
                          <div className="text-[10px] text-ink/55 mt-0.5">{p.customer.contactName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{verticalBadge(p.vertical)}</td>
                      <td className="px-4 py-3 text-xs text-ink/55 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-ink/55 line-clamp-2 leading-relaxed">{p.scope}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
