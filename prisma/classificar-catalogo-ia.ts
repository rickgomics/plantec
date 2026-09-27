/**
 * Classifica com o Claude (Message Batches, metade do preço) os produtos que
 * nenhuma regra de src/lib/taxonomy.ts pegou.
 *
 *   npm run catalogo:ia -- enviar                 → cria o lote (gasta API; ~US$ 1 para ~900 produtos)
 *   npm run catalogo:ia -- coletar <batch_id>     → baixa o resultado para CSV + JSON (não grava na base)
 *   npm run catalogo:ia -- direto                 → mesmos pedidos pela API normal (dobro do preço, minutos)
 *   npm run catalogo:ia -- aplicar <arquivo.json> → relatório; com --apply grava
 *
 * A resposta é um enum de pares "Categoria > Subcategoria" montado da própria
 * taxonomia (structured outputs), então não sai categoria inventada. Só
 * confiança alta ou média é aplicada; baixa fica no CSV para revisão manual.
 * Nunca sobrescreve classificação manual.
 */
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient, Prisma } from '@prisma/client'
import { readFileSync, writeFileSync } from 'fs'
import { TAXONOMY, classificarPorRegra, classificacaoGuardada } from '../src/lib/taxonomy'

const prisma = new PrismaClient()
const client = new Anthropic()
const MODEL = 'claude-opus-5'
const POR_PEDIDO = 40
const SAIDA = process.env.CLASSIFICAR_IA_DIR ?? '/tmp'

const SEP = ' > '
const CLASSES = TAXONOMY.flatMap(c => (c.subs.length ? c.subs.map(s => `${c.name}${SEP}${s}`) : [c.name]))

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['itens'],
  properties: {
    itens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sku', 'classe', 'confianca'],
        properties: {
          sku: { type: 'string' },
          classe: { type: 'string', enum: CLASSES },
          confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
      },
    },
  },
} as const

const SYSTEM = `Você classifica produtos do catálogo da Plantec, distribuidora de segurança eletrônica, redes, telecom e infraestrutura.

Para cada produto, escolha a classe (categoria > subcategoria) que um projetista usaria para encontrá-lo ao montar uma proposta. Guie-se pela função do produto, não pela marca nem pela loja de onde veio.

Classes possíveis:
${CLASSES.map(c => `- ${c}`).join('\n')}

Critérios:
- Acessório específico de um equipamento vai com ele (suporte de câmera em Acessórios de CFTV, módulo de automatizador em Automatizadores, placa de central telefônica em Centrais Telefônicas).
- Ferramenta, EPI e material de fixação ou limpeza vão em Ferramentas e Consumíveis.
- Material elétrico de obra (fio, eletroduto, tomada, disjuntor) vai em Infraestrutura Elétrica.
- Use "Outros" só quando nenhuma classe servir.
- confianca: "alta" quando o nome deixa claro; "media" quando é o mais provável; "baixa" quando o nome é ambíguo ou truncado.

Responda um item por produto recebido, com o mesmo sku.`

type Prod = { sku: string; name: string; brand: string | null; category: string }

async function pendentes(): Promise<Prod[]> {
  const todos = await prisma.product.findMany({
    select: { sku: true, name: true, brand: true, category: true, attributes: true },
    orderBy: { sku: 'asc' },
  })
  return todos
    .filter(p => {
      const g = classificacaoGuardada(p.attributes)
      if (g && g.fonte !== 'regra') return false
      if ((p.attributes as { specsManuais?: boolean })?.specsManuais === true) return false
      return !classificarPorRegra(p.name)
    })
    .map(({ sku, name, brand, category }) => ({ sku, name, brand, category }))
}

async function pedidos() {
  const prods = await pendentes()
  const lotes: Prod[][] = []
  for (let i = 0; i < prods.length; i += POR_PEDIDO) lotes.push(prods.slice(i, i + POR_PEDIDO))
  const reqs = lotes.map((lote, i) => ({
    custom_id: `lote-${String(i).padStart(3, '0')}`,
    params: {
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // o system é igual em todos os pedidos: cacheado, só o primeiro paga inteiro
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: JSON.stringify(lote.map(p => ({ sku: p.sku, nome: p.name, marca: p.brand, segmento_loja: p.category }))),
      }],
    },
  })) as Anthropic.Messages.BatchCreateParams.Request[]
  return { total: prods.length, reqs }
}

async function enviar() {
  const { total, reqs } = await pedidos()
  const batch = await client.messages.batches.create({ requests: reqs })
  console.log(`${total} produtos em ${reqs.length} pedidos.`)
  console.log(`Lote criado: ${batch.id} (${batch.processing_status})`)
  console.log(`Depois: npm run catalogo:ia -- coletar ${batch.id}`)
}

interface Resultado { sku: string; classe: string; confianca: 'alta' | 'media' | 'baixa' }

class Coleta {
  itens: Resultado[] = []
  falhas: string[] = []
  entrada = 0
  saida = 0

  ler(id: string, msg: Anthropic.Messages.Message) {
    this.entrada += msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0)
    this.saida += msg.usage.output_tokens
    if (msg.stop_reason !== 'end_turn') { this.falhas.push(`${id}: stop_reason ${msg.stop_reason}`); return }
    const text = msg.content.find(c => c.type === 'text')
    if (!text || text.type !== 'text') { this.falhas.push(`${id}: sem texto`); return }
    try {
      this.itens.push(...(JSON.parse(text.text) as { itens: Resultado[] }).itens)
    } catch {
      this.falhas.push(`${id}: JSON inválido`)
    }
  }

  async gravar(nome: string, nota: string) {
    const nomes = new Map((await prisma.product.findMany({ select: { sku: true, name: true, category: true } })).map(p => [p.sku, p]))
    const base = `${SAIDA}/classificacao-ia-${nome}`
    writeFileSync(`${base}.json`, JSON.stringify(this.itens, null, 1))
    const cel = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    writeFileSync(`${base}.csv`, ['sku,nome,categoria_atual,classe_ia,confianca']
      .concat(this.itens.map(i => [i.sku, nomes.get(i.sku)?.name, nomes.get(i.sku)?.category, i.classe, i.confianca].map(cel).join(',')))
      .join('\n'))
    const conf = (c: string) => this.itens.filter(i => i.confianca === c).length
    console.log(`${this.itens.length} classificados: ${conf('alta')} alta, ${conf('media')} média, ${conf('baixa')} baixa.`)
    console.log(`Tokens: ${this.entrada} entrada, ${this.saida} saída (${nota}).`)
    if (this.falhas.length) console.log(`Falhas (reenviar):\n  ${this.falhas.join('\n  ')}`)
    console.log(`Arquivos: ${base}.csv e ${base}.json`)
  }
}

async function coletar(batchId: string) {
  const b = await client.messages.batches.retrieve(batchId)
  if (b.processing_status !== 'ended') {
    console.log(`Ainda processando: ${JSON.stringify(b.request_counts)}`)
    return
  }
  const c = new Coleta()
  for await (const r of await client.messages.batches.results(batchId)) {
    if (r.result.type !== 'succeeded') { c.falhas.push(`${r.custom_id}: ${r.result.type}`); continue }
    c.ler(r.custom_id, r.result.message)
  }
  await c.gravar(batchId.slice(-8), 'lote: metade do preço')
}

/** Mesmos pedidos pela API normal, 4 por vez: o dobro do preço do lote, pronto em minutos. */
async function direto() {
  const { total, reqs } = await pedidos()
  console.log(`${total} produtos em ${reqs.length} pedidos (API normal).`)
  const c = new Coleta()
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < reqs.length) {
      const r = reqs[proximo++]
      try {
        const msg = await client.messages.create(r.params as Anthropic.Messages.MessageCreateParamsNonStreaming)
        c.ler(r.custom_id, msg)
      } catch (e) {
        c.falhas.push(`${r.custom_id}: ${e instanceof Anthropic.APIError ? `HTTP ${e.status} ${e.message}` : String(e)}`)
      }
      process.stdout.write('.')
    }
  }
  await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()])
  console.log('')
  await c.gravar(`direto-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`, 'API normal')
}

async function aplicar(arquivo: string, gravar: boolean) {
  const itens = JSON.parse(readFileSync(arquivo, 'utf8')) as Resultado[]
  const aplicaveis = itens.filter(i => i.confianca !== 'baixa' && CLASSES.includes(i.classe))
  const prods = await prisma.product.findMany({
    where: { sku: { in: aplicaveis.map(i => i.sku) } },
    select: { id: true, sku: true, attributes: true },
  })
  const porSku = new Map(prods.map(p => [p.sku, p]))
  const em = new Date().toISOString()
  const plano = aplicaveis.flatMap(i => {
    const p = porSku.get(i.sku)
    if (!p) return []
    const g = classificacaoGuardada(p.attributes)
    if (g?.fonte === 'manual') return []
    const [category, subcategory = null] = i.classe.split(SEP)
    return [{ id: p.id, category, subcategory, attributes: { ...(p.attributes as object), classificacao: { category, subcategory, fonte: 'ia', confianca: i.confianca, em } } }]
  })
  console.log(`${itens.length} no arquivo; ${plano.length} a aplicar (baixa confiança e manuais ficam de fora).`)
  if (!gravar) { console.log('--dry: nada gravado. Use --apply para gravar.'); return }
  for (let i = 0; i < plano.length; i += 200) {
    await prisma.$transaction(plano.slice(i, i + 200).map(u => prisma.product.update({
      where: { id: u.id },
      data: { category: u.category, subcategory: u.subcategory, attributes: u.attributes as Prisma.InputJsonValue },
    })))
  }
  console.log(`Gravado: ${plano.length} produtos.`)
}

async function main() {
  const [cmd, arg] = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (cmd === 'enviar') return enviar()
  if (cmd === 'coletar' && arg) return coletar(arg)
  if (cmd === 'direto') return direto()
  if (cmd === 'aplicar' && arg) return aplicar(arg, process.argv.includes('--apply'))
  console.log('Uso: enviar | coletar <batch_id> | direto | aplicar <arquivo.json> [--apply]')
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
