export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  SECOES, SECAO_CAMPO, SECAO_LABEL, VOZ,
  montarContexto, schemaPara, conferir, corrigiveis, pedidoCorrecao, limpar, descritivoRuim,
  textoResumo, textoEscopo, textoCenario,
  type AiMeta, type Aviso, type Brief, type Gerado, type Secao,
} from '@/lib/proposalAI'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-opus-5'

type Send = (data: object) => void
type TextoCampo = 'executiveSummary' | 'scope' | 'scenarioDesc'

const carregar = (id: string) => prisma.proposal.findUnique({
  where: { id },
  include: { customer: true, items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
})
type PropostaIA = NonNullable<Awaited<ReturnType<typeof carregar>>>

/** Uma chamada ao modelo com resposta no schema das seções pedidas. */
async function chamar(contexto: string, secoes: Secao[], pedido: string, send: Send) {
  // `fallbacks: "default"`: se um classificador recusar, o próprio servidor
  // refaz no modelo indicado. O SDK instalado ainda não tipa o parâmetro.
  const params = {
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
        // brief + BOM iguais entre gerar, refazer e corrigir: cacheados
        { type: 'text', text: contexto, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: pedido },
      ],
    }],
  } as unknown as Parameters<typeof client.beta.messages.stream>[0]

  const s = client.beta.messages.stream(params)
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
  return { g: JSON.parse(bloco.text) as Gerado, msg }
}

/**
 * Grava o que o modelo devolveu. `fonte` diz como marcar cada seção: texto
 * gerado vira 'ia'; texto corrigido mantém a origem que tinha (um texto
 * escrito à mão continua protegido depois de corrigido).
 */
async function gravar(
  proposal: PropostaIA, g: Gerado, secoes: Secao[], skusFuncao: string[],
  fonte: (s: Secao) => 'ia' | 'manual', modelo: string, refazerFuncoes = false,
) {
  const meta = (proposal.aiMeta ?? {}) as AiMeta
  const secoesMeta = { ...(meta.secoes ?? {}) }
  const agora = new Date().toISOString()
  const data: Prisma.ProposalUpdateInput = {}
  const textos: Partial<Record<TextoCampo, string>> = {}
  if (g.resumo)  textos.executiveSummary = textoResumo(g.resumo)
  if (g.escopo)  textos.scope            = textoEscopo(g.escopo)
  if (g.cenario) textos.scenarioDesc     = textoCenario(g.cenario)
  Object.assign(data, textos)
  if (g.topologia) {
    data.scenarioDiagram = JSON.stringify(g.topologia)
    data.diagramType = 'plantec'
    data.eraserImageUrl = null
  }
  for (const sec of secoes) secoesMeta[sec] = { fonte: fonte(sec), em: agora, modelo }
  data.aiMeta = { ...meta, secoes: secoesMeta } as Prisma.InputJsonValue

  // Função e descritivo técnico de cada item. Sem "refazer", só preenche o
  // que falta: função vazia e descritivo vazio ou copiado da loja ("CONHEÇA O
  // PRODUTO…") — o que o projetista escreveu fica.
  const alvo = new Set(skusFuncao)
  const porSku = new Map((g.funcoes ?? []).map(f => [f.sku.trim().toUpperCase(), f]))
  const updates = proposal.items.flatMap(i => {
    const f = porSku.get(i.product.sku.toUpperCase())
    if (!alvo.has(i.product.sku) || !f) return []
    const d: Prisma.ProposalItemUpdateInput = {}
    const funcao = limpar(f.funcao ?? '')
    const descritivo = limpar(f.descritivo ?? '')
    if (funcao && (refazerFuncoes || !i.role?.trim())) d.role = funcao
    if (descritivo && (refazerFuncoes || descritivoRuim(i.technicalNotes, i.product.description))) d.technicalNotes = descritivo
    return Object.keys(d).length ? [prisma.proposalItem.update({ where: { id: i.id }, data: d })] : []
  })

  await prisma.$transaction([...updates, prisma.proposal.update({ where: { id: proposal.id }, data })])
  return { textos, funcoes: updates.length, topologia: g.topologia ? (data.scenarioDiagram as string) : undefined }
}

/**
 * Monta a passada que resolve os avisos corrigíveis: texto com problema é
 * corrigido a partir do texto atual; o que falta é gerado. Devolve null se
 * não há o que a IA resolva.
 */
function planoCorrecao(p: PropostaIA, avisos: Aviso[], limitarA?: Set<Secao>) {
  const porSecao = corrigiveis(avisos)
  const secoes: Secao[] = []
  const partes: string[] = []
  let skus: string[] = []
  for (const [secao, lista] of Array.from(porSecao.entries())) {
    if (limitarA && !limitarA.has(secao)) continue
    if (secao === 'funcoes') {
      skus = p.items.filter(i => !i.role?.trim() || descritivoRuim(i.technicalNotes, i.product.description)).map(i => i.product.sku)
      if (!skus.length) continue
      secoes.push('funcoes')
      partes.push(`Em "funcoes", responda só estes SKUs, que estão sem função ou sem descritivo técnico: ${skus.join(', ')}.`)
      continue
    }
    if (secao === 'topologia') continue
    const atual = p[SECAO_CAMPO[secao]]?.trim() ?? ''
    const problemas = lista.filter(a => a.correcao === 'reescrever' && a.problema).map(a => a.problema!)
    secoes.push(secao)
    partes.push(atual && problemas.length
      ? pedidoCorrecao(secao, atual, problemas)
      : `Escreva a seção "${SECAO_LABEL[secao]}", que está vazia.`)
  }
  return secoes.length ? { secoes: SECOES.filter(s => secoes.includes(s)), pedido: partes.join('\n\n'), skus } : null
}

/**
 * Gera ou corrige o conteúdo da proposta, com resposta estruturada.
 *
 * Body:
 *  - { secoes?, instrucao?, sobrescrever? } gera (padrão: todas as seções).
 *    Seção editada à mão só é refeita se estiver em `sobrescrever`; em
 *    "funcoes", `sobrescrever` refaz também as já preenchidas.
 *    Depois de gravar, confere: se as seções que acabou de escrever têm algo
 *    que a IA corrige (R$ no texto, colchete, markdown, cenário longo), faz
 *    uma passada de correção antes de responder — uma vez só.
 *  - { corrigir: true, secoes? } resolve os avisos corrigíveis da conferência: corrige
 *    o texto que existe mudando o mínimo e gera o que falta (funções vazias).
 *
 * SSE: `inicio`, `progresso`, `pulado`, `corrigindo`, `pronto` ou `erro`.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const modoCorrigir = body.corrigir === true
  const pedidas: Secao[] = Array.isArray(body.secoes) && body.secoes.length
    ? SECOES.filter(s => body.secoes.includes(s))
    : [...SECOES]
  const sobrescrever = new Set<Secao>(Array.isArray(body.sobrescrever) ? body.sobrescrever : [])
  const instrucao = typeof body.instrucao === 'string' ? body.instrucao.trim().slice(0, 600) : ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = data => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      try {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada')

        let proposal = await carregar(params.id)
        if (!proposal) throw new Error('Proposta não encontrada')
        if (!proposal.items.length) throw new Error('A BOM está vazia — adicione os produtos antes de gerar o texto')
        const contexto = montarContexto(proposal, (proposal.brief ?? {}) as Brief)
        const fonteAtual = (p: PropostaIA) => (s: Secao) =>
          ((p.aiMeta ?? {}) as AiMeta).secoes?.[s]?.fonte === 'manual' ? 'manual' as const : 'ia' as const

        const total = { textos: {} as Partial<Record<TextoCampo, string>>, funcoes: 0, topologia: undefined as string | undefined, corrigidos: [] as Secao[] }
        const somar = (r: Awaited<ReturnType<typeof gravar>>) => {
          Object.assign(total.textos, r.textos)
          total.funcoes += r.funcoes
          if (r.topologia) total.topologia = r.topologia
        }

        if (modoCorrigir) {
          // com `secoes`, corrige só elas (botão de um aviso); sem, tudo o que der
          const plano = planoCorrecao(proposal, conferir(proposal), Array.isArray(body.secoes) ? new Set(pedidas) : undefined)
          if (!plano) {
            send({ type: 'pronto', ...total, avisos: conferir(proposal) })
            return
          }
          send({ type: 'corrigindo', secoes: plano.secoes })
          const { g, msg } = await chamar(contexto, plano.secoes, plano.pedido, send)
          somar(await gravar(proposal, g, plano.secoes, plano.skus, fonteAtual(proposal), msg.model))
          total.corrigidos = plano.secoes
        } else {
          const meta = (proposal.aiMeta ?? {}) as AiMeta
          const p0 = proposal
          // Seções editadas à mão não são refeitas sem confirmação.
          const secoes = pedidas.filter(s => {
            if (s === 'funcoes') {
              const vazias = p0.items.some(i => !i.role?.trim() || descritivoRuim(i.technicalNotes, i.product.description))
              if (!vazias && !sobrescrever.has('funcoes')) {
                send({ type: 'pulado', secao: s, motivo: 'funções e descritivos já estão preenchidos' })
                return false
              }
              return true
            }
            if (s === 'topologia') {
              const legado = p0.diagramType !== 'plantec' && !!p0.scenarioDiagram?.trim()
              if (legado && !sobrescrever.has(s)) {
                send({ type: 'pulado', secao: s, motivo: 'já tem diagrama Mermaid/Eraser' })
                return false
              }
              return true
            }
            if (meta.secoes?.[s]?.fonte === 'manual' && !sobrescrever.has(s)) {
              send({ type: 'pulado', secao: s, motivo: 'editado à mão' })
              return false
            }
            return true
          })
          if (!secoes.length) {
            send({ type: 'pronto', ...total, avisos: conferir(proposal) })
            return
          }

          const skus = secoes.includes('funcoes')
            ? p0.items.filter(i => sobrescrever.has('funcoes') || !i.role?.trim() || descritivoRuim(i.technicalNotes, i.product.description)).map(i => i.product.sku)
            : []
          const pedido = [
            `Gere: ${secoes.map(s => SECAO_LABEL[s]).join(', ')}.`,
            skus.length && skus.length < p0.items.length ? `Em "funcoes", responda só estes SKUs: ${skus.join(', ')}.` : '',
            secoes.some(s => s !== 'funcoes' && s !== 'topologia' && p0[SECAO_CAMPO[s]])
              ? 'Há versões anteriores destas seções; escreva de novo a partir do brief e da BOM, sem se prender a elas.'
              : '',
            instrucao ? `Pedido do projetista para esta versão: ${instrucao}` : '',
          ].filter(Boolean).join('\n')

          send({ type: 'inicio', secoes })
          const { g, msg } = await chamar(contexto, secoes, pedido, send)
          somar(await gravar(p0, g, secoes, skus, () => 'ia', msg.model, sobrescrever.has('funcoes')))

          // Conferência logo depois de gravar: o que a IA escreveu agora e
          // saiu com problema corrigível é corrigido já, uma vez só.
          proposal = (await carregar(params.id))!
          const plano = planoCorrecao(proposal, conferir(proposal), new Set(secoes))
          if (plano) {
            send({ type: 'corrigindo', secoes: plano.secoes })
            const c = await chamar(contexto, plano.secoes, plano.pedido, send)
            somar(await gravar(proposal, c.g, plano.secoes, plano.skus, fonteAtual(proposal), c.msg.model))
            total.corrigidos = plano.secoes
          }
        }

        const final = await carregar(params.id)
        send({ type: 'pronto', ...total, avisos: conferir(final!) })
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
  return Response.json({
    avisos: conferir(proposal),
    aiMeta: proposal.aiMeta ?? {},
    diagramaLegado: proposal.diagramType !== 'plantec' && !!proposal.scenarioDiagram?.trim(),
  })
}
