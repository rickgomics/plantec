export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { productId, quantity = 1, discount = 0, role, technicalNotes } = body

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const unitPrice = Number(product.basePrice)
  const cost = Number(product.cost)
  const discountAmt = unitPrice * quantity * (discount / 100)
  const subtotal = unitPrice * quantity - discountAmt
  const margin = subtotal > 0 ? ((subtotal - cost * quantity) / subtotal) * 100 : 0

  const item = await prisma.proposalItem.create({
    data: {
      proposalId: params.id,
      productId,
      quantity,
      unitPrice: new Decimal(unitPrice),
      discount: new Decimal(discount),
      subtotal: new Decimal(subtotal),
      cost: new Decimal(cost),
      margin: new Decimal(margin),
      role: role ?? null,
      technicalNotes: technicalNotes ?? null,
    },
    include: { product: true },
  })

  return NextResponse.json({ item }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  await prisma.proposalItem.delete({ where: { id: itemId, proposalId: params.id } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { itemId, quantity, discount, role, technicalNotes } = body
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  const existing = await prisma.proposalItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  })
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const unitPrice = Number(existing.unitPrice)
  const cost = Number(existing.cost)
  const newQty = quantity ?? existing.quantity
  const newDisc = discount ?? Number(existing.discount)
  const discountAmt = unitPrice * newQty * (newDisc / 100)
  const subtotal = unitPrice * newQty - discountAmt
  const margin = subtotal > 0 ? ((subtotal - cost * newQty) / subtotal) * 100 : 0

  const item = await prisma.proposalItem.update({
    where: { id: itemId },
    data: {
      quantity: newQty,
      discount: new Decimal(newDisc),
      subtotal: new Decimal(subtotal),
      margin: new Decimal(margin),
      role: role !== undefined ? role : existing.role,
      technicalNotes: technicalNotes !== undefined ? technicalNotes : existing.technicalNotes,
    },
    include: { product: true },
  })

  return NextResponse.json({ item })
}
