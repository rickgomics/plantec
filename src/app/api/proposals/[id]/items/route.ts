export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { recalcProposal, itemMath } from '@/lib/recalc'
import { bookFromAttributes, priceFrom, MANUAL_TABLE } from '@/lib/pricing'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { productId, quantity = 1, discount = 0, role, technicalNotes } = body

  const [product, proposal] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.proposal.findUnique({ where: { id: params.id }, select: { priceTable: true } }),
  ])
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Preço pela tabela que o projetista escolheu para esta proposta, a partir
  // do cache do último sync. "Atualizar preços" busca o valor ao vivo.
  const { price: unitPrice, table } = priceFrom(
    bookFromAttributes(product.attributes, Number(product.basePrice)),
    proposal?.priceTable,
  )
  const cost = Number(product.cost)
  const { subtotal, margin } = itemMath(unitPrice, cost, quantity, discount)

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
      priceTable: table,
      pricedAt: new Date(),
    },
    include: { product: true },
  })

  await recalcProposal(params.id)

  return NextResponse.json({ item }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  await prisma.proposalItem.delete({ where: { id: itemId, proposalId: params.id } })
  await recalcProposal(params.id)

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

  // Preço digitado à mão vira "manual": a atualização em lote não o
  // sobrescreve, porque ele pode ser um preço negociado.
  const precoEditado = body.unitPrice !== undefined
  const unitPrice = precoEditado ? Number(body.unitPrice) : Number(existing.unitPrice)
  // O Magento não tem custo, então o custo é informado e guardado aqui.
  const cost = body.cost !== undefined ? Number(body.cost) : Number(existing.cost)
  const newQty = quantity ?? existing.quantity
  const newDisc = discount ?? Number(existing.discount)
  const { subtotal, margin } = itemMath(unitPrice, cost, newQty, newDisc)

  const item = await prisma.proposalItem.update({
    where: { id: itemId },
    data: {
      quantity: newQty,
      unitPrice: new Decimal(unitPrice),
      discount: new Decimal(newDisc),
      subtotal: new Decimal(subtotal),
      cost: new Decimal(cost),
      margin: new Decimal(margin),
      role: role !== undefined ? role : existing.role,
      technicalNotes: technicalNotes !== undefined ? technicalNotes : existing.technicalNotes,
      ...(precoEditado && { priceTable: MANUAL_TABLE, pricedAt: new Date() }),
    },
    include: { product: true },
  })

  await recalcProposal(params.id)

  return NextResponse.json({ item })
}
