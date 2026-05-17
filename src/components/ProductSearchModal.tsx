'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/types'

interface ProductSearchModalProps {
  onClose: () => void
  onAdd: (product: Product, quantity: number) => void
}

type Source = 'local' | 'hub'

export default function ProductSearchModal({ onClose, onAdd }: ProductSearchModalProps) {
  const [source, setSource] = useState<Source>('local')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const categories = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

  const fetchProducts = useCallback(async () => {
    if (source === 'hub' && !search.trim()) {
      setProducts([])
      return
    }
    setLoading(true)
    try {
      let url: string
      if (source === 'hub') {
        url = `/api/plantec/products?s=${encodeURIComponent(search)}&limit=20`
      } else {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (category) params.set('category', category)
        url = `/api/products?${params}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search, category, source])

  useEffect(() => {
    const delay = source === 'hub' ? 600 : 300
    const timer = setTimeout(fetchProducts, delay)
    return () => clearTimeout(timer)
  }, [fetchProducts, source])

  const switchSource = (s: Source) => {
    setSource(s)
    setProducts([])
    setSelected(null)
    setSearch('')
    setCategory('')
    setImportError('')
  }

  const handleAdd = async () => {
    if (!selected) return
    setImportError('')

    if (source === 'local') {
      onAdd(selected, quantity)
      onClose()
      return
    }

    // Hub product: upsert into local DB then add to BOM
    setImporting(true)
    try {
      const createRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selected.sku,
          name: selected.name,
          description: selected.description,
          brand: selected.brand,
          category: selected.category,
          subcategory: selected.subcategory,
          basePrice: selected.basePrice,
          cost: selected.cost,
          stock: selected.stock,
          unit: selected.unit,
          attributes: selected.attributes,
          compatible: selected.compatible,
          required: selected.required,
          suggested: selected.suggested,
        }),
      })

      let localProduct: Product | null = null

      if (createRes.ok) {
        const data = await createRes.json()
        localProduct = data.product
      } else if (createRes.status === 409) {
        // Already exists — find by SKU
        const findRes = await fetch(`/api/products?search=${encodeURIComponent(selected.sku)}`)
        const findData = await findRes.json()
        localProduct = (findData.products as Product[])?.find((p) => p.sku === selected.sku) ?? null
      }

      if (localProduct) {
        onAdd(localProduct, quantity)
        onClose()
      } else {
        setImportError('Não foi possível importar o produto. Tente novamente.')
      }
    } catch {
      setImportError('Erro ao importar produto.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Adicionar Produto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Source toggle */}
        <div className="px-5 pt-3 flex gap-2">
          <button
            onClick={() => switchSource('local')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              source === 'local'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Catálogo Local
          </button>
          <button
            onClick={() => switchSource('hub')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              source === 'hub'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Catálogo Plantec
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b flex gap-3">
          <input
            type="text"
            placeholder={source === 'hub' ? 'Buscar no catálogo Plantec (nome, SKU, atributos)...' : 'Buscar por nome ou SKU...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
            autoFocus
          />
          {source === 'local' && (
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
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Buscando...</div>
          ) : source === 'hub' && !search.trim() ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">Busque no catálogo Plantec</p>
              <p className="text-xs text-gray-400 mt-1">Pesquise por nome, SKU ou atributos do produto</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum produto encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-4 py-2 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço</th>
                  {source === 'local' && (
                    <th className="px-4 py-2 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => { setSelected(p); setImportError('') }}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === p.id
                        ? 'bg-brand-50 ring-1 ring-inset ring-brand-300'
                        : 'hover:bg-brand-50/40'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400 font-semibold">{p.sku}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900 leading-tight">{p.name}</div>
                      {p.brand && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{p.brand}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {Number(p.basePrice) > 0
                        ? `R$ ${Number(p.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : <span className="text-gray-300 font-normal text-xs">sob consulta</span>
                      }
                    </td>
                    {source === 'local' && (
                      <td className="px-4 py-2.5 text-right text-gray-500">{p.stock}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom bar */}
        {selected && (
          <div className={`px-5 py-3 border-t flex items-center gap-4 ${source === 'hub' ? 'bg-brand-50/60' : 'bg-slate-50'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{selected.name}</p>
              <p className="text-xs text-gray-500 font-mono">{selected.sku}</p>
              {importError && <p className="text-xs text-red-500 mt-0.5">{importError}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-sm text-gray-600">Qtd:</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input w-20 text-center"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={importing}
              className="btn-primary shrink-0"
            >
              {importing
                ? 'Importando...'
                : source === 'hub'
                  ? 'Importar e Adicionar'
                  : 'Adicionar'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
