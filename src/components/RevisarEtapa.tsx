'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiDownload } from 'react-icons/fi'
import { carregarConferencia, type ResultadoIA } from '@/lib/aiClient'
import AvisosConferencia from './AvisosConferencia'
import type { Aviso } from '@/lib/proposalAI'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

interface Paginas { paginas: number; cortes: { pagina: number; secao: string; excesso: number }[] }

/**
 * Etapa 4 do editor: tudo o que precisa estar certo antes de mandar ao
 * cliente, num lugar só — a conferência do conteúdo, a medição das páginas
 * no mesmo Chromium do download e o PDF inteiro para ler.
 */
export default function RevisarEtapa({ proposalId, versao, antesDeCorrigir, onCorrigido }: {
  proposalId: string
  versao: number
  antesDeCorrigir?: () => Promise<void>
  /** Traz para o editor o que a IA corrigiu (e recarrega o PDF). */
  onCorrigido: (r: ResultadoIA) => void | Promise<void>
}) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)
  const [paginas, setPaginas] = useState<Paginas | null>(null)
  const [medindo, setMedindo] = useState(false)
  const [erroMedicao, setErroMedicao] = useState('')

  const medir = useCallback(async () => {
    setMedindo(true)
    setErroMedicao('')
    try {
      const r = await fetch(`${BASE}/api/proposals/${proposalId}/pdf-check`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setPaginas(d)
    } catch (e) {
      setErroMedicao(e instanceof Error ? e.message : String(e))
    } finally {
      setMedindo(false)
    }
  }, [proposalId])

  useEffect(() => {
    carregarConferencia(proposalId).then(r => setAvisos(r.avisos)).catch(() => setAvisos([]))
    medir()
  }, [proposalId, versao, medir])

  const erros = avisos?.filter(a => a.nivel === 'erro') ?? []
  const atencoes = avisos?.filter(a => a.nivel === 'atencao') ?? []
  const cortes = paginas?.cortes ?? []
  const pronto = avisos !== null && paginas !== null && !erros.length && !cortes.length

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">
      <div className="space-y-4 xl:sticky xl:top-4">
        <div className="card space-y-3">
          <h2 className="font-display font-extrabold uppercase text-[19px] leading-tight text-ink">Antes de enviar</h2>
          {avisos === null || paginas === null && medindo ? (
            <p className="text-sm text-ink/55">Conferindo a proposta e medindo as páginas…</p>
          ) : pronto && !atencoes.length ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <FiCheckCircle className="w-4 h-4" /> Tudo certo para enviar
            </p>
          ) : (
            <p className="text-sm text-ink/65">
              {erros.length + cortes.length > 0
                ? `${erros.length + cortes.length} ${erros.length + cortes.length === 1 ? 'ponto precisa' : 'pontos precisam'} de ajuste antes de enviar.`
                : 'Nada impede o envio; vale olhar os pontos de atenção.'}
            </p>
          )}

          <AvisosConferencia
            proposalId={proposalId}
            avisos={avisos ?? []}
            antesDeCorrigir={antesDeCorrigir}
            onCorrigido={async r => { await onCorrigido(r); setAvisos(r.avisos); medir() }}
            extra={cortes.map(c => (
              <li key={`c${c.pagina}`} className="flex items-start gap-2 text-xs text-red-700">
                <FiXCircle className="w-4 h-4 flex-shrink-0" />
                <span><span className="font-semibold">Página {c.pagina} ({c.secao}):</span> {c.excesso}px de conteúdo não saem no papel</span>
              </li>
            ))}
          />

          <div className="flex items-center gap-2 pt-1 border-t border-line/10">
            <button type="button" className="btn-secondary btn-xs" onClick={medir} disabled={medindo}>
              <FiRefreshCw className={`w-3.5 h-3.5 ${medindo ? 'animate-spin' : ''}`} />
              {medindo ? 'Medindo…' : 'Medir páginas de novo'}
            </button>
            {paginas && <span className="text-xs text-ink/55 num-mono">{paginas.paginas} páginas</span>}
          </div>
          {erroMedicao && <p className="text-xs text-red-700">Não foi possível medir o PDF: {erroMedicao}</p>}
        </div>

        <a href={`${BASE}/proposals/${proposalId}/download`} download className="btn-primary btn-block">
          <FiDownload className="w-4 h-4" />Baixar PDF
        </a>
      </div>

      <div className="card !p-0 overflow-hidden h-[calc(100vh-2rem)] min-h-[640px]">
        <iframe key={versao} src={`${BASE}/proposals/${proposalId}/pdf?embed=1`} title="PDF da proposta" className="w-full h-full border-0 bg-white" />
      </div>
    </div>
  )
}
