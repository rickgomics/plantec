'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { HiSparkles } from 'react-icons/hi2'
import { FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi'
import { corrigirIA, type ResultadoIA } from '@/lib/aiClient'
import { SECAO_LABEL, type Aviso, type Secao } from '@/lib/proposalAI'

/**
 * Lista da conferência com a correção pela IA: o que ela resolve (R$ no texto,
 * colchetes, markdown, cenário longo, funções vazias) tem botão próprio, e
 * "Corrigir tudo" resolve de uma vez. O que é do projetista (preço zerado,
 * BOM vazia) fica só como aviso.
 */
export default function AvisosConferencia({
  proposalId, avisos, extra, antesDeCorrigir, onCorrigido,
}: {
  proposalId: string
  avisos: Aviso[]
  /** Linhas a mais no topo (ex.: páginas cortadas, na etapa Revisar). */
  extra?: React.ReactNode
  antesDeCorrigir?: () => Promise<void>
  onCorrigido: (r: ResultadoIA) => void | Promise<void>
}) {
  const [corrigindo, setCorrigindo] = useState<Secao | 'tudo' | null>(null)
  const [chars, setChars] = useState(0)

  const corrigiveis = avisos.filter(a => a.correcao && a.secao !== 'geral')
  const erros = avisos.filter(a => a.nivel === 'erro')
  const atencoes = avisos.filter(a => a.nivel === 'atencao')

  const corrigir = async (secao?: Secao) => {
    setCorrigindo(secao ?? 'tudo')
    setChars(0)
    try {
      await antesDeCorrigir?.()
      const r = await corrigirIA(proposalId, secao ? [secao] : undefined, setChars)
      await onCorrigido(r)
      const n = r.corrigidos.length
      if (n) toast.success(`Corrigido com IA: ${r.corrigidos.map(s => SECAO_LABEL[s]).join(', ')}`)
      else toast('Nada que a IA precise corrigir')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setCorrigindo(null)
    }
  }

  if (!avisos.length && !extra) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <FiCheckCircle className="w-4 h-4" /> Conferência ok: nada que saia errado no PDF
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {corrigiveis.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink/55">
            {corrigiveis.length} {corrigiveis.length === 1 ? 'ponto a IA resolve' : 'pontos a IA resolve'}
          </span>
          <button type="button" className="btn-ai btn-xs" disabled={corrigindo !== null} onClick={() => corrigir()}>
            <HiSparkles className="w-3.5 h-3.5" />
            {corrigindo === 'tudo' ? (chars ? `Corrigindo… ${chars.toLocaleString('pt-BR')}` : 'Corrigindo…') : 'Corrigir tudo com IA'}
          </button>
        </div>
      )}
      <ul className="space-y-1.5">
        {extra}
        {[...erros, ...atencoes].map((a, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs ${a.nivel === 'erro' ? 'text-red-700' : 'text-amber-700'}`}>
            {a.nivel === 'erro' ? <FiXCircle className="w-4 h-4 flex-shrink-0" /> : <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">
              {a.secao !== 'geral' && <span className="font-semibold">{SECAO_LABEL[a.secao]}: </span>}
              {a.texto}
            </span>
            {a.correcao && a.secao !== 'geral' && (
              <button
                type="button"
                className="action-pill action-pill-violet !text-[11px] flex-shrink-0"
                disabled={corrigindo !== null}
                onClick={() => corrigir(a.secao as Secao)}
                title={a.correcao === 'gerar' ? 'Gerar com IA o que falta' : 'Corrigir com IA, mudando só o necessário'}
              >
                <HiSparkles className="w-3 h-3" />
                {corrigindo === a.secao ? 'Corrigindo…' : a.correcao === 'gerar' ? 'Gerar' : 'Corrigir'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
