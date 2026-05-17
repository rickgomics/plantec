export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rules = await prisma.rule.findMany({
    where: { active: true },
    orderBy: { priority: 'desc' },
  })
  return NextResponse.json({ rules })
}
