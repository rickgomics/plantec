export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { byTaxonomyOrder } from '@/lib/taxonomy'

/**
 * Categorias e subcategorias que existem no catálogo, com contagem, na ordem
 * da taxonomia. Alimenta os filtros — antes eram uma lista fixa que deixava
 * 527 produtos (Telecom, Outros, Alarme…) fora do alcance do filtro.
 */
export async function GET() {
  try {
    const rows = await prisma.product.groupBy({
      by: ['category', 'subcategory'],
      _count: { _all: true },
    })
    const map = new Map<string, { category: string; count: number; subs: { name: string; count: number }[] }>()
    for (const r of rows) {
      const c = map.get(r.category) ?? { category: r.category, count: 0, subs: [] }
      c.count += r._count._all
      if (r.subcategory) c.subs.push({ name: r.subcategory, count: r._count._all })
      map.set(r.category, c)
    }
    const categories = Array.from(map.values())
      .sort((a, b) => byTaxonomyOrder(a.category, b.category))
      .map(c => ({ ...c, subs: c.subs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }))
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('GET /api/products/categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
