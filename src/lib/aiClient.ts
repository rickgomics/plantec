'use client'

import type { AiMeta, Aviso, Secao } from './proposalAI'
import { SECAO_LABEL } from './proposalAI'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export interface ResultadoIA {
  textos: Partial<Record<'executiveSummary' | 'scope' | 'scenarioDesc', string>>
  funcoes: number
  avisos: Aviso[]
  pulados: { secao: Secao; motivo: string }[]
}

export async function carregarConferencia(proposalId: string): Promise<{ avisos: Aviso[]; aiMeta: AiMeta }> {
  const r = await fetch(`${BASE}/api/proposals/${proposalId}/ai`)
  if (!r.ok) return { avisos: [], aiMeta: {} }
  return r.json()
}

/**
 * Chama a geração (SSE sobre POST) e devolve o que foi gravado.
 * Seção editada à mão só é refeita se o usuário confirmar aqui.
 * Devolve null se o usuário desistir na confirmação.
 */
export async function gerarIA(
  proposalId: string,
  opts: { secoes: Secao[]; instrucao?: string; substituirFuncoes?: boolean },
  onProgresso?: (chars: number) => void,
): Promise<ResultadoIA | null> {
  const { aiMeta } = await carregarConferencia(proposalId)
  const manuais = opts.secoes.filter(s => s !== 'funcoes' && aiMeta.secoes?.[s]?.fonte === 'manual')
  const sobrescrever: Secao[] = opts.substituirFuncoes ? ['funcoes'] : []
  if (manuais.length) {
    const nomes = manuais.map(s => SECAO_LABEL[s]).join(', ')
    const ok = window.confirm(`${nomes} ${manuais.length > 1 ? 'foram editados' : 'foi editado'} à mão.\n\nOK substitui pelo texto novo da IA. Cancelar mantém o seu texto e gera só o resto.`)
    if (ok) sobrescrever.push(...manuais)
    else if (manuais.length === opts.secoes.length) return null
  }

  const res = await fetch(`${BASE}/api/proposals/${proposalId}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secoes: opts.secoes, instrucao: opts.instrucao, sobrescrever }),
  })
  if (!res.ok || !res.body) throw new Error(`Falha ao chamar a IA (HTTP ${res.status})`)

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  const pulados: ResultadoIA['pulados'] = []
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const linha = buf.slice(0, i).replace(/^data: /, '')
      buf = buf.slice(i + 2)
      if (!linha.trim()) continue
      const ev = JSON.parse(linha)
      if (ev.type === 'progresso') onProgresso?.(ev.chars)
      else if (ev.type === 'pulado') pulados.push({ secao: ev.secao, motivo: ev.motivo })
      else if (ev.type === 'erro') throw new Error(ev.message)
      else if (ev.type === 'pronto') return { textos: ev.textos ?? {}, funcoes: ev.funcoes ?? 0, avisos: ev.avisos ?? [], pulados }
    }
  }
  throw new Error('A conexão com a IA terminou sem resposta')
}
