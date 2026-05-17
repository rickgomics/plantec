export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [
    totalProposals,
    draftProposals,
    approvedProposals,
    totalProducts,
    totalCustomers,
    revenueAgg,
    recentProposals,
  ] = await Promise.all([
    prisma.proposal.count(),
    prisma.proposal.count({ where: { status: 'draft' } }),
    prisma.proposal.count({ where: { status: 'approved' } }),
    prisma.product.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.proposal.aggregate({
      _sum: { totalPrice: true },
      where: { status: { in: ['generated', 'sent', 'approved'] } },
    }),
    prisma.proposal.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
  ])

  return NextResponse.json({
    totalProposals,
    draftProposals,
    approvedProposals,
    totalProducts,
    totalCustomers,
    totalRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
    recentProposals,
  })
}
