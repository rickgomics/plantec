'use client'

import { useState, useEffect, useRef } from 'react'
import { HiXMark, HiPlus, HiCheck, HiSparkles, HiArrowPath } from 'react-icons/hi2'

// ── Types ──────────────────────────────────────────────────────────────────────

type AIItem = {
  productId: string
  sku:       string
  nome:      string
  quantidade: number
  motivo:    string
}

type AIGroup = {
  titulo: string
  itens:  AIItem[]
}

type AIResult = {
  resumo: string
  grupos: AIGroup[]
}

export type AIProjectImportItem = {
  productId: string
  quantity:  number
}

interface AIProjectModalProps {
  onClose:  () => void
  onImport: (items: AIProjectImportItem[]) => Promise<void>
}

// ── Loading steps ──────────────────────────────────────────────────────────────

const STEPS = [
  'Analisando a descrição do projeto…',
  'Buscando produtos no catálogo…',
  'Selecionando os mais adequados…',
  'Compilando a BOM final…',
]

const EXAMPLES = [
  'Sistema de CFTV em armazém de 3.000 m². 20 câmeras externas 8 MP e 4 câmeras internas 4 MP, NVR 32 canais com HD para 30 dias de gravação, switch PoE para todas as câmeras, rack 12U e nobreak 1,2 kVA.',
  'Implantação de rede Wi-Fi corporativa para 2 andares com 200 usuários simultâneos. Access points Wi-Fi 6, switch gerenciável, cabeamento Cat6 e servidor de gerenciamento.',
  'Central de alarme monitorada para escola com 3 partições, 20 zonas com fio, teclado LCD, sirene e módulo GPRS. Instalação e comissionamento incluídos.',
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function AIProjectModal({ onClose, onImport }: AIProjectModalProps) {
  const [phase, setPhase]           = useState<'input' | 'loading' | 'result'>('input')
  const [description, setDescription] = useState('')
  const [stepIdx, setStepIdx]       = useState(0)
  const [result, setResult]         = useState<AIResult | null>(null)
  const [error, setError]           = useState('')
  const [importing, setImporting]   = useState(false)

  // Per-item state: selected + qty
  const [selected, setSelected]     = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const textRef     = useRef<HTMLTextAreaElement>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Advance loading step every 5 s for visual feedback
  useEffect(() => {
    if (phase !== 'loading') return
    setStepIdx(0)
    stepTimerRef.current = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1))
    }, 5_000)
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current) }
  }, [phase])

  // When result arrives, pre-select all items and set quantities
  useEffect(() => {
    if (!result) return
    const sel: Record<string, boolean> = {}
    const qty: Record<string, number>  = {}
    result.grupos.forEach(g =>
      g.itens.forEach(it => {
        sel[it.productId] = true
        qty[it.productId] = it.quantidade
      })
    )
    setSelected(sel)
    setQuantities(qty)
  }, [result])

  // ── Analyze ────────────────────────────────────────────────────────────────

  const analyze = async () => {
    if (!description.trim()) return
    setPhase('loading')
    setError('')
    setResult(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/project-analysis`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na análise')
      setResult(data as AIResult)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('input')
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!result) return
    setImporting(true)
    const items: AIProjectImportItem[] = result.grupos
      .flatMap(g => g.itens)
      .filter(it => selected[it.productId])
      .map(it => ({ productId: it.productId, quantity: quantities[it.productId] ?? it.quantidade }))
    try {
      await onImport(items)
      onClose()
    } finally {
      setImporting(false)
    }
  }

  const toggleItem = (id: string) =>
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))

  const setQty = (id: string, val: number) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }))

  const selectedCount = Object.values(selected).filter(Boolean).length
  const totalItems    = result?.grupos.flatMap(g => g.itens).length ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-line/15 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <HiSparkles className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <div>
            <div className="font-bold text-ink text-sm">Montar BOM com IA</div>
            <div className="text-[11px] text-ink/50">Descreva o projeto — a IA busca os produtos certos</div>
          </div>
        </div>
        {phase === 'result' && selectedCount > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary btn-sm"
          >
            {importing
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <HiPlus className="w-4 h-4" />}
            Adicionar {selectedCount} à BOM
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-ink/5 text-ink/50 hover:text-ink/70 flex-shrink-0"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── INPUT PHASE ──────────────────────────────────────────────── */}
        {phase === 'input' && (
          <div className="max-w-2xl mx-auto p-6 space-y-5">
            <div>
              <label className="label mb-1.5">Descrição do projeto</label>
              <textarea
                ref={textRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={8}
                placeholder={`Descreva o projeto livremente. Exemplos:\n\n${EXAMPLES[0]}`}
                className="input w-full text-sm resize-none leading-relaxed"
              />
              <p className="text-[11px] text-ink/50 mt-1">
                Mencione quantidades, ambientes, requisitos técnicos e fabricantes preferidos.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={!description.trim()}
              className="btn-primary"
            >
              <HiSparkles className="w-4 h-4" />
              Analisar Projeto
            </button>

            {/* Examples */}
            <div className="border-t border-line/10 pt-4">
              <p className="text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-3">Exemplos</p>
              <div className="space-y-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(ex)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-line/15 bg-surface hover:border-brand-300 hover:bg-brand-50 transition-colors text-xs text-ink/70 leading-relaxed"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LOADING PHASE ────────────────────────────────────────────── */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full min-h-64 gap-8 p-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
              <HiSparkles className="absolute inset-0 m-auto w-6 h-6 text-brand-500" />
            </div>
            <div className="text-center space-y-3 max-w-xs">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 text-sm transition-all ${
                    i < stepIdx  ? 'text-brand-600'
                    : i === stepIdx ? 'text-ink font-semibold'
                    : 'text-ink/30'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    i < stepIdx  ? 'bg-brand-500 text-white'
                    : i === stepIdx ? 'border-2 border-brand-500 text-brand-600'
                    : 'border-2 border-line/15 text-ink/30'
                  }`}>
                    {i < stepIdx ? <HiCheck className="w-3 h-3" /> : i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink/50">Isso pode levar até 30 segundos…</p>
          </div>
        )}

        {/* ── RESULT PHASE ─────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div className="max-w-3xl mx-auto p-6 space-y-6">

            {/* Summary */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-50 border border-brand-200">
              <HiSparkles className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-800 leading-relaxed">{result.resumo}</p>
            </div>

            {/* Toggle all / redo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allOn = Object.values(selected).every(Boolean)
                    const next: Record<string, boolean> = {}
                    result.grupos.flatMap(g => g.itens).forEach(it => { next[it.productId] = !allOn })
                    setSelected(next)
                  }}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  {Object.values(selected).every(Boolean) ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                <span className="text-xs text-ink/50">{selectedCount} de {totalItems} selecionados</span>
              </div>
              <button
                onClick={() => { setPhase('input'); setResult(null) }}
                className="flex items-center gap-1 text-xs text-ink/60 hover:text-ink/80"
              >
                <HiArrowPath className="w-3.5 h-3.5" />
                Nova análise
              </button>
            </div>

            {/* Groups */}
            {result.grupos.map((group, gi) => (
              <div key={gi} className="space-y-2">
                <h3 className="text-xs font-bold text-ink/50 uppercase tracking-wider">
                  {group.titulo}
                </h3>
                {group.itens.map((item) => {
                  const on  = !!selected[item.productId]
                  const qty = quantities[item.productId] ?? item.quantidade
                  return (
                    <div
                      key={item.productId}
                      onClick={() => toggleItem(item.productId)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        on
                          ? 'border-brand-300 bg-surface ring-1 ring-brand-200'
                          : 'border-line/15 bg-surface opacity-50 hover:opacity-70'
                      }`}
                    >
                      {/* Checkbox */}
                      <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                        on ? 'bg-brand-500 border-brand-500' : 'border-line/30'
                      }`}>
                        {on && <HiCheck className="w-3 h-3 text-white" />}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-ink text-sm leading-tight">{item.nome}</span>
                          <span className="text-[11px] text-ink/50 font-mono">{item.sku}</span>
                        </div>
                        <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">{item.motivo}</p>
                      </div>

                      {/* Quantity */}
                      <div
                        className="flex items-center gap-1.5 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setQty(item.productId, qty - 1)}
                          className="w-6 h-6 rounded border border-line/15 flex items-center justify-center text-ink/60 hover:bg-background text-sm font-bold disabled:opacity-30"
                          disabled={!on || qty <= 1}
                        >−</button>
                        <input
                          type="number"
                          value={qty}
                          min={1}
                          onChange={e => setQty(item.productId, Number(e.target.value))}
                          disabled={!on}
                          className="w-12 text-center text-sm font-semibold border border-line/15 rounded py-0.5 disabled:opacity-50"
                        />
                        <button
                          onClick={() => setQty(item.productId, qty + 1)}
                          className="w-6 h-6 rounded border border-line/15 flex items-center justify-center text-ink/60 hover:bg-background text-sm font-bold disabled:opacity-30"
                          disabled={!on}
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — import bar */}
      {phase === 'result' && selectedCount > 0 && (
        <div className="border-t border-line/15 bg-surface px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <span className="text-sm text-ink/70">
            <span className="font-bold text-ink">{selectedCount}</span> produto{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary"
          >
            {importing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <HiPlus className="w-4 h-4" />}
            Adicionar à BOM
          </button>
        </div>
      )}
    </div>
  )
}
