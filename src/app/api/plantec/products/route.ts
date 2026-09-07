export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { buildSpecAttributes, fetchSpecOptionMaps, type SpecOptionMaps } from '@/lib/magentoSpecs'

// ── Config ────────────────────────────────────────────────────────────────────

const BASE  = (process.env.MAGENTO_URL  ?? '').replace(/\/$/, '')  // https://www.plantec.com
const TOKEN = process.env.MAGENTO_TOKEN ?? ''

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/json',
}

// ── Category mapping ──────────────────────────────────────────────────────────

const SEGMENT_MAP: Record<string, string> = {
  '1': 'Telecom',
  '2': 'CFTV',       // Segurança geral — câmeras, gravadores
  '3': 'Redes',
  '4': 'Alarme',     // Security Intrusão
  '5': 'CFTV',       // Security CFTV
  '6': 'Energia',
}

// ── Manufacturer label cache (in-process, reloads on server restart) ──────────

let mfrCache: Record<string, string> | null = null
// Mesma estratégia do cache de fabricantes: os rótulos das opções da ficha
// técnica não mudam entre buscas, e são ~24 requisições se refeitos toda vez.
let specCache: SpecOptionMaps | null = null

async function getSpecMaps(): Promise<SpecOptionMaps> {
  if (specCache) return specCache
  specCache = await fetchSpecOptionMaps(BASE, HEADERS)
  return specCache
}

async function getManufacturers(): Promise<Record<string, string>> {
  if (mfrCache) return mfrCache
  try {
    const res = await fetch(`${BASE}/rest/V1/products/attributes/manufacturer`, {
      headers: HEADERS, signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return {}
    const data = await res.json()
    const map: Record<string, string> = {}
    for (const o of (data.options ?? []) as { value: string; label: string }[]) {
      if (o.value && o.label) map[o.value] = o.label
    }
    mfrCache = map
    return map
  } catch {
    return {}
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MagentoProduct {
  id: number
  sku: string
  name: string
  price: number
  tier_prices?: { customer_group_id: number; qty: number; value: number }[]
  media_gallery_entries?: { file: string; types: string[]; disabled?: boolean }[]
  custom_attributes?: { attribute_code: string; value: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function attr(p: MagentoProduct, code: string): string {
  return p.custom_attributes?.find(a => a.attribute_code === code)?.value ?? ''
}

function bestPrice(base: number, tiers: MagentoProduct['tier_prices']): number {
  if (!tiers?.length) return base
  const qty1 = tiers.filter(t => t.qty === 1).map(t => t.value)
  return qty1.length ? Math.min(base, ...qty1) : base
}

function primaryImage(p: MagentoProduct): string | null {
  const entry =
    p.media_gallery_entries?.find(m => !m.disabled && m.types?.includes('image') && m.file) ??
    p.media_gallery_entries?.find(m => !m.disabled && m.file)
  return entry ? `${BASE}/media/catalog/product${entry.file}` : null
}

// "INTELBRAS COMUNICAÇÃO" → "Intelbras"  |  "HIKVISION" → "Hikvision"
function cleanBrand(raw: string): string {
  if (!raw) return raw
  // Take only the first word and title-case it (removes division suffixes)
  const first = raw.trim().split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#\d]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

async function fetchStock(sku: string): Promise<number> {
  try {
    const res = await fetch(`${BASE}/rest/V1/stockItems/${encodeURIComponent(sku)}`, {
      headers: HEADERS, signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return 0
    const d = await res.json()
    return Number(d.qty ?? 0)
  } catch {
    return 0
  }
}

function normalize(p: MagentoProduct, mfr: Record<string, string>, qty: number, specMaps: SpecOptionMaps) {
  const nseg  = attr(p, 'nsegmento')
  const mfrId = attr(p, 'manufacturer')
  const desc  = attr(p, 'description')
  const image = primaryImage(p)

  return {
    id:          `magento_${p.sku}`,
    sku:         p.sku,
    name:        p.name,
    description: desc ? stripHtml(desc) : null,
    brand:       mfr[mfrId] ? cleanBrand(mfr[mfrId]) : null,
    category:    SEGMENT_MAP[nseg] ?? 'Outros',
    subcategory: null,
    basePrice:   bestPrice(p.price, p.tier_prices),
    cost:        0,
    stock:       qty,
    unit:        'un',
    active:      true,
    attributes: {
      nsegmento:       nseg,
      manufacturer_id: mfrId,
      magento_price:   p.price,
      image_url:       image,
      ncm:             attr(p, 'ncm'),
      ...buildSpecAttributes(p.custom_attributes, specMaps),
    },
    image,
    compatible: [] as string[],
    required:   [] as string[],
    suggested:  [] as string[],
    createdAt:  new Date(),
    updatedAt:  new Date(),
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('s') ?? searchParams.get('search') ?? '').trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  if (!BASE || !TOKEN) {
    return NextResponse.json(
      { error: 'Magento não configurado (MAGENTO_URL / MAGENTO_TOKEN)' },
      { status: 503 }
    )
  }

  if (!query) return NextResponse.json({ products: [] })

  // (name OR sku LIKE %query%) AND status=1
  const sp = new URLSearchParams()
  sp.set('searchCriteria[filter_groups][0][filters][0][field]',          'name')
  sp.set('searchCriteria[filter_groups][0][filters][0][value]',          `%${query}%`)
  sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'like')
  sp.set('searchCriteria[filter_groups][0][filters][1][field]',          'sku')
  sp.set('searchCriteria[filter_groups][0][filters][1][value]',          `%${query}%`)
  sp.set('searchCriteria[filter_groups][0][filters][1][condition_type]', 'like')
  sp.set('searchCriteria[filter_groups][1][filters][0][field]',          'status')
  sp.set('searchCriteria[filter_groups][1][filters][0][value]',          '1')
  sp.set('searchCriteria[filter_groups][1][filters][0][condition_type]', 'eq')
  sp.set('searchCriteria[pageSize]',    String(limit))
  sp.set('searchCriteria[currentPage]', '1')
  sp.set('fields', 'items[id,sku,name,price,tier_prices,media_gallery_entries,custom_attributes],total_count')

  try {
    const res = await fetch(`${BASE}/rest/V1/products?${sp}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({ error: `Magento ${res.status}: ${body}` }, { status: res.status })
    }

    const data = await res.json()
    const items: MagentoProduct[] = data.items ?? []

    // Manufacturer labels + ficha técnica + stock — all in parallel
    const [mfr, specMaps, stocks] = await Promise.all([
      getManufacturers(),
      getSpecMaps(),
      Promise.all(items.map(item => fetchStock(item.sku))),
    ])

    const products = items.map((item, i) => normalize(item, mfr, stocks[i], specMaps))

    return NextResponse.json({ products, total: data.total_count ?? products.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
