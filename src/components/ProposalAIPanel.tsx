'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { HiSparkles, HiCheckCircle, HiExclamationTriangle, HiXCircle } from 'react-icons/hi2'
import { BRIEF_PERGUNTAS, SECAO_LABEL, type Aviso, type Brief } from '@/lib/proposalAI'
import { carregarConferencia, gerarIA, type ResultadoIA } from '@/lib/aiClient'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Brief do projeto + "Gerar textos da proposta" + conferência.
 *
 * O brief é o que a IA não tem como adivinhar pela BOM: o problema do
 * cliente, o local, o que já existe. Tudo que é gerado parte dele.
 */
export default function ProposalAIPanel({
  proposalId, briefInicial, versao, antesDeGerar, onGerado,
}: {
  proposalId: string
  briefInicial: Brief | null | undefined
  /** Muda quando a proposta é salva/recarregada: refaz a conferência. */
  versao: unknown
  /** Salva o que está na tela antes: edição não salva também conta como manual. */
  antesDeGerar?: () => Promise<void>
  onGerado: (r: ResultadoIA) => void | Promise<void>
}) {
  const [brief, setBrief] = useState<Brief>(briefInicial ?? {})
  const [aberto, setAberto] = useState(() => !Object.values(briefInicial ?? {}).some(v => v?.trim()))
  const [gerando, setGerando] = useState(false)
  const [chars, setChars] = useState(0)
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [pdf, setPdf] = useState<{ paginas: number; cortes: { pagina: number; secao: string; excesso: number }[] } | null>(null)

  const verificarPdf = async () => {
    setVerificando(true)
    try {
      const r = await fetch(`${BASE}/api/proposals/${proposalId}/pdf-check`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setPdf(d)
    } catch (e) {
      toast.error(`Não foi possível verificar o PDF: ${e instanceof Error ? e.message : e}`)
    } finally {
      setVerificando(false)
    }
  }

  const conferir = useCallback(() => {
    carregarConferencia(proposalId).then(r => setAvisos(r.avisos)).catch(() => setAvisos(null))
  }, [proposalId])

  useEffect(() => { conferir(); setPdf(null) }, [conferir, versao])

  const salvarBrief = async (b: Brief) => {
    await fetch(`${BASE}/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: b }),
    })
  }

  const gerar = async () => {
    setGerando(true)
    setChars(0)
    try {
      await antesDeGerar?.()
      await salvarBrief(brief)
      const r = await gerarIA(proposalId, { secoes: ['resumo', 'escopo', 'cenario', 'funcoes', 'topologia'] }, setChars)
      if (!r) return
      await onGerado(r)
      setAvisos(r.avisos)
      const feitas = Object.keys(r.textos).length + (r.funcoes ? 1 : 0)
      toast.success(`Textos gerados${r.funcoes ? ` · ${r.funcoes} funções na BOM` : ''}`)
      if (!feitas && r.pulados.length) toast('Nada a gerar: tudo já estava preenchido ou editado à mão')
      setAberto(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setGerando(false)
    }
  }

  const erros = avisos?.filter(a => a.nivel === 'erro') ?? []
  const atencoes = avisos?.filter(a => a.nivel === 'atencao') ?? []

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-ink tracking-tight text-sm">Textos da proposta</h3>
          <p className="text-xs text-ink/45 mt-0.5">
            A IA escreve resumo, escopo, cenário, a função de cada item e o diagrama, a partir do brief e da BOM completa.
          </p>
        </div>
        <button type="button" className="btn-ai btn-sm flex-shrink-0" onClick={gerar} disabled={gerando}>
          <HiSparkles className="w-4 h-4" />
          {gerando ? (chars ? `Escrevendo… ${chars.toLocaleString('pt-BR')} caracteres` : 'Pensando…') : 'Gerar textos da proposta'}
        </button>
      </div>

      <div>
        <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={() => setAberto(a => !a)}>
          {aberto ? '▾' : '▸'} Brief do projeto
          {!aberto && Object.values(brief).some(v => v?.trim()) && <span className="text-ink/40 font-medium"> · preenchido</span>}
        </button>
        {aberto && (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {BRIEF_PERGUNTAS.map(q => (
              <div key={q.key}>
                <label className="label">{q.label}</label>
                <textarea
                  className="input text-sm"
                  rows={3}
                  placeholder={q.placeholder}
                  value={brief[q.key] ?? ''}
                  onChange={e => setBrief(b => ({ ...b, [q.key]: e.target.value }))}
                  onBlur={() => salvarBrief(brief)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {avisos && (
        <div className="border-t border-line/10 pt-3 space-y-2">
          {!erros.length && !atencoes.length ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <HiCheckCircle className="w-4 h-4" /> Conferência ok: nada que saia errado no PDF
            </p>
          ) : (
            <ul className="space-y-1">
              {[...erros, ...atencoes].map((a, i) => (
                <li key={i} className={`flex items-start gap-2 text-xs ${a.nivel === 'erro' ? 'text-red-700' : 'text-amber-700'}`}>
                  {a.nivel === 'erro' ? <HiXCircle className="w-4 h-4 flex-shrink-0" /> : <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>
                    {a.secao !== 'geral' && <span className="font-semibold">{SECAO_LABEL[a.secao]}: </span>}
                    {a.texto}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className="btn-secondary btn-xs" onClick={verificarPdf} disabled={verificando}>
              {verificando ? 'Verificando o PDF…' : 'Verificar páginas do PDF'}
            </button>
            {pdf && !pdf.cortes.length && (
              <span className="text-xs font-semibold text-emerald-700">{pdf.paginas} páginas, nada cortado</span>
            )}
            {pdf && pdf.cortes.map(c => (
              <span key={c.pagina} className="text-xs font-semibold text-red-700">
                Página {c.pagina} ({c.secao}): {c.excesso}px de conteúdo não sai no papel
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
