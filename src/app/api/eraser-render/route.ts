export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export type EraserDiagramType =
  | 'cloud-architecture-diagram'
  | 'sequence-diagram'
  | 'entity-relationship-diagram'
  | 'flowchart-diagram'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ERASER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ERASER_API_KEY not configured' }, { status: 503 })
  }

  const { text, diagramType } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // DSL detection: Eraser DSL uses [icon:], >, <>, direction, title keywords
  // When DSL is detected, omit diagramType — the API auto-detects from syntax.
  // When it's natural language, pass the requested diagramType for AI generation.
  const isDsl = /\[icon:/i.test(text) || /^direction\s/im.test(text) || /^title\s/im.test(text)
  const resolvedType = isDsl ? undefined : (diagramType ?? 'cloud-architecture-diagram')

  const body: Record<string, unknown> = {
    text,
    theme: 'light',
    background: true,
    imageQuality: 3,
  }
  if (resolvedType) body.diagramType = resolvedType

  const eraserRes = await fetch('https://app.eraser.io/api/render/prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!eraserRes.ok) {
    const err = await eraserRes.text()
    return NextResponse.json(
      { error: `Eraser API error ${eraserRes.status}`, detail: err },
      { status: eraserRes.status }
    )
  }

  const data = await eraserRes.json()
  return NextResponse.json({
    imageUrl: data.imageUrl,
    requestId: data.requestId,
    code: data.diagrams?.[0]?.code ?? null,
  })
}
