export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const profiles = await prisma.companyProfile.findMany({
    where: { active: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ profiles })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, type = 'plantec', logoBase64, description, website, phone, email, address } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const profile = await prisma.companyProfile.create({
    data: { name, type, logoBase64, description, website, phone, email, address },
  })

  return NextResponse.json({ profile }, { status: 201 })
}
