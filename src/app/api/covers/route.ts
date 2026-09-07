export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COVER_PROMPTS } from '@/lib/coverPrompts'

/** Artes de capa já geradas, por segmento. */
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
