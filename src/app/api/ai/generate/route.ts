export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Per-type token budget — diagram types need more room; thinking also eats from this budget
const MAX_TOKENS: Record<string, number> = {
  scenarioDiagram:       6000,
  scenarioDiagramEraser: 4000,
  introText:             2000,
  profileDescription:    2000,
}

// Resumo, escopo, cenário e função na solução saíram daqui em 27/09/2026:
// agora são gerados juntos, com resposta estruturada, em
// /api/proposals/[id]/ai (src/lib/proposalAI.ts). Ficam os diagramas e os
// textos de perfil da empresa.
const SYSTEM_PROMPTS: Record<string, string> = {

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
   - classDef proposed fill:#e0f3f1,stroke:#0b8f88,color:#04322F,font-weight:bold
   - classDef existing fill:#FFF7ED,stroke:#EA580C,color:#431407
   - classDef missing fill:#fff,stroke:#94A3B8,color:#64748B,stroke-dasharray:5 5
   - classDef internet fill:#EFF6FF,stroke:#3B82F6,color:#1E3A5F
8. Aplique as classes nos nós: class NomeDaNó proposed
9. Nomes dos nós: use IDs sem espaços (ex: NVR1, CAM_DOME, SW_CORE) e labels entre colchetes com nome real: NVR1["NVR 32ch Hikvision"]
10. Máximo 25 nós para legibilidade.

RESPONDA APENAS com o código Mermaid puro. Sem blocos de código (sem \`\`\`), sem markdown, sem explicações. Comece com "graph TD" ou "graph LR".`,

  scenarioDiagramEraser: `Você é um arquiteto de redes e segurança eletrônica sênior da Plantec Distribuidora.

Sua tarefa: gerar código Eraser DSL que represente a TOPOLOGIA COMPLETA do cenário técnico, usando os equipamentos da BOM.

Use a sintaxe Eraser DSL:
- Nós: NomeDaEntidade [icon: tipo, label: "Descrição"]
- Conexão direta: A > B
- Conexão rotulada: A > B: "tipo de link"
- Grupo: group NomeDoGrupo { Comp1, Comp2 }
- Título: title Título do Diagrama
- Direção: direction right  (ou down)

Ícones disponíveis: server, database, cloud, users, laptop, smartphone, router, hub, video, lock, shield, wifi, globe, building, cpu, hard-drive

REGRAS:
1. Comece com "title [Nome do Sistema]" e "direction right"
2. Agrupe por função: Cameras, Network, Storage, Access Control, Internet, Existing Systems
3. Inclua os equipamentos PROPOSTOS com quantidade (ex: label: "IP Cameras 4MP (x12)")
4. Inclua sistemas existentes e módulos externos (VPN, DDNS, mobile app)
5. Use inglês para nomes de nós e rótulos (Eraser funciona melhor em inglês)
6. Máximo 20 componentes para legibilidade

RESPONDA APENAS com o código Eraser DSL puro. Sem blocos de código, sem markdown, sem explicações.`,

  introText: `Você é um redator especializado em comunicação corporativa B2B.
Escreva uma introdução institucional para a empresa mencionada, adequada para uma proposta comercial formal.
Seja profissional, destaque credenciais, experiência e diferenciais competitivos.
Responda apenas com o texto da introdução.`,

  profileDescription: `Você é um redator especializado em comunicação corporativa B2B para o mercado de tecnologia.

Com base no conteúdo real extraído do site da empresa, escreva uma descrição institucional profissional para uso em propostas comerciais formais.

DIRETRIZES:
- Escreva exatamente 2 a 3 parágrafos coesos, sem títulos, sem bullets
- Destaque especialidade, experiência de mercado e diferenciais competitivos
- Tom formal, positivo, orientado ao cliente B2B
- Use SOMENTE informações presentes no site — não invente dados, não cite anos ou números que não apareçam no contexto
- Não mencione URLs, e-mails, telefones ou endereços
- Se o conteúdo do site for escasso ou muito genérico, escreva de forma concisa mas sem inventar
- Responda APENAS com o texto da descrição`,
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

    // Trim items list for diagram types to avoid huge prompts (max 20 items, no long descriptions)
    const trimmedContext = { ...context }
    if (Array.isArray(trimmedContext.items)) {
      trimmedContext.items = trimmedContext.items.slice(0, 20).map((i: Record<string, unknown>) => ({
        name: i.name, sku: i.sku, category: i.category,
        brand: i.brand, quantity: i.quantity,
      }))
    }
    // Trim description to avoid token overflow
    if (typeof trimmedContext.description === 'string' && trimmedContext.description.length > 800) {
      trimmedContext.description = trimmedContext.description.slice(0, 800) + '…'
    }

    const userMessage = trimmedContext.description
      ? `Contexto da proposta:\n${JSON.stringify(trimmedContext, null, 2)}`
      : `Gere o conteúdo para:\n${JSON.stringify(trimmedContext, null, 2)}`

    const maxTokens = MAX_TOKENS[type] ?? 2500

    const message = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPTS[type],
      messages: [{ role: 'user', content: userMessage }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    const text = textContent?.type === 'text' ? textContent.text.trim() : ''

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
