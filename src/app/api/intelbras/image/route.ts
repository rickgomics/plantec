export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const HUB = 'https://engenharia-aplicacao.intelbras.com.br/hub'

// Only allow image assets — reject any other path to prevent open proxy abuse
const ALLOWED_PREFIX = '/assets/img/'

export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get('path') ?? ''

  if (!path.startsWith(ALLOWED_PREFIX)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Normalize: strip any traversal sequences
  const clean = path.replace(/\.\./g, '').replace(/\/+/g, '/')
  if (!clean.startsWith(ALLOWED_PREFIX)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const upstream = await fetch(`${HUB}${clean}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'image/*' },
    })

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/png'
    const body        = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':  contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Length': String(body.byteLength),
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
