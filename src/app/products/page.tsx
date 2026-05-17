'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { Product } from '@/types'

const CATEGORIES = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

function marginColor(cost: number, price: number) {
  if (price === 0) return 'text-gray-400'
  const m = ((price - cost) / price) * 100
  if (m >= 15) return 'text-green-600'
  if (m >= 10) return 'text-yellow-600'
  return 'text-red-600'
}

function margin(cost: number, price: number) {
  if (price === 0) return '-'
  return (((price - cost) / price) * 100).toFixed(1) + '%'
}

const emptyForm = {
  sku: '', name: '', description: '', brand: '', category: 'CFTV', subcategory: '',
  basePrice: '', cost: '', stock: '', unit: 'un', active: true,
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-500 text-sm mt-0.5">{products.length} produto(s) encontrado(s)</p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Novo Produto</button>
        </div>

        <div className="card mb-4">
          <div className="flex gap-3 p-4">
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
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Carregando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Preço</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Custo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Margem</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Estoque</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(Number(p.basePrice))}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmt(Number(p.cost))}</td>
                    <td className={`px-4 py-3 text-right font-medium ${marginColor(Number(p.cost), Number(p.basePrice))}`}>
                      {margin(Number(p.cost), Number(p.basePrice))}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs mr-3">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
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
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="active" className="text-sm text-gray-700">Produto ativo</label>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t">
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
