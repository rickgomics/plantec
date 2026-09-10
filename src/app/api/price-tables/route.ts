export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { fetchPriceTables } from '@/lib/pricing'

/** Tabelas de preço disponíveis: preço de tabela + um grupo de cliente cada. */
export async function GET() {
  try {
    return NextResponse.json({ tables: await fetchPriceTables() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
