export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function generateProposalNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.proposal.count({
    where: {
      number: { startsWith: `PLT-${year}-` },
    },
  })
  const seq = String(count + 1).padStart(3, '0')
  return `PLT-${year}-${seq}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? ''
    const customerId = searchParams.get('customerId') ?? ''
    const search = searchParams.get('search') ?? ''

    const proposals = await prisma.proposal.findMany({
      where: {
        AND: [
          status ? { status } : {},
          customerId ? { customerId } : {},
          search
            ? {
                OR: [
                  { title: { contains: search, mode: 'insensitive' } },
                  { number: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      include: {
        customer: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('GET /api/proposals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, vertical, customerId, executiveSummary, scope, commercialTerms, validityDays } = body

    if (!title || !customerId) {
      return NextResponse.json(
        { error: 'Title and customerId are required' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const number = await generateProposalNumber()

    const proposal = await prisma.proposal.create({
      data: {
        number,
        title,
        vertical: vertical ?? 'Geral',
        customerId,
        executiveSummary: executiveSummary ?? null,
        scope: scope ?? null,
        commercialTerms: commercialTerms ?? null,
        validityDays: validityDays ?? 30,
        status: 'draft',
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    console.error('POST /api/proposals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
