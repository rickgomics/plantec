export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── Config ────────────────────────────────────────────────────────────────────

const BASE  = (process.env.MAGENTO_URL  ?? '').replace(/\/$/, '')
const TOKEN = process.env.MAGENTO_TOKEN ?? ''

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/json',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MagentoCartItem {
  item_id: number
  sku: string
  name: string
  qty: number
  price: number
  product_type: string
}

interface MagentoAddress {
  region_code?: string
  region?: string
  city?: string
}

interface MagentoCart {
  id: number
  created_at: string
  updated_at: string
  is_active: boolean
  items?: MagentoCartItem[]
  items_count: number
  items_qty: number
  customer?: { id?: number; email?: string; firstname?: string; lastname?: string; group_id?: number }
  customer_is_guest?: number | boolean
  billing_address?: MagentoAddress
  extension_attributes?: {
    shipping_assignments?: { shipping?: { address?: MagentoAddress } }[]
  }
}

interface MagentoTotals {
  grand_total?: number
  subtotal?: number
}

// ── Estratos ──────────────────────────────────────────────────────────────────

type Temperature = 'quente' | 'morno' | 'frio'
type TicketTier   = 'alto' | 'medio' | 'baixo'

const TEMP_WEIGHT:   Record<Temperature, number> = { quente: 3, morno: 2, frio: 1 }
const TICKET_WEIGHT: Record<TicketTier, number>  = { alto: 3, medio: 2, baixo: 1 }

function temperature(updatedAt: string): { temp: Temperature; daysStale: number } {
  const hours = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000
  const daysStale = Math.floor(hours / 24)
  if (hours < 24) return { temp: 'quente', daysStale }
  if (hours < 72) return { temp: 'morno', daysStale }
  return { temp: 'frio', daysStale }
}

function ticketTier(total: number): TicketTier {
  if (total > 10_000) return 'alto'
  if (total >= 2_000) return 'medio'
  return 'baixo'
}

function region(cart: MagentoCart): string | null {
  const addr =
    cart.billing_address ??
    cart.extension_attributes?.shipping_assignments?.[0]?.shipping?.address
  return addr?.region_code || addr?.region || null
}

// ── Magento fetch ─────────────────────────────────────────────────────────────

async function fetchCarts(days: number, limit: number): Promise<MagentoCart[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace('T', ' ')

  const sp = new URLSearchParams()
  sp.set('searchCriteria[filter_groups][0][filters][0][field]',          'is_active')
  sp.set('searchCriteria[filter_groups][0][filters][0][value]',          '1')
  sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'eq')
  sp.set('searchCriteria[filter_groups][1][filters][0][field]',          'items_count')
  sp.set('searchCriteria[filter_groups][1][filters][0][value]',          '0')
  sp.set('searchCriteria[filter_groups][1][filters][0][condition_type]', 'gt')
  sp.set('searchCriteria[filter_groups][2][filters][0][field]',          'updated_at')
  sp.set('searchCriteria[filter_groups][2][filters][0][value]',          since)
  sp.set('searchCriteria[filter_groups][2][filters][0][condition_type]', 'gteq')
  sp.set('searchCriteria[sortOrders][0][field]',     'updated_at')
  sp.set('searchCriteria[sortOrders][0][direction]', 'DESC')
  sp.set('searchCriteria[pageSize]',    String(limit))
  sp.set('searchCriteria[currentPage]', '1')

  const res = await fetch(`${BASE}/rest/V1/carts/search?${sp}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Magento ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.items ?? []
}

async function fetchTotals(cartId: number): Promise<number> {
  try {
    const res = await fetch(`${BASE}/rest/V1/carts/${cartId}/totals`, {
      headers: HEADERS, signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return 0
    const d: MagentoTotals = await res.json()
    return Number(d.grand_total || d.subtotal || 0)
  } catch {
    return 0
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days  = Math.min(Number(searchParams.get('days')  ?? '7'), 90)
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  if (!BASE || !TOKEN) {
    return NextResponse.json(
      { error: 'Magento não configurado (MAGENTO_URL / MAGENTO_TOKEN)' },
      { status: 503 }
    )
  }

  try {
    const carts = await fetchCarts(days, limit)

    const totals = await Promise.all(carts.map(c => fetchTotals(c.id)))

    // Categoria dos itens vem do catálogo local (já sincronizado via /api/plantec/sync)
    // em vez de bater de novo no Magento por SKU.
    const skus = Array.from(new Set(carts.flatMap(c => c.items?.map(i => i.sku) ?? [])))
    const products = skus.length
      ? await prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true, category: true } })
      : []
    const categoryBySku = new Map(products.map(p => [p.sku, p.category]))

    const result = carts.map((cart, i) => {
      const total = totals[i]
      const { temp, daysStale } = temperature(cart.updated_at)
      const tier = ticketTier(total)
      const segments = Array.from(new Set(
        (cart.items ?? []).map(item => categoryBySku.get(item.sku) ?? 'Outros')
      ))

      return {
        id:           cart.id,
        customerId:   cart.customer?.id || null,
        customerName: [cart.customer?.firstname, cart.customer?.lastname].filter(Boolean).join(' ') || null,
        customerEmail: cart.customer?.email || null,
        isGuest:      Boolean(cart.customer_is_guest),
        customerGroupId: cart.customer?.group_id ?? null,
        itemsCount:   cart.items_count,
        itemsQty:     cart.items_qty,
        total,
        temperature:  temp,
        daysStale,
        ticketTier:   tier,
        region:       region(cart),
        segments,
        items: (cart.items ?? []).map(item => ({
          sku: item.sku, name: item.name, qty: item.qty, price: item.price,
        })),
        priorityScore: TEMP_WEIGHT[temp] * TICKET_WEIGHT[tier],
        createdAt: cart.created_at,
        updatedAt: cart.updated_at,
      }
    })

    result.sort((a, b) => b.priorityScore - a.priorityScore || b.total - a.total)

    return NextResponse.json({ carts: result, total: result.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
