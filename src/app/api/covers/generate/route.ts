export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCoverPrompt } from '@/lib/coverPrompts'

// Modelo de imagem da OpenAI. Configurável porque a família muda de nome com
// mais frequência que o resto da API — se o default sair de linha, troca no
// .env sem mexer no código.
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'

// Capa é A4 em pé; 1024x1536 é a proporção retrato do gpt-image-1.
const SIZE = '1024x1536'

/** As artes vivem no model Template, que existe no schema e não era usado. */
const TEMPLATE_KIND = 'cover-art'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurada no .env' },
      { status: 503 },
    )
  }

  const { vertical, prompt: promptOverride } = await req.json()
  if (!vertical) {
    return NextResponse.json({ error: 'vertical é obrigatório' }, { status: 400 })
  }

  const preset = getCoverPrompt(vertical)
  const prompt = (promptOverride ?? preset?.prompt ?? '').trim()
  if (!prompt) {
    return NextResponse.json(
      { error: `Sem prompt para o segmento "${vertical}"` },
      { status: 400 },
    )
  }

  try {
    // Geração de imagem passa de um minuto com frequência — o default de
    // fetch do Node cortaria antes.
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, prompt, n: 1, size: SIZE, quality: 'high' }),
      signal: AbortSignal.timeout(180_000),
    })

    if (!res.ok) {
      const detalhe = await res.text()
      console.error('[covers/generate] OpenAI', res.status, detalhe.slice(0, 500))
      return NextResponse.json(
        { error: `OpenAI ${res.status}: ${detalhe.slice(0, 200)}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) {
      return NextResponse.json({ error: 'A OpenAI não retornou imagem' }, { status: 502 })
    }

    const dataUri = `data:image/png;base64,${b64}`

    // Uma arte por segmento: regerar substitui a anterior.
    const existente = await prisma.template.findFirst({
      where: { name: `${TEMPLATE_KIND}:${vertical}` },
    })
    const payload = {
      name: `${TEMPLATE_KIND}:${vertical}`,
      version: MODEL,
      active: true,
      content: { vertical, prompt, dataUri, geradoEm: new Date().toISOString() },
    }
    const salvo = existente
      ? await prisma.template.update({ where: { id: existente.id }, data: payload })
      : await prisma.template.create({ data: payload })

    return NextResponse.json({ id: salvo.id, vertical, dataUri })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[covers/generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
