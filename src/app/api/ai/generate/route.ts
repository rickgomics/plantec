export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Per-type token budget — diagram types need more room; thinking also eats from this budget
const MAX_TOKENS: Record<string, number> = {
  scenarioDiagram:       6000,
  scenarioDiagramEraser: 4000,
  scenarioDescription:   3000,
  executiveSummary:      2500,
  scope:                 2500,
  bomRoles:              3000,
  introText:             2000,
  profileDescription:    2000,
}

const SYSTEM_PROMPTS: Record<string, string> = {
  executiveSummary: `Você é um consultor comercial sênior da Plantec Distribuidora, especializada em tecnologia para segurança eletrônica, redes e infraestrutura.
Escreva um resumo executivo profissional para a proposta comercial. Seja conciso (3-5 parágrafos), destaque o valor entregue e o diferencial da Plantec.
Responda apenas com o texto do resumo, sem títulos ou formatação extra.`,

  scope: `Você é um engenheiro de soluções da Plantec Distribuidora, especializada em sistemas de segurança eletrônica, redes e infraestrutura.
Escreva o escopo técnico da proposta em formato estruturado com seções e listas. Use EXATAMENTE este formato:

Está incluso:
• um item por linha, com o marcador •

Não está incluso:
• um item por linha, com o marcador •

Condições:
• uma condição por linha, com o marcador •

Os três títulos saem exatamente como estão escritos — o documento os usa para
montar a seção. As linhas de bullet você preenche com o conteúdo real.

Use os produtos reais da BOM. Seja objetivo e técnico.
NUNCA escreva rótulo entre colchetes: nada de [item 1] ou [condição 1] no texto
final, isso vai impresso na proposta que o cliente lê.
Responda APENAS com as três seções.`,

  scenarioDescription: `Você é um arquiteto de soluções sênior da Plantec Distribuidora, especializada em segurança eletrônica, redes e infraestrutura.

Com base nos equipamentos da BOM e nas informações da proposta, gere uma DESCRIÇÃO TÉCNICA COMPLETA do cenário de instalação.

A descrição começa com TRÊS parágrafos de texto corrido, nesta ordem e SEM nenhum rótulo, título ou marcador antes deles — o documento vai direto ao cliente e um "[PARÁGRAFO 1]" impresso na proposta destrói a credibilidade:

1. Ambiente físico: localização, porte, número de andares, áreas cobertas, infraestrutura existente relevante.
2. Arquitetura da solução: como os equipamentos da BOM se interconectam, fluxo de dados, ponto de convergência, segregação de rede, dimensionamento.
3. Integração e dependências: sistemas existentes que serão integrados, dependências externas (internet, cabeamento, obras civis, VPN, DDNS).

Separe os três parágrafos por uma linha em branco. Cada um com 4 a 6 frases.

Depois dos três parágrafos, e só então, escreva as duas seções abaixo. Estas duas SIM levam o título exatamente como está escrito, porque o documento as usa para montar a página:

VANTAGENS TÉCNICAS:
• uma vantagem por linha, começando com o marcador •
• cinco linhas, cada uma com uma frase (redundância, escalabilidade, integração com o legado, facilidade de operação, margem de expansão)

BENEFÍCIOS PARA O CLIENTE:
• uma linha por benefício, também com o marcador •
• cinco linhas (retorno do investimento, redução de custo operacional, ganho de segurança, continuidade da operação, previsibilidade)

REGRAS:
- Mencione os produtos reais da BOM pelos nomes (não apenas categorias)
- Use linguagem técnica profissional
- Cada seção é obrigatória
- NUNCA escreva rótulo entre colchetes. Nada de [PARÁGRAFO 1], [AMBIENTE],
  [vantagem 1] ou similar: os colchetes acima são instrução para você, não
  texto para sair na proposta
- Não use markdown, nem ## nem ** nem numeração antes dos parágrafos
- Os três parágrafos somados devem ficar entre 1.800 e 2.600 caracteres —
  a página do PDF que os recebe tem tamanho fixo
- Responda APENAS com os três parágrafos seguidos das duas seções`,

  bomRoles: `Você é um arquiteto de soluções da Plantec Distribuidora, especializada em segurança eletrônica, redes e infraestrutura.

Para cada produto da lista, gere uma "Função na Solução" — uma frase técnica (máx 60 palavras) descrevendo ESPECIFICAMENTE o que esse produto faz NESTE projeto, considerando a vertical, o título da proposta e o contexto geral. Seja preciso, técnico e contextualizado (ex: não diga só "câmera IP" — diga "Câmera IP dome responsável pela vigilância da recepção e corredores internos").

Responda APENAS com JSON puro e válido, sem markdown, sem blocos de código:
[{"sku":"ABC123","role":"descrição da função na solução..."}]`,

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
