'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/types'

interface ProductSearchModalProps {
  onClose: () => void
  onAdd: (product: Product, quantity: number) => void
}

export default function ProductSearchModal({ onClose, onAdd }: ProductSearchModalProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  const categories = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  const handleAdd = () => {
    if (selected) {
      onAdd(selected, quantity)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Adicionar Produto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-5 py-3 border-b flex gap-3">
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
            autoFocus
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input w-44"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Buscando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum produto encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Preço</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === p.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-400' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      R$ {Number(p.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="px-5 py-3 border-t bg-blue-50 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.sku}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Qtd:</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input w-20 text-center"
              />
            </div>
            <button onClick={handleAdd} className="btn-primary">
              Adicionar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
