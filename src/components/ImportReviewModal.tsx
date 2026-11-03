'use client'

import { useEffect, useMemo, useState } from 'react'
import { HiXMark } from 'react-icons/hi2'
import { classificarPorRegra } from '@/lib/taxonomy'
import { normalizarMarca } from '@/lib/brands'

/** Item como veio da origem (orçamento do Portal, hub Intelbras). */
export interface ImportRow {
  code: string
  name: string
  quantity: number
  /** Preço do orçamento de origem; 0 ou ausente quando a origem não tem preço. */
  unitPrice?: number
}

/** O que vai para a BOM depois da conferência. */
export interface ImportChoice {
  productId: string
  quantity: number
  /** Só presente quando o usuário escolhe usar o preço da origem. */
  unitPrice?: number
}

interface Found {
  id: string
  sku: string
  name: string
  brand: string | null
  category: string
  active: boolean
}

interface Resolved { match: Found | null; candidates: Found[] }

const SKIP = ''
// Cadastrar o item no catálogo com os dados da origem (03/11/2026): produto
// que está no ERP mas não na loja (ex.: Prysmian) não tinha como entrar.
const NOVO = '__novo__'

/** Marca do nome do ERP ("… - PRYSMIAN"): conhecida pelo brands.ts ou o último trecho. */
function marcaDaOrigem(name: string): string | null {
  const conhecida = normalizarMarca(null, name)
  if (conhecida) return conhecida
  const fim = name.includes(' - ') ? name.slice(name.lastIndexOf(' - ') + 3).trim() : ''
  if (!fim || /\d/.test(fim) || fim.length > 30) return null
  return fim.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase())
}

async function cadastrarDaOrigem(r: ImportRow): Promise<string> {
  const classif = classificarPorRegra(r.name)
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: r.code,
      name: r.name,
      brand: marcaDaOrigem(r.name),
      category: classif?.category ?? 'Outros',
      subcategory: classif?.subcategory ?? null,
      basePrice: r.unitPrice ?? 0,
      cost: 0,
      stock: 0,
      unit: 'un',
      // Classificação da regra fica como "regra" (revisável); sem regra, Outros
      attributes: { origem: 'orcamento', ...(classif ? { classificacao: { ...classif, em: new Date().toISOString() } } : {}) },
      compatible: [], required: [], suggested: [],
      // Se o SKU já existir (nova tentativa), reaproveita sem perder classificação manual
      upsert: true,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${r.code}: ${data.error ?? `HTTP ${res.status}`}`)
  return data.product.id as string
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Conferência antes de importar: cada linha mostra se o código casou com um SKU
 * do catálogo. Sem casamento exato, o usuário escolhe entre os candidatos ou
 * deixa a linha de fora — nada entra na BOM por palpite.
 */
export default function ImportReviewModal({
  title, rows, onClose, onConfirm, permitirCadastro = false,
}: {
  title: string
  rows: ImportRow[]
  /** Oferece cadastrar no catálogo o que não está nele (origem com código do ERP). */
  permitirCadastro?: boolean
  onClose: () => void
  onConfirm: (choices: ImportChoice[]) => Promise<void>
}) {
  const [resolved, setResolved] = useState<Resolved[] | null>(null)
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [qty, setQty] = useState<number[]>(() => rows.map(r => r.quantity || 1))
  const [useSourcePrice, setUseSourcePrice] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasSourcePrice = rows.some(r => (r.unitPrice ?? 0) > 0)

  useEffect(() => {
    let cancel = false
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: rows.map(r => ({ code: r.code, name: r.name })) }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao conferir os códigos')
        if (cancel) return
        const list = data.results as Resolved[]
        setResolved(list)
        // Sem SKU igual: já marca para cadastrar, se veio com código do ERP. O
        // código é o SKU da loja, então parecido com outro SKU é outro produto.
        setChosen(list.map((r, i) => r.match?.id ?? (permitirCadastro && rows[i].code ? NOVO : SKIP)))
      })
      .catch(e => { if (!cancel) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancel = true }
  }, [rows])

  const counts = useMemo(() => {
    if (!resolved) return { exact: 0, picked: 0, novos: 0, skipped: 0 }
    let exact = 0, picked = 0, novos = 0, skipped = 0
    resolved.forEach((r, i) => {
      if (!chosen[i]) skipped++
      else if (chosen[i] === NOVO) novos++
      else if (r.match && chosen[i] === r.match.id) exact++
      else picked++
    })
    return { exact, picked, novos, skipped }
  }, [resolved, chosen])

  const confirm = async () => {
    setSaving(true)
    setError('')
    try {
      const choices: ImportChoice[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (!chosen[i]) continue
        const price = r.unitPrice ?? 0
        const novo = chosen[i] === NOVO
        choices.push({
          productId: novo ? await cadastrarDaOrigem(r) : chosen[i],
          quantity: Math.max(1, qty[i] || 1),
          // Cadastrado agora não tem tabela de preço: vale o preço da origem
          ...((useSourcePrice || novo) && price > 0 ? { unitPrice: price } : {}),
        })
      }
      await onConfirm(choices)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/10">
          <div>
            <h2 className="font-black text-ink">{title}</h2>
            <p className="text-xs text-ink/45 mt-0.5">
              Só entra sozinho o que tem código igual a um SKU do catálogo. O resto você escolhe ou deixa de fora.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-ink/45 hover:bg-ink/5 transition-colors">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">{error}</div>
          )}
          {!resolved && !error && (
            <div className="py-12 text-center text-sm text-ink/45">Conferindo {rows.length} códigos no catálogo…</div>
          )}
          {resolved && (
            <table className="w-full text-xs">
              <thead className="border-b border-line/10">
                <tr>
                  <th className="text-left py-2 pr-3 font-black text-ink/45 uppercase tracking-wider">Origem</th>
                  <th className="text-left py-2 pr-3 font-black text-ink/45 uppercase tracking-wider">Produto no catálogo</th>
                  <th className="text-center py-2 w-20 font-black text-ink/45 uppercase tracking-wider">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/5">
                {rows.map((r, i) => {
                  const res = resolved[i]
                  const options = res.match ? [res.match] : res.candidates
                  const current = options.find(o => o.id === chosen[i])
                  return (
                    <tr key={i} className="align-top">
                      <td className="py-2.5 pr-3 w-[42%]">
                        <div className="font-mono text-ink/45">{r.code || 'sem código'}</div>
                        <div className="text-ink/75 font-medium leading-snug">{r.name}</div>
                        {(r.unitPrice ?? 0) > 0 && <div className="text-ink/45 mt-0.5">{fmtBRL(r.unitPrice!)}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        {res.match ? (
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={chosen[i] === res.match.id}
                              onChange={e => setChosen(c => c.map((v, j) => j === i ? (e.target.checked ? res.match!.id : SKIP) : v))}
                            />
                            <span>
                              <span className="inline-block rounded bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 mr-1.5">SKU igual</span>
                              <span className="text-ink/80 font-medium">{res.match.name}</span>
                              {!res.match.active && <span className="ml-1.5 text-amber-600 font-semibold">(inativo)</span>}
                            </span>
                          </label>
                        ) : options.length ? (
                          <div className="space-y-1">
                            <span className="inline-block rounded bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5">Sem SKU igual: escolha</span>
                            <select
                              className="input text-xs w-full"
                              value={chosen[i]}
                              onChange={e => setChosen(c => c.map((v, j) => j === i ? e.target.value : v))}
                            >
                              <option value={SKIP}>Não importar</option>
                              {permitirCadastro && r.code && <option value={NOVO}>Cadastrar com os dados da origem ({r.code})</option>}
                              {options.map(o => (
                                <option key={o.id} value={o.id}>
                                  {o.sku} · {o.name}{o.active ? '' : ' (inativo)'}
                                </option>
                              ))}
                            </select>
                            {current && <div className="text-ink/45">{current.brand ?? '—'} · {current.category}</div>}
                          </div>
                        ) : permitirCadastro && r.code ? (
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={chosen[i] === NOVO}
                              onChange={e => setChosen(c => c.map((v, j) => j === i ? (e.target.checked ? NOVO : SKIP) : v))}
                            />
                            <span>
                              <span className="inline-block rounded bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 mr-1.5">Não está no catálogo</span>
                              <span className="text-ink/65">cadastrar com o código, o nome e o preço da origem</span>
                            </span>
                          </label>
                        ) : (
                          <span className="inline-block rounded bg-red-50 text-red-700 font-bold px-1.5 py-0.5">Não está no catálogo</span>
                        )}
                        {chosen[i] === NOVO && res.candidates.length > 0 && (
                          <div className="text-ink/45 mt-1">Será cadastrado com o código {r.code}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <input
                          type="number"
                          min={1}
                          className="input text-xs w-16 text-center"
                          value={qty[i]}
                          disabled={!chosen[i]}
                          onChange={e => setQty(q => q.map((v, j) => j === i ? Number(e.target.value) : v))}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line/10 space-y-3">
          {resolved && (
            <div className="text-xs text-ink/55 font-medium">
              {counts.exact} pelo SKU · {counts.picked} escolhidos · {counts.novos} a cadastrar · {counts.skipped} de fora
            </div>
          )}
          {hasSourcePrice && (
            <label className="flex items-center gap-2 text-xs text-ink/65 cursor-pointer">
              <input type="checkbox" checked={useSourcePrice} onChange={e => setUseSourcePrice(e.target.checked)} />
              Usar o preço do orçamento de origem (fica como preço manual; sem isso vale a tabela da proposta)
            </label>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary btn-block">Cancelar</button>
            <button
              onClick={confirm}
              disabled={saving || !resolved || counts.exact + counts.picked + counts.novos === 0}
              className="btn-primary btn-block"
            >
              {saving ? 'Importando…' : `+ Importar ${counts.exact + counts.picked + counts.novos} itens`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
