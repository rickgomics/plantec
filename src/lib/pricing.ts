/**
 * Tabelas de preço da Plantec, lidas do Magento.
 *
 * A loja tem um preço de tabela (`price`) e, por cima dele, um tier price de
 * quantidade 1 para cada grupo de cliente (DIS-4, A1-3DIAMANTE, DISTRIB_OURO…).
 * O mesmo produto varia até ~15% entre grupos. Antes o app gravava o MENOR
 * valor de todos os grupos, sem saber para quem era a proposta — agora o
 * projetista escolhe a tabela e cada item guarda de qual tabela saiu.
 */

const BASE = (process.env.MAGENTO_URL ?? '').replace(/\/$/, '')
const HDRS = {
  Authorization: `Bearer ${process.env.MAGENTO_TOKEN ?? ''}`,
  Accept: 'application/json',
}

/** Preço de tabela da loja, sem grupo. É o default quando nada foi escolhido. */
export const LIST_TABLE = 'list'
/** Preço digitado à mão no item. Atualização em lote não mexe nele. */
export const MANUAL_TABLE = 'manual'

export interface PriceBook {
  /** `price` do Magento */
  list: number
  /** grupo de cliente → preço de quantidade 1 */
  tiers: Record<string, number>
}

export interface PriceTable {
  id: string
  label: string
}

type TierPrice = { customer_group_id: number; qty: number; value: number }

/** Só os tier prices de quantidade 1 — é o preço unitário daquele grupo. */
export function tiersOf(tiers: TierPrice[] | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of tiers ?? []) {
    if (t.qty <= 1 && t.value > 0) out[String(t.customer_group_id)] = t.value
  }
  return out
}

/** Livro de preços a partir do cache gravado em Product.attributes pelo sync. */
export function bookFromAttributes(attrs: unknown, basePrice: number): PriceBook {
  const a = (attrs ?? {}) as { magento_price?: number; tierPrices?: Record<string, number> }
  return {
    list: Number(a.magento_price ?? basePrice) || Number(basePrice) || 0,
    tiers: a.tierPrices ?? {},
  }
}

/**
 * Resolve o preço de um produto numa tabela. Se o produto não tem preço
 * naquele grupo, cai no preço de tabela — e avisa, porque o projetista
 * precisa saber que aquele item não seguiu a tabela escolhida.
 */
export function priceFrom(book: PriceBook, table: string | null | undefined) {
  const t = table || LIST_TABLE
  if (t !== LIST_TABLE && book.tiers[t] != null) {
    return { price: book.tiers[t], table: t, fallback: false }
  }
  return { price: book.list, table: LIST_TABLE, fallback: t !== LIST_TABLE }
}

/** Preços ao vivo no Magento, para uma lista de SKUs, em lotes de 50. */
export async function fetchPriceBooks(skus: string[]): Promise<Record<string, PriceBook>> {
  const out: Record<string, PriceBook> = {}
  const unicos = Array.from(new Set(skus.filter(Boolean)))

  for (let i = 0; i < unicos.length; i += 50) {
    const lote = unicos.slice(i, i + 50)
    const sp = new URLSearchParams()
    sp.set('searchCriteria[filter_groups][0][filters][0][field]', 'sku')
    sp.set('searchCriteria[filter_groups][0][filters][0][value]', lote.join(','))
    sp.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'in')
    sp.set('searchCriteria[pageSize]', String(lote.length))
    sp.set('fields', 'items[sku,price,tier_prices]')

    const res = await fetch(`${BASE}/rest/V1/products?${sp}`, {
      headers: HDRS,
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Magento HTTP ${res.status}`)
    const data = await res.json()
    for (const p of (data.items ?? []) as { sku: string; price: number; tier_prices?: TierPrice[] }[]) {
      out[p.sku] = { list: Number(p.price) || 0, tiers: tiersOf(p.tier_prices) }
    }
  }
  return out
}

let tablesCache: { at: number; tables: PriceTable[] } | null = null

/**
 * Tabelas disponíveis = grupos de cliente do Magento. Ficam de fora os quatro
 * grupos de fábrica do Magento (NOT LOGGED IN, Default, Wholesale, Retailer),
 * que não têm tier price na Plantec, e grupos de teste.
 */
export async function fetchPriceTables(): Promise<PriceTable[]> {
  if (tablesCache && Date.now() - tablesCache.at < 60 * 60 * 1000) return tablesCache.tables

  const sp = new URLSearchParams({ 'searchCriteria[pageSize]': '200' })
  const res = await fetch(`${BASE}/rest/V1/customerGroups/search?${sp}`, {
    headers: HDRS,
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Magento HTTP ${res.status}`)
  const data = await res.json()

  const grupos = ((data.items ?? []) as { id: number; code: string }[])
    .filter(g => g.id > 3 && !/^teste/i.test(g.code))
    .map(g => ({ id: String(g.id), label: g.code.replace(/^\d+\|/, '') }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const tables = [{ id: LIST_TABLE, label: 'Preço de tabela (loja)' }, ...grupos]
  tablesCache = { at: Date.now(), tables }
  return tables
}
