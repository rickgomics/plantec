export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COVER_PROMPTS } from '@/lib/coverPrompts'

/** Artes de capa por segmento. */
export async function GET() {
  const rows = await prisma.template.findMany({
    where: { name: { startsWith: 'cover-art:' }, active: true },
  })

  const artes: Record<string, { dataUri: string; prompt: string; geradoEm?: string }> = {}
  for (const r of rows) {
    const c = r.content as { vertical?: string; dataUri?: string; prompt?: string; geradoEm?: string }
    if (c?.vertical && c?.dataUri) {
      artes[c.vertical] = { dataUri: c.dataUri, prompt: c.prompt ?? '', geradoEm: c.geradoEm }
    }
  }

  return NextResponse.json({
    segmentos: COVER_PROMPTS.map(p => ({
      id: p.id,
      label: p.label,
      promptPadrao: p.prompt,
      arte: artes[p.id] ?? null,
    })),
  })
}

const TIPOS = /^data:image\/(jpeg|png|webp);base64,/
/** A arte vai embutida no HTML do PDF: acima disso o documento pesa demais. */
const MAX_BYTES = 3 * 1024 * 1024

/**
 * Troca a arte de capa de um segmento por uma imagem enviada. Substitui a
 * geração pela OpenAI (removida em 27/09/2026): as artes já geradas ficam, e
 * a troca passa a ser por arquivo — uma arte por segmento, como antes.
 */
export async function POST(req: Request) {
  const { vertical, dataUri } = await req.json()
  if (!COVER_PROMPTS.some(p => p.id === vertical)) {
    return NextResponse.json({ error: 'Segmento desconhecido' }, { status: 400 })
  }
  if (typeof dataUri !== 'string' || !TIPOS.test(dataUri)) {
    return NextResponse.json({ error: 'Envie uma imagem JPEG, PNG ou WebP' }, { status: 400 })
  }
  const bytes = Math.floor((dataUri.length - dataUri.indexOf(',') - 1) * 3 / 4)
  if (bytes > MAX_BYTES) {
    return NextResponse.json({ error: 'Imagem acima de 3 MB — o PDF ficaria pesado demais' }, { status: 400 })
  }

  const name = `cover-art:${vertical}`
  const existente = await prisma.template.findFirst({ where: { name } })
  const payload = {
    name,
    version: 'upload',
    active: true,
    content: { vertical, prompt: '', dataUri, geradoEm: new Date().toISOString(), origem: 'upload' },
  }
  const salvo = existente
    ? await prisma.template.update({ where: { id: existente.id }, data: payload })
    : await prisma.template.create({ data: payload })
  return NextResponse.json({ id: salvo.id, vertical })
}
