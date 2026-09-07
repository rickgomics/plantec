export const dynamic    = 'force-dynamic'
export const maxDuration = 90   // seconds — tool-use loop can be slow

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM = `Você é um especialista em projetos de tecnologia da Plantec Distribuidora — CFTV, redes, infraestrutura, alarmes e controle de acesso.

Dado um texto descrevendo um projeto, necessidade ou Termo de Referência, sua tarefa é:
1. Identificar TODOS os tipos de equipamentos e serviços necessários
2. Usar buscar_produtos para localizar cada tipo no catálogo local
3. Se uma busca retornar vazio, tente termos alternativos (ex: "câmera IP" → "camera", "VIP", "NVR")
4. Selecionar os produtos mais adequados e definir quantidades realistas
5. Responder com JSON estruturado

REGRAS:
- Inclua APENAS produtos efetivamente encontrados via buscar_produtos (nunca invente IDs ou SKUs)
- Quantidade: use o que o projeto menciona; se não especificado, use 1
- Se não encontrar um tipo de produto, omita silenciosamente esse grupo
- Agrupe por função: Câmeras, Gravação, Rede, Infraestrutura, Alarmes, Serviços, etc.

SAÍDA OBRIGATÓRIA:
- Responda APENAS com o objeto JSON abaixo — sem texto antes, sem texto depois, sem markdown, sem blocos de código
- Comece sua resposta imediatamente com { e termine com }

{
  "resumo": "Análise em 1-2 frases do projeto",
  "grupos": [
    {
      "titulo": "Nome do grupo",
      "itens": [
        {
          "productId": "id exato retornado pela busca",
          "sku": "SKU exato retornado",
          "nome": "Nome completo do produto",
          "quantidade": 1,
          "motivo": "Justificativa técnica em até 80 caracteres"
        }
      ]
    }
  ]
}`

// ── Tool definition ────────────────────────────────────────────────────────────

const SEARCH_TOOL: Anthropic.Tool = {
  name: 'buscar_produtos',
  description:
    'Busca produtos no catálogo local da Plantec por nome, SKU, categoria ou características técnicas. Retorna os melhores resultados disponíveis em estoque.',
  input_schema: {
    type: 'object' as const,
    properties: {
      busca:     { type: 'string', description: 'Termo de busca: nome, tecnologia, especificação ou SKU' },
      categoria: { type: 'string', description: 'Filtro opcional por categoria: CFTV, Redes, Infraestrutura, Alarmes, Racks, Nobreaks, Serviços, etc.' },
    },
    required: ['busca'],
  },
}

// ── Catalog search via Prisma ──────────────────────────────────────────────────

async function searchCatalog(query: string, category?: string) {
  const textFilter = {
    OR: [
      { name:        { contains: query, mode: 'insensitive' as const } },
      { sku:         { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { brand:       { contains: query, mode: 'insensitive' as const } },
      { subcategory: { contains: query, mode: 'insensitive' as const } },
    ],
  }

  const catFilter = category
    ? {
        OR: [
          { category:    { contains: category, mode: 'insensitive' as const } },
          { subcategory: { contains: category, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  return prisma.product.findMany({
    where:   { active: true, AND: catFilter ? [textFilter, catFilter] : [textFilter] },
    take:    6,
    select:  { id: true, sku: true, name: true, brand: true, category: true, subcategory: true, basePrice: true, stock: true },
    orderBy: { name: 'asc' },
  })
}

// ── JSON extraction — tolerates preambles, fences and trailing text ───────────

function extractJson(text: string): unknown | null {
  const s = text.trim()

  // 1. Direct parse
  try { return JSON.parse(s) } catch {}

  // 2. Markdown fence  ```json ... ``` or ``` ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]+?)```/)
  if (fence) {
    try { return JSON.parse(fence[1].trim()) } catch {}
  }

  // 3. Find the first { and the last } — handles preamble / postamble text
  const start = s.indexOf('{')
  const end   = s.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }

  return null
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json() as { description?: string }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Descrição do projeto é obrigatória.' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'IA não configurada.' }, { status: 503 })
    }

    type Msg = Anthropic.MessageParam
    const messages: Msg[] = [
      { role: 'user', content: `Projeto a analisar:\n\n${description.trim()}` },
    ]

    let response = await client.messages.create({
      model:      'claude-sonnet-5',
      max_tokens: 4000,
      system:     SYSTEM,
      tools:      [SEARCH_TOOL],
      messages,
    })

    // Tool-use loop — max 15 rounds to avoid runaway cost
    for (let round = 0; round < 15 && response.stop_reason === 'tool_use'; round++) {
      const toolBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
      )

      const toolResults = await Promise.all(
        toolBlocks.map(async (block) => {
          const input    = block.input as { busca: string; categoria?: string }
          const products = await searchCatalog(input.busca, input.categoria)
          return {
            type:        'tool_result' as const,
            tool_use_id: block.id,
            content:     JSON.stringify(
              products.map(p => ({ ...p, basePrice: Number(p.basePrice) }))
            ),
          }
        }),
      )

      messages.push(
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      )

      response = await client.messages.create({
        model:      'claude-sonnet-5',
        max_tokens: 4000,
        system:     SYSTEM,
        tools:      [SEARCH_TOOL],
        messages,
      })
    }

    const textBlock = response.content.find((c): c is Anthropic.TextBlock => c.type === 'text')
    if (!textBlock) {
      return NextResponse.json({ error: 'A IA não retornou resposta de texto.' }, { status: 502 })
    }

    const raw = textBlock.text
    console.log('[AI project-analysis] raw length:', raw.length, '| preview:', raw.slice(0, 200))

    let parsed = extractJson(raw)

    // ── Fallback: retry with explicit JSON instruction + assistant prefill ──────
    if (!parsed) {
      console.warn('[AI project-analysis] First extraction failed — retrying with prefill')
      messages.push(
        { role: 'assistant', content: response.content },
        { role: 'user',      content: 'Responda agora SOMENTE com o objeto JSON, sem nenhum texto antes ou depois. Comece com { e termine com }.' },
      )

      const retryResp = await client.messages.create({
        model:      'claude-sonnet-5',
        max_tokens: 4000,
        system:     SYSTEM,
        tools:      [SEARCH_TOOL],
        messages,
      })

      const retryText = retryResp.content.find((c): c is Anthropic.TextBlock => c.type === 'text')
      if (retryText) {
        console.log('[AI project-analysis] retry raw:', retryText.text.slice(0, 200))
        parsed = extractJson(retryText.text)
      }
    }

    if (!parsed) {
      console.error('[AI project-analysis] JSON extraction failed after retry. raw:\n', raw)
      return NextResponse.json(
        { error: 'Resposta da IA não é JSON válido.', raw: raw.slice(0, 800) },
        { status: 502 },
      )
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[AI project-analysis]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
