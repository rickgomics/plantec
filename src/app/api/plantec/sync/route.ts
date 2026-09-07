export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE   = (process.env.MAGENTO_URL  ?? '').replace(/\/$/, '')
const TOKEN  = process.env.MAGENTO_TOKEN ?? ''
const HDRS   = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' }

const SEGMENT_MAP: Record<string, string> = {
  '1': 'Telecom', '2': 'CFTV', '3': 'Redes', '4': 'Alarme', '5': 'CFTV', '6': 'Energia',
}

interface MagentoProduct {
  id: number
  sku: string
  name: string
  price: number
  tier_prices?: { customer_group_id: number; qty: number; value: number }[]
  media_gallery_entries?: { file: string; types: string[]; disabled?: boolean }[]
  custom_attributes?: { attribute_code: string; value: string }[]
}

function attr(p: MagentoProduct, code: string) {
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

function cleanBrand(raw: string): string {
  if (!raw) return raw
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

async function fetchManufacturers(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/rest/V1/products/attributes/manufacturer`, {
      headers: HDRS, signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return {}
    const data = await res.json()
    const map: Record<string, string> = {}
    for (const o of (data.options ?? []) as { value: string; label: string }[]) {
      if (o.value && o.label) map[o.value] = o.label
    }
    return map
  } catch {
    return {}
  }
}

async function fetchPage(page: number, pageSize: number): Promise<MagentoProduct[]> {
  const sp = new URLSearchParams()
  sp.set('searchCriteria[filter_groups][0][filters][0][field]',          'status')
  sp.set('searchCriteria[filter_groups][0][filters][0][value]',          '1')
  sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'eq')
  sp.set('searchCriteria[pageSize]',    String(pageSize))
  sp.set('searchCriteria[currentPage]', String(page))
  sp.set('fields', 'items[id,sku,name,price,tier_prices,media_gallery_entries,custom_attributes]')

  const res = await fetch(`${BASE}/rest/V1/products?${sp}`, {
    headers: HDRS, signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Magento HTTP ${res.status}`)
  const data = await res.json()
  return data.items ?? []
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        if (!BASE || !TOKEN) {
          send({ type: 'error', message: 'Magento não configurado (MAGENTO_URL / MAGENTO_TOKEN)' })
          controller.close()
          return
        }

        // Fetch total count first
        const sp = new URLSearchParams()
        sp.set('searchCriteria[filter_groups][0][filters][0][field]',          'status')
        sp.set('searchCriteria[filter_groups][0][filters][0][value]',          '1')
        sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'eq')
        sp.set('searchCriteria[pageSize]',    '1')
        sp.set('searchCriteria[currentPage]', '1')
        sp.set('fields', 'total_count')

        const countRes = await fetch(`${BASE}/rest/V1/products?${sp}`, {
          headers: HDRS, signal: AbortSignal.timeout(15_000),
        })
        if (!countRes.ok) {
          send({ type: 'error', message: `Magento HTTP ${countRes.status}` })
          controller.close()
          return
        }
        const { total_count: total = 0 } = await countRes.json()

        const pageSize   = 100
        const totalPages = Math.ceil(total / pageSize)

        send({ type: 'start', total, totalPages })

        const mfr = await fetchManufacturers()

        let synced = 0
        let errors = 0

        for (let page = 1; page <= totalPages; page++) {
          if (req.signal.aborted) break

          try {
            const items = await fetchPage(page, pageSize)

            const results = await Promise.allSettled(
              items.map(p => {
                const nseg  = attr(p, 'nsegmento')
                const mfrId = attr(p, 'manufacturer')
                const desc  = attr(p, 'description')
                const image = primaryImage(p)
                const brand = mfr[mfrId] ? cleanBrand(mfr[mfrId]) : null

                return prisma.product.upsert({
                  where: { sku: p.sku },
                  create: {
                    sku:         p.sku,
                    name:        p.name,
                    description: desc ? stripHtml(desc) : null,
                    brand,
                    category:    SEGMENT_MAP[nseg] ?? 'Outros',
                    basePrice:   bestPrice(p.price, p.tier_prices),
                    cost:        0,
                    stock:       0,
                    unit:        'un',
                    active:      true,
                    attributes: {
                      nsegmento:       nseg,
                      manufacturer_id: mfrId,
                      magento_price:   p.price,
                      image_url:       image,
                      ncm:             attr(p, 'ncm'),
                    },
                    compatible: [],
                    required:   [],
                    suggested:  [],
                  },
                  update: {
                    // Preserve local basePrice / cost / stock — update only Magento metadata
                    name:        p.name,
                    description: desc ? stripHtml(desc) : null,
                    brand,
                    category:    SEGMENT_MAP[nseg] ?? 'Outros',
                    attributes: {
                      nsegmento:       nseg,
                      manufacturer_id: mfrId,
                      magento_price:   p.price,
                      image_url:       image,
                      ncm:             attr(p, 'ncm'),
                    },
                  },
                })
              })
            )

            synced += results.filter(r => r.status === 'fulfilled').length
            errors += results.filter(r => r.status === 'rejected').length
          } catch {
            errors += pageSize
          }

          send({ type: 'progress', page, totalPages, synced, errors })
        }

        send({ type: 'done', total, synced, errors })
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache, no-transform',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
