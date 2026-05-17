export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const category = searchParams.get('category') ?? ''
    const active = searchParams.get('active')

    const products = await prisma.product.findMany({
      where: {
        AND: [
          active !== null ? { active: active === 'true' } : {},
          category ? { category } : {},
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { sku: { contains: search, mode: 'insensitive' } },
                  { brand: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sku,
      name,
      description,
      brand,
      category,
      subcategory,
      basePrice,
      cost,
      stock,
      unit,
      attributes,
      compatible,
      required,
      suggested,
    } = body

    if (!sku || !name || !category) {
      return NextResponse.json(
        { error: 'SKU, name and category are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        brand,
        category,
        subcategory,
        basePrice: basePrice ?? 0,
        cost: cost ?? 0,
        stock: stock ?? 0,
        unit: unit ?? 'un',
        attributes: attributes ?? {},
        compatible: compatible ?? [],
        required: required ?? [],
        suggested: suggested ?? [],
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    }
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
