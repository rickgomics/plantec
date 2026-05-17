export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS: Record<string, string> = {
  executiveSummary: `Você é um consultor comercial sênior da Plantec Distribuidora, especializada em tecnologia para segurança eletrônica, redes e infraestrutura.
Escreva um resumo executivo profissional para a proposta comercial. Seja conciso (3-5 parágrafos), destaque o valor entregue e o diferencial da Plantec.
Responda apenas com o texto do resumo, sem títulos ou formatação extra.`,

  scope: `Você é um engenheiro de soluções da Plantec Distribuidora, especializada em sistemas de segurança eletrônica, redes e infraestrutura.
Escreva o escopo técnico da proposta em formato estruturado com seções e listas. Use EXATAMENTE este formato:

Está incluso:
• [item 1]
• [item 2]
• ...

Não está incluso:
• [item 1]
• [item 2]
• ...

Condições:
• [condição 1]
• ...

Use os produtos reais da BOM. Seja objetivo e técnico. Responda APENAS com o texto formatado acima.`,

  scenarioDescription: `Você é um arquiteto de soluções sênior da Plantec Distribuidora, especializada em segurança eletrônica, redes e infraestrutura.

Com base nos equipamentos da BOM e nas informações da proposta, gere uma DESCRIÇÃO TÉCNICA do cenário de instalação.

REGRAS:
1. Descreva o ambiente físico típico para a vertical e porte do cliente
2. Mencione como os equipamentos da BOM se interconectam (use os nomes reais dos produtos)
3. Identifique sistemas existentes que precisam ser integrados ou preservados
4. Indique dependências externas: internet, nuvem, cabeamento, obras civis
5. Seja objetivo: 2-3 parágrafos curtos, linguagem técnica profissional

Responda APENAS com o texto da descrição, sem títulos ou formatação extra.`,

  scenarioDiagram: `Você é um arquiteto de redes e segurança eletrônica sênior da Plantec Distribuidora.

Sua tarefa: gerar um diagrama Mermaid que represente a TOPOLOGIA COMPLETA do cenário técnico descrito, usando os equipamentos da BOM e conectando-os a sistemas existentes e externos.

REGRAS OBRIGATÓRIAS:
1. Use APENAS "graph TD" (top-down) ou "graph LR" (left-right) — escolha com base na complexidade.
2. Agrupe equipamentos em subgraph por FUNÇÃO (ex: subgraph Câmeras, subgraph Rede, subgraph Armazenamento, subgraph Controle de Acesso, subgraph Internet, subgraph Sistemas Existentes).
3. Inclua os equipamentos PROPOSTOS (da BOM) com seus nomes reais e quantidades.
4. Inclua SISTEMAS EXISTENTES mencionados na descrição (rede atual, internet, servidor, sistema de terceiros).
5. Inclua MÓDULOS EXTERNOS ou de INTEGRAÇÃO necessários mas não listados (ex: PoE switch externo, cabeamento, DDNS, VPN, aplicativo mobile) — use estilo tracejado: nomeDoNo:::missing.
6. Use SETAS ROTULADAS para indicar o tipo de conexão: -->|"PoE"| ou -->|"Fibra"| ou -->|"IP/LAN"| ou -->|"VPN"| ou -->|"RS-485"| etc.
7. Use classDef para destacar visualmente:
   - classDef proposed fill:#E6F5F4,stroke:#00928E,color:#002827,font-weight:bold
   - classDef existing fill:#FFF7ED,stroke:#EA580C,color:#431407
   - classDef missing fill:#fff,stroke:#94A3B8,color:#64748B,stroke-dasharray:5 5
   - classDef internet fill:#EFF6FF,stroke:#3B82F6,color:#1E3A5F
8. Aplique as classes nos nós: class NomeDaNó proposed
9. Nomes dos nós: use IDs sem espaços (ex: NVR1, CAM_DOME, SW_CORE) e labels entre colchetes com nome real: NVR1["NVR 32ch Hikvision"]
10. Máximo 25 nós para legibilidade.

RESPONDA APENAS com o código Mermaid puro. Sem blocos de código (sem \`\`\`), sem markdown, sem explicações. Comece com "graph TD" ou "graph LR".`,

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
      ? `Contexto da proposta:\n${JSON.stringify(context, null, 2)}`
      : `Gere o conteúdo para:\n${JSON.stringify(context, null, 2)}`

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
