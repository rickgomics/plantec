export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

interface HubProduct {
  id?: string | number
  sku?: string
  codigo?: string
  code?: string
  name?: string
  nome?: string
  title?: string
  description?: string
  descricao?: string
  short_description?: string
  brand?: string
  marca?: string
  manufacturer?: string
  category?: string
  categoria?: string
  category_name?: string
  price?: number
  preco?: number
  basePrice?: number
  sale_price?: number
  regular_price?: number
  cost?: number
  custo?: number
  stock?: number
  estoque?: number
  stock_quantity?: number
  unit?: string
  unidade?: string
  attributes?: Record<string, unknown>
  atributos?: Record<string, unknown>
  meta?: Record<string, unknown>
}

function normalizeProduct(p: HubProduct, idx: number) {
  const sku = String(p.sku ?? p.codigo ?? p.code ?? `HUB-${idx}`)
  const basePrice =
    p.price ?? p.preco ?? p.basePrice ?? p.sale_price ?? p.regular_price ?? 0
  const attrs = p.attributes ?? p.atributos ?? p.meta ?? {}

  return {
    id: `hub_${sku}`,
    sku,
    name: p.name ?? p.nome ?? p.title ?? sku,
    description: p.description ?? p.short_description ?? p.descricao ?? null,
    brand: p.brand ?? p.marca ?? p.manufacturer ?? null,
    category: p.category ?? p.category_name ?? p.categoria ?? 'Outros',
    subcategory: null,
    basePrice: Number(basePrice),
    cost: Number(p.cost ?? p.custo ?? 0),
    stock: Number(p.stock ?? p.estoque ?? p.stock_quantity ?? 0),
    unit: String(p.unit ?? p.unidade ?? 'un'),
    active: true,
    attributes: typeof attrs === 'object' && attrs !== null ? attrs : {},
    compatible: [] as string[],
    required: [] as string[],
    suggested: [] as string[],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const s = searchParams.get('s') ?? ''
  const limit = searchParams.get('limit') ?? '20'

  const hubUrl = process.env.PLANTEC_HUB_URL
  const hubToken = process.env.PLANTEC_HUB_TOKEN

  if (!hubUrl || !hubToken) {
    return NextResponse.json({ error: 'Hub API not configured' }, { status: 503 })
  }

  if (!s.trim()) {
    return NextResponse.json({ products: [] })
  }

  try {
    const url = `${hubUrl}/api/ai/products?s=${encodeURIComponent(s)}&limit=${limit}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${hubToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Plantec Hub]', res.status, text.slice(0, 200))
      return NextResponse.json({ error: `Hub API error: ${res.status}` }, { status: res.status })
    }

    const raw = await res.json()

    // Handle multiple response shapes
    let items: HubProduct[]
    if (Array.isArray(raw)) {
      items = raw
    } else if (Array.isArray(raw.data)) {
      items = raw.data
    } else if (Array.isArray(raw.products)) {
      items = raw.products
    } else if (Array.isArray(raw.items)) {
      items = raw.items
    } else if (Array.isArray(raw.results)) {
      items = raw.results
    } else {
      items = []
    }

    const products = items.map((p, i) => normalizeProduct(p, i))

    return NextResponse.json({ products })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Plantec Hub]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
