'use client'

import { ProposalItem } from '@/types'

function productImage(item: ProposalItem): string | null {
  return (item.product.attributes as Record<string, unknown> | null)?.image_url as string ?? null
}

function brandHue(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}

function brandInitials(brand: string): string {
  const words = brand.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return brand.slice(0, 2).toUpperCase()
}

function BrandPlaceholder({ brand }: { brand: string }) {
  const hue = brandHue(brand)
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black tracking-tight select-none shrink-0"
      style={{
        backgroundColor: `hsl(${hue} 55% 91%)`,
        color: `hsl(${hue} 55% 28%)`,
        border: `1px solid hsl(${hue} 45% 78% / 0.5)`,
      }}
    >
      {brandInitials(brand)}
    </div>
  )
}

interface BOMTableProps {
  items: ProposalItem[]
  onQuantityChange: (itemId: string, quantity: number) => void
  onDiscountChange: (itemId: string, discount: number) => void
  onPriceChange?: (itemId: string, price: number) => void
  onCostChange?: (itemId: string, cost: number) => void
  onRemove: (itemId: string) => void
  /** id da tabela → nome, para mostrar de onde saiu o preço de cada item */
  tableLabels?: Record<string, string>
  readonly?: boolean
}

/** Rótulo curto da origem do preço, exibido embaixo do valor. */
function origemDoPreco(table: string | null | undefined, labels: Record<string, string>) {
  // Item de antes das tabelas de preço: saiu da regra antiga (menor valor
  // entre todos os grupos), então não pode ser chamado de "tabela da loja".
  if (!table) return { texto: 'preço anterior — atualize', manual: true }
  if (table === 'list') return { texto: 'tabela da loja', manual: false }
  if (table === 'manual') return { texto: 'manual', manual: true }
  return { texto: labels[table] ?? `grupo ${table}`, manual: false }
}

/** Campo de valor que só grava ao sair do campo, e só se o valor mudou. */
function MoneyInput({ value, onCommit, title }: { value: number; onCommit: (v: number) => void; title: string }) {
  return (
    <input
      key={value}
      type="number"
      min={0}
      step={0.01}
      defaultValue={value ? value.toFixed(2) : ''}
      placeholder="0,00"
      title={title}
      onBlur={(e) => {
        const v = parseFloat(e.target.value) || 0
        if (Math.abs(v - value) > 0.004) onCommit(v)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-24 text-right border border-line/15 bg-surface text-ink rounded-lg px-1.5 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
    />
  )
}

function marginBadge(margin: number) {
  if (margin >= 15) return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
  if (margin >= 10) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60'
}

const numInput = 'w-16 text-center border border-line/15 bg-surface text-ink rounded-lg px-1.5 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

export default function BOMTable({
  items,
  onQuantityChange,
  onDiscountChange,
  onPriceChange,
  onCostChange,
  onRemove,
  tableLabels = {},
  readonly = false,
}: BOMTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 text-ink/35">
        <div className="text-5xl mb-3 opacity-40">▦</div>
        <p className="text-sm font-semibold text-ink/45">Nenhum produto na BOM.</p>
        <p className="text-xs text-ink/35 mt-1 font-medium">Clique em &ldquo;+ Adicionar Produto&rdquo; para começar.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background border-b border-line/10">
            <th className="pl-4 pr-1 py-3 w-12" />
            <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">SKU</th>
            <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Produto</th>
            <th className="px-4 py-3 text-center text-[10px] font-black text-ink/45 uppercase tracking-widest">Qtd</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Custo Unit.</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Preço Unit.</th>
            <th className="px-4 py-3 text-center text-[10px] font-black text-ink/45 uppercase tracking-widest">Desc %</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Subtotal</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Margem</th>
            {!readonly && <th className="px-4 py-3 w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/5">
          {items.map((item) => {
            const unitPrice = Number(item.unitPrice)
            const discountAmt = unitPrice * item.quantity * (item.discount / 100)
            const subtotal = unitPrice * item.quantity - discountAmt
            const cost = Number(item.cost) * item.quantity
            const margin = subtotal > 0 ? ((subtotal - cost) / subtotal) * 100 : 0

            const img = productImage(item)

            return (
              <tr key={item.id} className="hover:bg-brand-50/30 transition-colors group">
                <td className="pl-4 pr-1 py-2.5">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={item.product.name}
                      className="w-10 h-10 object-contain rounded-lg bg-background border border-line/10"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <BrandPlaceholder brand={item.product.brand ?? item.product.name} />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink/45 font-semibold">
                  {item.product.sku}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink leading-tight">{item.product.name}</div>
                  <div className="text-[11px] text-ink/45 mt-0.5 font-medium">
                    {item.product.brand} · {item.product.category}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {readonly ? (
                    <span className="font-bold">{item.quantity}</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => onQuantityChange(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className={numInput}
                    />
                  )}
                </td>
                {/* Custo: o Magento não tem custo por SKU, então ele é informado e
                    guardado no item — é o que dá sentido à coluna Margem. */}
                <td className="px-4 py-3 text-right text-ink/65 font-medium">
                  {!readonly && onCostChange ? (
                    <MoneyInput value={Number(item.cost)} onCommit={(v) => onCostChange(item.id, v)} title="Custo unitário" />
                  ) : (
                    <>R$ {Number(item.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-ink/65 font-medium">
                  {!readonly && onPriceChange ? (
                    <MoneyInput value={unitPrice} onCommit={(v) => onPriceChange(item.id, v)} title="Preço unitário — editar marca o item como manual" />
                  ) : (
                    <>R$ {unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                  )}
                  {(() => {
                    const o = origemDoPreco(item.priceTable, tableLabels)
                    return (
                      <div className={`text-[10px] mt-0.5 font-semibold ${o.manual ? 'text-amber-600' : 'text-ink/40'}`}
                        title={item.pricedAt ? `Preço de ${new Date(item.pricedAt).toLocaleString('pt-BR')}` : undefined}>
                        {o.texto}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-center">
                  {readonly ? (
                    <span className="font-semibold">{item.discount > 0 ? `${item.discount}%` : '—'}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.discount}
                      onChange={(e) => onDiscountChange(item.id, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className={numInput}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right font-bold text-ink">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${marginBadge(margin)}`}>
                    {margin.toFixed(1)}%
                  </span>
                </td>
                {!readonly && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-6 h-6 rounded-full text-ink/35 hover:bg-red-50 hover:text-red-500
                                 transition-all text-base leading-none flex items-center justify-center"
                      title="Remover"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
