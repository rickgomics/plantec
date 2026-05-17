export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateRules } from '@/services/ruleEngine'
import { ProposalItem, Rule } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rules = await prisma.rule.findMany({ where: { active: true } })

  const items = proposal.items.map((i) => ({
    ...i,
    unitPrice: Number(i.unitPrice),
    discount: Number(i.discount),
    subtotal: Number(i.subtotal),
    cost: Number(i.cost),
    margin: Number(i.margin),
    product: {
      ...i.product,
      basePrice: Number(i.product.basePrice),
      cost: Number(i.product.cost),
    },
  })) as ProposalItem[]

  const typedRules = rules.map((r) => ({
    ...r,
    type: r.type as Rule['type'],
    condition: r.condition as Record<string, unknown>,
    action: r.action as Record<string, unknown>,
  }))

  const result = evaluateRules(items, typedRules, Number(proposal.discount))
  return NextResponse.json(result)
}
