'use client'

import { ProposalItem } from '@/types'

interface BOMTableProps {
  items: ProposalItem[]
  onQuantityChange: (itemId: string, quantity: number) => void
  onDiscountChange: (itemId: string, discount: number) => void
  onRemove: (itemId: string) => void
  readonly?: boolean
}

function marginColor(margin: number) {
  if (margin >= 15) return 'text-green-600'
  if (margin >= 10) return 'text-yellow-600'
  return 'text-red-600'
}

export default function BOMTable({
  items,
  onQuantityChange,
  onDiscountChange,
  onRemove,
  readonly = false,
}: BOMTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">📦</div>
        <p className="text-sm">Nenhum produto na BOM. Clique em &ldquo;Adicionar Produto&rdquo;.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Desc %</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Margem</th>
            {!readonly && <th className="px-3 py-2.5"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const unitPrice = Number(item.unitPrice)
            const discountAmt = unitPrice * item.quantity * (item.discount / 100)
            const subtotal = unitPrice * item.quantity - discountAmt
            const cost = Number(item.cost) * item.quantity
            const margin = subtotal > 0 ? ((subtotal - cost) / subtotal) * 100 : 0

            return (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs text-gray-400">
                  {item.product.sku}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-gray-900">{item.product.name}</div>
                  <div className="text-xs text-gray-400">{item.product.brand} · {item.product.category}</div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {readonly ? (
                    <span className="font-medium">{item.quantity}</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => onQuantityChange(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border border-gray-200 rounded px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  R$ {unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {readonly ? (
                    <span>{item.discount > 0 ? `${item.discount}%` : '-'}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.discount}
                      onChange={(e) => onDiscountChange(item.id, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-16 text-center border border-gray-200 rounded px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className={`px-3 py-2.5 text-right font-medium ${marginColor(margin)}`}>
                  {margin.toFixed(1)}%
                </td>
                {!readonly && (
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
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
