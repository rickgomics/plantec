'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { HiSparkles } from 'react-icons/hi2'
import { gerarIA, type ResultadoIA } from '@/lib/aiClient'
import type { Secao } from '@/lib/proposalAI'

/**
 * Gera ou refaz UMA seção, com um pedido opcional ("mais curto", "foco em
 * redundância"). Usa o mesmo brief e BOM da geração completa.
 */
export default function RefazerSecao({
  proposalId, secao, temTexto, antesDeGerar, onGerado,
}: {
  proposalId: string
  secao: Secao
  temTexto: boolean
  /** Salva o que está na tela antes: edição não salva também conta como manual. */
  antesDeGerar?: () => Promise<void>
  onGerado: (r: ResultadoIA) => void | Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [instrucao, setInstrucao] = useState('')
  const [gerando, setGerando] = useState(false)

  const gerar = async () => {
    setGerando(true)
    try {
      await antesDeGerar?.()
      const r = await gerarIA(proposalId, { secoes: [secao], instrucao: instrucao || undefined })
      if (!r) return
      await onGerado(r)
      setAberto(false)
      setInstrucao('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setGerando(false)
    }
  }

  if (!temTexto) {
    return (
      <button type="button" className="btn-ai btn-xs" onClick={gerar} disabled={gerando}>
        <HiSparkles className="w-3.5 h-3.5" /> {gerando ? 'Gerando…' : 'Gerar'}
      </button>
    )
  }

  return (
    <div className="relative">
      <button type="button" className="btn-ai btn-xs" onClick={() => setAberto(a => !a)} disabled={gerando}>
        <HiSparkles className="w-3.5 h-3.5" /> {gerando ? 'Refazendo…' : 'Refazer'}
      </button>
      {aberto && !gerando && (
        <div className="absolute right-0 top-full mt-1 z-20 w-72 card p-3 space-y-2 shadow-lg">
          <input
            className="input text-xs"
            autoFocus
            placeholder="O que mudar? (opcional) Ex.: mais curto"
            value={instrucao}
            onChange={e => setInstrucao(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && gerar()}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-xs" onClick={() => setAberto(false)}>Cancelar</button>
            <button type="button" className="btn-primary btn-xs" onClick={gerar}>Refazer</button>
          </div>
        </div>
      )}
    </div>
  )
}
