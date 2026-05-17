export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS: Record<string, string> = {
  executiveSummary: `Você é um consultor comercial sênior da Plantec Distribuidora, especializada em tecnologia para segurança eletrônica, redes e infraestrutura.
Escreva um resumo executivo profissional para a proposta comercial. Seja conciso (3-5 parágrafos), destaque o valor entregue e o diferencial da Plantec.
Responda apenas com o texto do resumo, sem títulos ou formatação extra.`,

  scope: `Você é um engenheiro de soluções da Plantec Distribuidora, especializada em sistemas de segurança eletrônica, redes e infraestrutura.
Escreva o escopo técnico da proposta de forma clara e objetiva. Liste os principais entregáveis, o que está incluso e o que não está.
Responda apenas com o texto do escopo, usando listas quando apropriado.`,

  scenarioDiagram: `Você é um arquiteto de soluções especializado em sistemas de segurança eletrônica e redes.
Gere um diagrama Mermaid que represente visualmente o cenário técnico descrito.
Use diagramas de tipo 'graph LR' ou 'graph TD'.
Responda APENAS com o código Mermaid puro, sem blocos de código, sem markdown, sem explicações.
Comece diretamente com "graph " ou "flowchart ".`,

  introText: `Você é um redator especializado em comunicação corporativa B2B.
Escreva uma introdução institucional para a empresa mencionada, adequada para uma proposta comercial formal.
Seja profissional, destaque credenciais, experiência e diferenciais competitivos.
Responda apenas com o texto da introdução.`,
}

export async function POST(req: NextRequest) {
  try {
    const { type, context } = await req.json()

    if (!type || !SYSTEM_PROMPTS[type]) {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const userMessage = context?.description
      ? `Contexto da proposta: ${JSON.stringify(context)}`
      : `Gere o conteúdo para: ${JSON.stringify(context)}`

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPTS[type],
      messages: [{ role: 'user', content: userMessage }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    const text = textContent?.type === 'text' ? textContent.text : ''

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
