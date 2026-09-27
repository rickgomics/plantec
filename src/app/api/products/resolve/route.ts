export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Casa itens vindos de fora (orçamento do Portal, hub Intelbras) com o catálogo.
 *
 * Só o SKU IGUAL ao código conta como casamento. Antes as importações usavam a
 * busca da tela (contém no nome/SKU/marca/descrição) e pegavam o primeiro
 * resultado — um código parcial ou nome parecido punha o produto errado na BOM
 * sem aviso. Quando não há SKU igual, devolvemos candidatos para o usuário
 * escolher; nunca escolhemos por ele.
 */

const SELECT = {
  id: true, sku: true, name: true, brand: true, category: true, active: true,
} satisfies Prisma.ProductSelect

type Found = Prisma.ProductGetPayload<{ select: typeof SELECT }>

interface Wanted { code?: string; name?: string }

const MAX_CANDIDATES = 5

/** Palavras do nome que ajudam a achar o produto: sem conectivos e sem o "- MARCA" final. */
function nameTokens(name: string): string[] {
  const semMarca = name.replace(/\s+-\s+[^-]+$/, '')
  return semMarca
    .split(/[\s/,()]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !/^(com|para|sem|and|the)$/i.test(t))
    .slice(0, 4)
}

async function resolveOne({ code, name }: Wanted) {
  const c = (code ?? '').trim()

  if (c) {
    const exact = await prisma.product.findMany({
      where: { sku: { equals: c, mode: 'insensitive' } },
      select: SELECT,
      orderBy: { active: 'desc' },
      take: 1,
    })
    if (exact.length) return { match: exact[0], candidates: [] as Found[] }
  }

  const candidates: Found[] = []
  const seen = new Set<string>()
  const push = (list: Found[]) => {
    for (const p of list) {
      if (seen.has(p.id) || candidates.length >= MAX_CANDIDATES) continue
      seen.add(p.id)
      candidates.push(p)
    }
  }

  if (c) {
    push(await prisma.product.findMany({
      where: { sku: { contains: c, mode: 'insensitive' } },
      select: SELECT,
      orderBy: [{ active: 'desc' }, { sku: 'asc' }],
      take: MAX_CANDIDATES,
    }))
  }

  const tokens = nameTokens(name ?? '')
  if (tokens.length && candidates.length < MAX_CANDIDATES) {
    push(await prisma.product.findMany({
      where: { AND: tokens.map(t => ({ name: { contains: t, mode: 'insensitive' as const } })) },
      select: SELECT,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: MAX_CANDIDATES,
    }))
  }

  return { match: null, candidates }
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items?: Wanted[] }
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items é obrigatório' }, { status: 400 })
    }
    const results = await Promise.all(items.map(resolveOne))
    return NextResponse.json({ results })
  } catch (error) {
    console.error('POST /api/products/resolve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
