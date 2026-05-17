import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      sku: body.sku,
      name: body.name,
      description: body.description,
      brand: body.brand,
      category: body.category,
      subcategory: body.subcategory,
      basePrice: body.basePrice,
      cost: body.cost,
      stock: body.stock,
      unit: body.unit,
      active: body.active,
      attributes: body.attributes,
      compatible: body.compatible,
      required: body.required,
      suggested: body.suggested,
    },
  })
  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
