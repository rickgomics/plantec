'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { HiPencilSquare, HiTrash, HiXMark } from 'react-icons/hi2'
import { Product } from '@/types'

const CATEGORIES = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

function marginColor(cost: number, price: number) {
  if (price === 0) return 'text-gray-400'
  const m = ((price - cost) / price) * 100
  if (m >= 15) return 'text-emerald-600'
  if (m >= 10) return 'text-amber-600'
  return 'text-red-500'
}

function margin(cost: number, price: number) {
  if (price === 0) return '—'
  return (((price - cost) / price) * 100).toFixed(1) + '%'
}

const emptyForm = {
  sku: '', name: '', description: '', brand: '', category: 'CFTV', subcategory: '',
  basePrice: '', cost: '', stock: '', unit: 'un', active: true,
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[60, 160, 90, 80, 80, 55, 40, 50, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-gray-100 rounded-full" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (category) p.set('category', category)
    const res = await fetch(`/api/products?${p}`)
    const data = await res.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }, [search, category])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      sku: p.sku, name: p.name, description: p.description ?? '',
      brand: p.brand ?? '', category: p.category, subcategory: p.subcategory ?? '',
      basePrice: String(p.basePrice), cost: String(p.cost),
      stock: String(p.stock), unit: p.unit, active: p.active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      basePrice: parseFloat(form.basePrice) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
    }
    const url = editing ? `/api/products/${editing.id}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover produto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Produtos</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              {loading ? 'Carregando...' : `${products.length} produto${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Novo Produto</button>
        </div>

        {/* Filtros */}
        <div className="card mb-4 p-4 flex gap-3">
          <input
            className="input flex-1"
            placeholder="Buscar por nome, SKU ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas categorias</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm font-semibold text-gray-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-400 font-semibold">{p.sku}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-gray-900 leading-tight">{p.name}</div>
                    {p.brand && <div className="text-[11px] text-gray-400 mt-0.5">{p.brand}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{p.category}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">{fmt(Number(p.basePrice))}</td>
                  <td className="px-4 py-3.5 text-right text-gray-500 font-medium">{fmt(Number(p.cost))}</td>
                  <td className={`px-4 py-3.5 text-right font-semibold ${marginColor(Number(p.cost), Number(p.basePrice))}`}>
                    {margin(Number(p.cost), Number(p.basePrice))}
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-500 font-medium">{p.stock}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                      p.active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                        : 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200'
                    }`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Editar"
                      >
                        <HiPencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {editing ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">SKU *</label>
                  <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unidade</label>
                  <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Marca</label>
                  <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div>
                  <label className="label">Categoria *</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Preço (R$)</label>
                  <input type="number" step="0.01" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
                </div>
                <div>
                  <label className="label">Custo (R$)</label>
                  <input type="number" step="0.01" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Estoque</label>
                  <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 accent-brand-500" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Produto ativo</label>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.sku || !form.name} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
