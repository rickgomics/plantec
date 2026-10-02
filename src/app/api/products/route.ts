export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { classificacaoGuardada } from '@/lib/taxonomy'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const category = searchParams.get('category') ?? ''
    const subcategory = searchParams.get('subcategory') ?? ''
    const active = searchParams.get('active')
    // Paginado quando pedido (tela de Produtos, busca da BOM): antes a lista
    // vinha inteira — 4.470 produtos numa página de 437 mil pixels.
    const page = Math.max(1, Number(searchParams.get('page')) || 0)
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize')) || 50))
    const paginar = searchParams.has('page')

    const where: Prisma.ProductWhereInput = {
    AND: [
      active !== null ? { active: active === 'true' } : {},
      category ? { category } : {},
      subcategory ? { subcategory } : {},
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
    }
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ category: 'asc' }, { name: 'asc' }]

    if (!paginar) {
      const products = await prisma.product.findMany({ where, orderBy })
      return NextResponse.json({ products })
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ])
    return NextResponse.json({ products, total, page, pageSize })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sku: skuInformado,
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
      upsert: doUpsert,
    } = body

    // Produto digitado pelo projetista pode vir sem SKU (ex.: tela de LED sob
    // medida, fora do ERP): recebe um código DIG- único.
    const sku = String(skuInformado ?? '').trim() || `DIG-${Date.now().toString(36).toUpperCase()}`
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // upsert=true: create if new, update metadata if exists (preserves local price/cost/stock)
    if (doUpsert) {
      // Como no sync: o que foi posto à mão no produto que já existe não pode
      // ser apagado por quem o adiciona à BOM pela busca ao vivo do Magento —
      // a ficha do catálogo provisório e a classificação manual/IA.
      const atual = await prisma.product.findUnique({
        where: { sku },
        select: { category: true, subcategory: true, attributes: true },
      })
      const aa = (atual?.attributes ?? {}) as Prisma.JsonObject
      const guardada = classificacaoGuardada(aa)
      const manterClassif = guardada && guardada.fonte !== 'regra'
      const preservar: Prisma.JsonObject = {}
      if (aa.specsManuais === true) {
        preservar.specsManuais = true
        if (aa.specs      != null) preservar.specs      = aa.specs
        if (aa.specsFonte != null) preservar.specsFonte = aa.specsFonte
      }
      if (manterClassif) preservar.classificacao = aa.classificacao
      const keepCat = manterClassif || aa.specsManuais === true

      const product = await prisma.product.upsert({
        where: { sku },
        create: {
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
        update: {
          // Update catalogue metadata but preserve local price / cost / stock
          name,
          description,
          brand,
          category:    keepCat ? atual!.category : category,
          subcategory: keepCat ? atual!.subcategory : subcategory,
          unit: unit ?? 'un',
          attributes: { ...(attributes ?? {}), ...preservar },
        },
      })
      return NextResponse.json({ product }, { status: 200 })
    }

    // Cadastro à mão: a categoria escolhida é classificação manual.
    const attrsNovo = { ...(attributes ?? {}) } as Prisma.JsonObject
    if (!classificacaoGuardada(attrsNovo)) {
      attrsNovo.classificacao = { category, subcategory: subcategory || null, fonte: 'manual', em: new Date().toISOString() }
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        brand,
        category,
        subcategory: subcategory || null,
        basePrice: basePrice ?? 0,
        cost: cost ?? 0,
        stock: stock ?? 0,
        unit: unit ?? 'un',
        attributes: attrsNovo,
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
