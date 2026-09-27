export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  SECOES, SECAO_CAMPO, SECAO_LABEL, VOZ,
  montarContexto, schemaPara, conferir, limpar,
  textoResumo, textoEscopo, textoCenario,
  type AiMeta, type Brief, type Gerado, type Secao,
} from '@/lib/proposalAI'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-opus-5'

/**
 * Gera o conteúdo da proposta num pedido só, com resposta estruturada.
 *
 * Body: { secoes?: Secao[], instrucao?: string, sobrescrever?: Secao[] }
 *  - secoes: o que gerar (padrão: todas)
 *  - instrucao: pedido do projetista ao refazer ("mais curto", "foco em redundância")
 *  - sobrescrever: seções editadas à mão que o usuário confirmou substituir;
 *    em "funcoes", substitui também as funções já preenchidas (sem isso, só
 *    as vazias são geradas)
 *
 * Responde em SSE: `progresso` (caracteres recebidos), `pulado`, `pronto`
 * (textos gravados + conferência) ou `erro`. Grava direto na proposta.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const pedidas: Secao[] = Array.isArray(body.secoes) && body.secoes.length
    ? SECOES.filter(s => body.secoes.includes(s))
    : [...SECOES]
  const sobrescrever = new Set<Secao>(Array.isArray(body.sobrescrever) ? body.sobrescrever : [])
  const instrucao = typeof body.instrucao === 'string' ? body.instrucao.trim().slice(0, 600) : ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      try {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada')

        const proposal = await prisma.proposal.findUnique({
          where: { id: params.id },
          include: { customer: true, items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
        })
        if (!proposal) throw new Error('Proposta não encontrada')
        if (!proposal.items.length) throw new Error('A BOM está vazia — adicione os produtos antes de gerar o texto')

        const meta = (proposal.aiMeta ?? {}) as AiMeta
        const secoesMeta = { ...(meta.secoes ?? {}) }

        // Seções editadas à mão não são refeitas sem confirmação.
        const secoes = pedidas.filter(s => {
          if (s === 'funcoes') {
            const vazias = proposal.items.some(i => !i.role?.trim())
            if (!vazias && !sobrescrever.has('funcoes')) {
              send({ type: 'pulado', secao: s, motivo: 'todas as funções já estão preenchidas' })
              return false
            }
            return true
          }
          if (secoesMeta[s]?.fonte === 'manual' && !sobrescrever.has(s)) {
            send({ type: 'pulado', secao: s, motivo: 'editado à mão' })
            return false
          }
          return true
        })
        if (!secoes.length) {
          send({ type: 'pronto', textos: {}, funcoes: 0, avisos: conferir(proposal) })
          return
        }

        const contexto = montarContexto(proposal, (proposal.brief ?? {}) as Brief)
        const itensAlvo = secoes.includes('funcoes')
          ? proposal.items.filter(i => sobrescrever.has('funcoes') || !i.role?.trim()).map(i => i.product.sku)
          : []
        const pedido = [
          `Gere: ${secoes.map(s => SECAO_LABEL[s]).join(', ')}.`,
          itensAlvo.length && itensAlvo.length < proposal.items.length
            ? `Em "funcoes", responda só estes SKUs: ${itensAlvo.join(', ')}.`
            : '',
          secoes.some(s => s !== 'funcoes' && proposal[SECAO_CAMPO[s as Exclude<Secao, 'funcoes'>]])
            ? 'Há versões anteriores destas seções; escreva de novo a partir do brief e da BOM, sem se prender a elas.'
            : '',
          instrucao ? `Pedido do projetista para esta versão: ${instrucao}` : '',
        ].filter(Boolean).join('\n')

        send({ type: 'inicio', secoes })

        // `fallbacks: "default"`: se um classificador recusar, o próprio
        // servidor refaz no modelo indicado. O SDK instalado ainda não tipa o
        // parâmetro, por isso o cast.
        const params_ = {
          model: MODEL,
          max_tokens: 32000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high', format: { type: 'json_schema', schema: schemaPara(secoes) } },
          system: [{ type: 'text', text: VOZ }],
          messages: [{
            role: 'user',
            content: [
              // brief + BOM iguais entre "gerar" e "refazer seção": cacheados
              { type: 'text', text: contexto, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: pedido },
            ],
          }],
        } as unknown as Parameters<typeof client.beta.messages.stream>[0]

        const s = client.beta.messages.stream(params_)
        let chars = 0, ultimo = 0
        s.on('text', delta => {
          chars += delta.length
          if (chars - ultimo >= 200) { ultimo = chars; send({ type: 'progresso', chars }) }
        })
        const msg = await s.finalMessage()

        if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou gerar este conteúdo. Revise o brief e tente de novo.')
        if (msg.stop_reason === 'max_tokens') throw new Error('A resposta passou do limite de tamanho. Gere menos seções por vez.')
        const bloco = msg.content.find(c => c.type === 'text')
        if (!bloco || bloco.type !== 'text') throw new Error('Resposta sem texto')
        const g = JSON.parse(bloco.text) as Gerado

        const agora = new Date().toISOString()
        const data: Prisma.ProposalUpdateInput = {}
        const textos: Partial<Record<'executiveSummary' | 'scope' | 'scenarioDesc', string>> = {}
        if (g.resumo)  textos.executiveSummary = textoResumo(g.resumo)
        if (g.escopo)  textos.scope            = textoEscopo(g.escopo)
        if (g.cenario) textos.scenarioDesc     = textoCenario(g.cenario)
        Object.assign(data, textos)
        for (const sec of secoes) secoesMeta[sec] = { fonte: 'ia', em: agora, modelo: msg.model }
        data.aiMeta = { ...meta, secoes: secoesMeta } as Prisma.InputJsonValue

        const alvo = new Set(itensAlvo)
        const porSku = new Map((g.funcoes ?? []).map(f => [f.sku.trim().toUpperCase(), limpar(f.funcao)]))
        const updates = proposal.items
          .filter(i => alvo.has(i.product.sku) && porSku.get(i.product.sku.toUpperCase()))
          .map(i => prisma.proposalItem.update({ where: { id: i.id }, data: { role: porSku.get(i.product.sku.toUpperCase()) } }))
        const funcoes = updates.length

        await prisma.$transaction([
          ...updates,
          prisma.proposal.update({ where: { id: params.id }, data }),
        ])
        const atualizada = await prisma.proposal.findUniqueOrThrow({
          where: { id: params.id },
          include: { items: { include: { product: true } } },
        })

        send({
          type: 'pronto',
          textos,
          funcoes,
          uso: { entrada: msg.usage.input_tokens, cache: msg.usage.cache_read_input_tokens ?? 0, saida: msg.usage.output_tokens },
          avisos: conferir(atualizada),
        })
      } catch (e) {
        const message = e instanceof Anthropic.APIError
          ? `IA indisponível (${e.status ?? 'rede'}): ${e.message}`
          : e instanceof Error ? e.message : 'Erro desconhecido'
        console.error('[proposals/ai]', message)
        send({ type: 'erro', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Conferência sem gerar nada — para a barra de prontidão. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  })
  if (!proposal) return Response.json({ error: 'Proposta não encontrada' }, { status: 404 })
  return Response.json({ avisos: conferir(proposal), aiMeta: proposal.aiMeta ?? {} })
}
