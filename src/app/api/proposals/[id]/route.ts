export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
        coverProfile: true,
        introProfile: true,
      },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('GET /api/proposals/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const {
      title,
      vertical,
      status,
      executiveSummary,
      scope,
      commercialTerms,
      validityDays,
      discount,
      totalCost,
      totalPrice,
      totalDiscount,
      margin,
      notes,
      coverProfileId,
      introProfileId,
      scenarioDesc,
      scenarioDiagram,
    } = body

    const proposal = await prisma.proposal.update({
      where: { id: params.id },
      data: {
        title,
        vertical,
        status,
        executiveSummary,
        scope,
        commercialTerms,
        validityDays,
        discount,
        totalCost,
        totalPrice,
        totalDiscount,
        margin,
        notes,
        coverProfileId: coverProfileId !== undefined ? coverProfileId : undefined,
        introProfileId: introProfileId !== undefined ? introProfileId : undefined,
        scenarioDesc: scenarioDesc !== undefined ? scenarioDesc : undefined,
        scenarioDiagram: scenarioDiagram !== undefined ? scenarioDiagram : undefined,
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        coverProfile: true,
        introProfile: true,
      },
    })

    return NextResponse.json({ proposal })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    console.error('PUT /api/proposals/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.proposal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    console.error('DELETE /api/proposals/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
