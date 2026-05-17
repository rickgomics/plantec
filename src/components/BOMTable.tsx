'use client'

import { ProposalItem } from '@/types'

interface BOMTableProps {
  items: ProposalItem[]
  onQuantityChange: (itemId: string, quantity: number) => void
  onDiscountChange: (itemId: string, discount: number) => void
  onRemove: (itemId: string) => void
  readonly?: boolean
}

function marginBadge(margin: number) {
  if (margin >= 15) return 'text-emerald-600 bg-emerald-50'
  if (margin >= 10) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

const numInput = 'w-16 text-center border border-gray-200 rounded-lg px-1.5 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition'

export default function BOMTable({
  items,
  onQuantityChange,
  onDiscountChange,
  onRemove,
  readonly = false,
}: BOMTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 text-gray-300">
        <div className="text-5xl mb-3 opacity-40">▦</div>
        <p className="text-sm font-semibold text-gray-400">Nenhum produto na BOM.</p>
        <p className="text-xs text-gray-300 mt-1 font-medium">Clique em &ldquo;+ Adicionar Produto&rdquo; para começar.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Qtd</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço Unit.</th>
            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Desc %</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem</th>
            {!readonly && <th className="px-4 py-3 w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => {
            const unitPrice = Number(item.unitPrice)
            const discountAmt = unitPrice * item.quantity * (item.discount / 100)
            const subtotal = unitPrice * item.quantity - discountAmt
            const cost = Number(item.cost) * item.quantity
            const margin = subtotal > 0 ? ((subtotal - cost) / subtotal) * 100 : 0

            return (
              <tr key={item.id} className="hover:bg-brand-50/30 transition-colors group">
                <td className="px-4 py-3 font-mono text-[11px] text-gray-400 font-semibold">
                  {item.product.sku}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 leading-tight">{item.product.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
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
                <td className="px-4 py-3 text-right text-gray-600 font-medium">
                  R$ {unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <td className="px-4 py-3 text-right font-bold text-gray-900">
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
                      className="w-6 h-6 rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500
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
