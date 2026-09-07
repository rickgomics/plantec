export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const GW_URL = process.env.CUBOS_GATEWAY_URL ?? 'http://localhost:3002'
const GW_KEY = process.env.CUBOS_GATEWAY_KEY ?? ''

export async function GET(req: NextRequest) {
  const sp       = new URL(req.url).searchParams
  const forward  = new URLSearchParams()
  sp.forEach((v, k) => forward.append(k, v))

  try {
    const res = await fetch(`${GW_URL}/cubos/licencas?${forward}`, {
      headers: { 'x-api-key': GW_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
