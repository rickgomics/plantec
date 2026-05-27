'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Product } from '@/types'
import { HiMagnifyingGlass, HiXMark } from 'react-icons/hi2'

interface ProductSearchModalProps {
  onClose: () => void
  onAdd: (product: Product, quantity: number) => void
}

const CATEGORIES = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

export default function ProductSearchModal({ onClose, onAdd }: ProductSearchModalProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // true = Hub API available, false = use local catalog, null = probing
  const hubAvailable = useRef<boolean | null>(null)
  const [mode, setMode] = useState<'probing' | 'hub' | 'local'>('probing')

  // Probe Hub availability once on mount
  useEffect(() => {
    async function probe() {
      try {
        const r = await fetch('/api/plantec/products?s=.&limit=1')
        const available = r.status !== 503
        hubAvailable.current = available
        setMode(available ? 'hub' : 'local')
      } catch {
        hubAvailable.current = false
        setMode('local')
      }
    }
    probe()
  }, [])

  const fetchProducts = useCallback(async () => {
    if (mode === 'probing') return

    if (mode === 'hub') {
      if (!search.trim()) { setProducts([]); return }
      setLoading(true)
      try {
        const r = await fetch(`/api/plantec/products?s=${encodeURIComponent(search)}&limit=20`)
        const data = r.ok ? await r.json() : { products: [] }
        setProducts(data.products ?? [])
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
      return
    }

    // Local mode
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (category) p.set('category', category)
      const r = await fetch(`/api/products?${p}`)
      const data = await r.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [mode, search, category])

  useEffect(() => {
    const delay = mode === 'hub' ? 500 : 300
    const t = setTimeout(fetchProducts, delay)
    return () => clearTimeout(t)
  }, [fetchProducts, mode])

  const handleAdd = async () => {
    if (!selected) return
    setAddError('')
    setAdding(true)
    try {
      const isHubProduct = selected.id.startsWith('hub_')

      if (!isHubProduct) {
        onAdd(selected, quantity)
        onClose()
        return
      }

      // Hub product: upsert silently into local DB
      const upsertRes = await fetch('/api/products', {
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

      if (upsertRes.ok) {
        const data = await upsertRes.json()
        localProduct = data.product
      } else if (upsertRes.status === 409) {
        const findRes = await fetch(`/api/products?search=${encodeURIComponent(selected.sku)}`)
        const findData = await findRes.json()
        localProduct = (findData.products as Product[])?.find((p) => p.sku === selected.sku) ?? null
      }

      if (localProduct) {
        onAdd(localProduct, quantity)
        onClose()
      } else {
        setAddError('Não foi possível adicionar o produto. Tente novamente.')
      }
    } catch {
      setAddError('Erro ao adicionar produto.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight">Adicionar Produto</h2>
            {mode !== 'probing' && (
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {mode === 'hub' ? 'Catálogo Plantec (API)' : 'Catálogo Local'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={mode === 'hub' ? 'Buscar no catálogo Plantec (nome, SKU, atributos)...' : 'Buscar por nome ou SKU...'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
              className="input pl-9"
              autoFocus
            />
          </div>
          {mode === 'local' && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-44"
            >
              <option value="">Todas categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {mode === 'probing' || loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">{mode === 'probing' ? 'Conectando ao catálogo...' : 'Buscando...'}</span>
            </div>
          ) : mode === 'hub' && !search.trim() ? (
            <div className="py-14 text-center text-gray-400">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <HiMagnifyingGlass className="w-5 h-5 text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Busque no catálogo Plantec</p>
              <p className="text-xs text-gray-400 mt-1">Pesquise por nome, SKU ou atributos do produto</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-gray-400">
              Nenhum produto encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-4 py-2 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço</th>
                  {mode === 'local' && (
                    <th className="px-4 py-2 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => { setSelected(p); setAddError('') }}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === p.id
                        ? 'bg-brand-50 ring-1 ring-inset ring-brand-300'
                        : 'hover:bg-brand-50/40'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400 font-semibold">{p.sku}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900 leading-tight">{p.name}</div>
                      {p.brand && <div className="text-[11px] text-gray-400 mt-0.5">{p.brand}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {Number(p.basePrice) > 0
                        ? `R$ ${Number(p.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : <span className="text-gray-300 font-normal text-xs">sob consulta</span>
                      }
                    </td>
                    {mode === 'local' && (
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
          <div className="px-5 py-3 border-t border-gray-100 bg-slate-50 flex items-center gap-4 rounded-b-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{selected.name}</p>
              <p className="text-xs text-gray-400 font-mono">{selected.sku}</p>
              {addError && <p className="text-xs text-red-500 mt-0.5">{addError}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qtd</label>
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
              disabled={adding}
              className="btn-primary shrink-0 flex items-center gap-2"
            >
              {adding && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
