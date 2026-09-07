export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await prisma.companyProfile.findUnique({ where: { id: params.id } })
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ profile })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, type, active, logoBase64, description, website, phone, email, address } = body

  const profile = await prisma.companyProfile.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(active !== undefined && { active }),
      ...(logoBase64 !== undefined && { logoBase64 }),
      ...(description !== undefined && { description }),
      ...(website !== undefined && { website }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(address !== undefined && { address }),
    },
  })

  return NextResponse.json({ profile })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.companyProfile.update({
    where: { id: params.id },
    data: { active: false },
  })
  return NextResponse.json({ ok: true })
}
