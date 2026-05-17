import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { tradeName: { contains: search, mode: 'insensitive' } },
            { cnpj: { contains: search } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { proposals: true } },
    },
    orderBy: { companyName: 'asc' },
  })

  return NextResponse.json({ customers })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const customer = await prisma.customer.create({
    data: {
      companyName: body.companyName,
      tradeName: body.tradeName,
      cnpj: body.cnpj || null,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      city: body.city,
      state: body.state,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
