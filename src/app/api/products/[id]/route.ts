export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  // Categoria trocada à mão vira classificação "manual": o sync e a
  // classificação automática não a sobrescrevem mais (src/lib/taxonomy.ts).
  let attributes = body.attributes
  if (body.category !== undefined) {
    const atual = await prisma.product.findUnique({
      where: { id: params.id },
      select: { category: true, subcategory: true, attributes: true },
    })
    const sub = body.subcategory || null
    if (atual && (atual.category !== body.category || (atual.subcategory ?? null) !== sub)) {
      const base = (attributes ?? atual.attributes ?? {}) as Prisma.JsonObject
      attributes = {
        ...base,
        classificacao: { category: body.category, subcategory: sub, fonte: 'manual', em: new Date().toISOString() },
      }
    }
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      sku: body.sku,
      name: body.name,
      description: body.description,
      brand: body.brand,
      category: body.category,
      subcategory: body.subcategory === undefined ? undefined : (body.subcategory || null),
      basePrice: body.basePrice,
      cost: body.cost,
      stock: body.stock,
      unit: body.unit,
      active: body.active,
      attributes,
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
