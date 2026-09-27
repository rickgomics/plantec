/**
 * Conteúdo da proposta gerado pela IA — um fluxo só, estruturado.
 *
 * Antes eram 7 botões soltos, cada um com seu contexto (o resumo executivo nem
 * via a BOM) e resposta em texto livre que o PDF fatiava procurando títulos
 * como "VANTAGENS TÉCNICAS:". Daí vieram os "[PARÁGRAFO 1]" impressos.
 *
 * Agora: um brief do projeto (respostas do projetista + BOM inteira com ficha
 * técnica), resposta em JSON garantido pelo schema (structured outputs) e a
 * conversão para o texto que o PDF já lê feita AQUI, em código — o formato
 * não depende mais de o modelo obedecer.
 */
import { isServico } from './services'

// ── Brief ─────────────────────────────────────────────────────────────────────

/** Perguntas que o projetista responde antes de gerar. Todas opcionais. */
export const BRIEF_PERGUNTAS = [
  { key: 'objetivo',   label: 'O que o cliente quer resolver',     placeholder: 'Ex.: furtos no estoque à noite; hoje não há gravação das docas' },
  { key: 'ambiente',   label: 'Ambiente e porte',                   placeholder: 'Ex.: galpão de 3.000 m², 2 docas, escritório no mezanino, pé-direito de 9 m' },
  { key: 'existentes', label: 'O que já existe no local',           placeholder: 'Ex.: rede Cat5e antiga, link de 300 Mb, DVR analógico de 8 canais que será substituído' },
  { key: 'restricoes', label: 'Prazos, restrições e observações',   placeholder: 'Ex.: instalação fora do horário comercial; cliente fornece a infraestrutura elétrica' },
] as const

export type BriefKey = typeof BRIEF_PERGUNTAS[number]['key']
export type Brief = Partial<Record<BriefKey, string>>

// ── Seções ────────────────────────────────────────────────────────────────────

export const SECOES = ['resumo', 'escopo', 'cenario', 'funcoes'] as const
export type Secao = typeof SECOES[number]

export const SECAO_LABEL: Record<Secao, string> = {
  resumo: 'Resumo executivo',
  escopo: 'Escopo',
  cenario: 'Cenário técnico',
  funcoes: 'Função na solução (BOM técnica)',
}

/** Onde cada seção é gravada na proposta. */
export const SECAO_CAMPO: Record<Exclude<Secao, 'funcoes'>, 'executiveSummary' | 'scope' | 'scenarioDesc'> = {
  resumo: 'executiveSummary',
  escopo: 'scope',
  cenario: 'scenarioDesc',
}

/** Metadados de geração guardados em `Proposal.aiMeta`. */
export interface AiMeta {
  secoes?: Partial<Record<Secao, { fonte: 'ia' | 'manual'; em: string; modelo?: string }>>
}

// ── Guia de voz ───────────────────────────────────────────────────────────────

export const VOZ = `Você escreve propostas comerciais da Plantec Distribuidora, especializada em segurança eletrônica, redes, telecom e infraestrutura. O texto vai impresso no PDF que o cliente final lê e assina.

Voz:
- Português do Brasil, tom de engenheiro consultor: direto, técnico, confiante, sem exagero publicitário.
- Frases de tamanho médio. Nada de clichê ("solução robusta e inovadora", "excelência", "estado da arte").
- Cite os equipamentos reais da BOM pelo modelo quando isso dá concretude; não liste a BOM inteira no texto.
- Nunca invente números, prazos, certificações, marcas ou fatos do cliente que não estejam no brief ou na BOM. Quando uma informação falta, escreva de forma que não dependa dela.
- Não escreva preços nem valores em reais: o investimento tem página própria.
- Não prometa o que não está vendido. Serviços (instalação, configuração, treinamento, projeto, manutenção) só entram como entrega se houver item de serviço na BOM ou se o brief disser que fazem parte; sem isso, a proposta é de fornecimento e o serviço vai em "não está incluso".
- Texto puro: sem markdown, sem asteriscos, sem títulos, sem numeração no início das frases, sem rótulos entre colchetes.

Cada campo da resposta vira um trecho do documento; escreva só o conteúdo do campo.`

// ── Contexto (brief + BOM) ────────────────────────────────────────────────────

interface ItemCtx {
  quantity: number
  role?: string | null
  product: {
    sku: string; name: string; brand: string | null
    category: string; subcategory: string | null
    description: string | null; attributes: unknown
  }
}

interface PropostaCtx {
  title: string
  vertical: string
  includeServices?: boolean | null
  customer: { companyName: string; tradeName?: string | null; city?: string | null; state?: string | null }
  items: ItemCtx[]
}

/** Contexto completo que todas as seções compartilham (vai em bloco cacheado). */
export function montarContexto(p: PropostaCtx, brief: Brief): string {
  const itens = p.items.filter(i => p.includeServices !== false || !isServico(i.product))
  const bom = itens.map(i => {
    const specs = (i.product.attributes as { specs?: Record<string, string> } | null)?.specs ?? {}
    const ficha = Object.entries(specs).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join('; ')
    return {
      sku: i.product.sku,
      produto: i.product.name,
      marca: i.product.brand,
      classe: [i.product.category, i.product.subcategory].filter(Boolean).join(' > '),
      quantidade: i.quantity,
      ...(ficha ? { ficha } : {}),
      ...(!ficha && i.product.description ? { descricao: i.product.description.slice(0, 240) } : {}),
    }
  })

  const respostas = BRIEF_PERGUNTAS
    .map(q => ({ q: q.label, r: (brief[q.key] ?? '').trim() }))
    .filter(x => x.r)

  const servicos = itens.filter(i => isServico(i.product)).map(i => i.product.name)
  const local = [p.customer.city, p.customer.state].filter(Boolean).join('/')
  return [
    `PROPOSTA: ${p.title}`,
    `SEGMENTO: ${p.vertical}`,
    `CLIENTE: ${p.customer.tradeName || p.customer.companyName}${local ? ` (${local})` : ''}`,
    '',
    'BRIEF DO PROJETISTA:',
    respostas.length ? respostas.map(x => `- ${x.q}: ${x.r}`).join('\n') : '- (não preenchido: baseie-se só na BOM e no título)',
    '',
    servicos.length
      ? `SERVIÇOS VENDIDOS NESTA PROPOSTA: ${servicos.join('; ')}`
      : 'SERVIÇOS VENDIDOS NESTA PROPOSTA: nenhum — proposta de fornecimento de equipamentos e licenças',
    '',
    `BOM (${bom.length} itens):`,
    JSON.stringify(bom, null, 1),
  ].join('\n')
}

// ── Schema da resposta ────────────────────────────────────────────────────────

const str = { type: 'string' } as const
const lista = { type: 'array', items: str } as const

const SCHEMA_SECAO = {
  resumo: {
    type: 'object', additionalProperties: false, required: ['paragrafos'],
    properties: { paragrafos: { ...lista, description: '3 a 4 parágrafos: necessidade do cliente, solução proposta, ganhos. Total de 900 a 1.600 caracteres.' } },
  },
  escopo: {
    type: 'object', additionalProperties: false, required: ['incluso', 'naoIncluso', 'condicoes'],
    properties: {
      incluso: { ...lista, description: '5 a 10 entregas, uma frase curta cada. Só o que a BOM e o brief sustentam: serviço sem item de serviço na BOM não é entrega' },
      naoIncluso: { ...lista, description: '3 a 7 exclusões que evitam mal-entendido (obra civil, elétrica, etc.)' },
      condicoes: { ...lista, description: '2 a 5 condições de execução (acesso, infraestrutura fornecida pelo cliente, etc.)' },
    },
  },
  cenario: {
    type: 'object', additionalProperties: false, required: ['paragrafos', 'vantagens', 'beneficios'],
    properties: {
      paragrafos: { ...lista, description: 'Exatamente 3 parágrafos: (1) ambiente físico, (2) arquitetura da solução e como os equipamentos se ligam, (3) integração e dependências externas. Total de 1.800 a 2.600 caracteres.' },
      vantagens: { ...lista, description: '5 vantagens técnicas, uma frase cada' },
      beneficios: { ...lista, description: '5 benefícios para o cliente, uma frase cada' },
    },
  },
  funcoes: {
    type: 'array',
    description: 'Uma entrada por item da BOM: o que o produto faz NESTE projeto (até 40 palavras). Ex.: não "câmera IP", mas "Câmera dome que cobre a recepção e o corredor de acesso aos escritórios".',
    items: {
      type: 'object', additionalProperties: false, required: ['sku', 'funcao'],
      properties: { sku: str, funcao: str },
    },
  },
} as const

export function schemaPara(secoes: Secao[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: secoes,
    properties: Object.fromEntries(secoes.map(s => [s, SCHEMA_SECAO[s]])),
  }
}

export interface Gerado {
  resumo?: { paragrafos: string[] }
  escopo?: { incluso: string[]; naoIncluso: string[]; condicoes: string[] }
  cenario?: { paragrafos: string[]; vantagens: string[]; beneficios: string[] }
  funcoes?: { sku: string; funcao: string }[]
}

// ── Conversão para o texto que o PDF e a tela já leem ─────────────────────────

/** Limpa o que não pode ir impresso mesmo que o modelo escorregue. */
export function limpar(s: string): string {
  return s
    .replace(/\[[^\]\n]{1,40}\]\s*/g, '')      // [PARÁGRAFO 1], [item]
    .replace(/\*\*|__|^#+\s*/gm, '')           // markdown
    .replace(/^\s*[•\-*]\s+/, '')               // marcador no início
    .replace(/\s+/g, ' ')
    .trim()
}

const bullets = (xs: string[]) => xs.map(limpar).filter(Boolean).map(x => `• ${x}`).join('\n')

export function textoResumo(g: NonNullable<Gerado['resumo']>): string {
  return g.paragrafos.map(limpar).filter(Boolean).join('\n\n')
}

/** Formato lido por parseScopeLines (tela) e pelo PDF. */
export function textoEscopo(g: NonNullable<Gerado['escopo']>): string {
  return [
    'Está incluso:', bullets(g.incluso), '',
    'Não está incluso:', bullets(g.naoIncluso), '',
    'Condições:', bullets(g.condicoes),
  ].join('\n')
}

/** Formato lido por buildScenarioPages no PDF. */
export function textoCenario(g: NonNullable<Gerado['cenario']>): string {
  return [
    g.paragrafos.map(limpar).filter(Boolean).join('\n\n'), '',
    'VANTAGENS TÉCNICAS:', bullets(g.vantagens), '',
    'BENEFÍCIOS PARA O CLIENTE:', bullets(g.beneficios),
  ].join('\n')
}

// ── Conferência ───────────────────────────────────────────────────────────────

export interface Aviso {
  secao: Secao | 'geral'
  nivel: 'erro' | 'atencao'
  texto: string
}

interface PropostaConferencia {
  executiveSummary?: string | null
  scope?: string | null
  scenarioDesc?: string | null
  includeServices?: boolean | null
  items: { role?: string | null; product: { sku: string; name: string; category: string } }[]
}

const PARAGRAFOS_CENARIO = /^(VANTAGENS TÉ?CNICAS?|BENEF[IÍ]CIOS PARA O CLIENTE)[ \t]*:?\s*$/im

/**
 * Regras objetivas antes do PDF (bloco A do Gate de Propostas): o que sai
 * errado impresso e ninguém percebe na tela.
 */
export function conferir(p: PropostaConferencia): Aviso[] {
  const avisos: Aviso[] = []
  const textos: [Secao, string | null | undefined][] = [
    ['resumo', p.executiveSummary], ['escopo', p.scope], ['cenario', p.scenarioDesc],
  ]

  for (const [secao, t] of textos) {
    if (!t?.trim()) {
      avisos.push({ secao, nivel: 'atencao', texto: `${SECAO_LABEL[secao]} vazio — a página sai sem ele` })
      continue
    }
    const colchete = t.match(/\[[^\]\n]{1,40}\]/)
    if (colchete) avisos.push({ secao, nivel: 'erro', texto: `Rótulo entre colchetes vai impresso: "${colchete[0]}"` })
    if (/\*\*|^#{1,6}\s/m.test(t)) avisos.push({ secao, nivel: 'erro', texto: 'Tem marcação markdown (** ou #) que sai impressa' })
    if (/R\$\s?\d/.test(t)) avisos.push({ secao, nivel: 'atencao', texto: 'Cita valor em reais — o investimento tem página própria e pode divergir' })
  }

  if (p.scenarioDesc?.trim()) {
    const narrativa = p.scenarioDesc.split(PARAGRAFOS_CENARIO)[0].trim()
    if (narrativa.length > 3200) {
      avisos.push({ secao: 'cenario', nivel: 'atencao', texto: `Narrativa do cenário com ${narrativa.length} caracteres — vai ocupar mais de uma página` })
    }
    if (!PARAGRAFOS_CENARIO.test(p.scenarioDesc)) {
      avisos.push({ secao: 'cenario', nivel: 'atencao', texto: 'Sem as seções de vantagens e benefícios — a segunda página do cenário não sai' })
    }
  }

  const itens = p.items.filter(i => p.includeServices !== false || !isServico(i.product))
  const semFuncao = itens.filter(i => !i.role?.trim())
  if (itens.length && semFuncao.length) {
    avisos.push({
      secao: 'funcoes', nivel: 'atencao',
      texto: `${semFuncao.length} ${semFuncao.length === 1 ? 'item sem' : 'itens sem'} "Função na solução" — sai "a definir" na BOM técnica`,
    })
  }

  if (!itens.length) avisos.push({ secao: 'geral', nivel: 'erro', texto: 'BOM vazia' })
  return avisos
}
