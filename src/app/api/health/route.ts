export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [products, customers, proposals] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.proposal.count(),
    ])
    return NextResponse.json({ ok: true, products, customers, proposals })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
