'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaPlus, FaEdit, FaTrash, FaIndustry } from 'react-icons/fa'
import LogoUpload from '@/components/LogoUpload'
import toast from 'react-hot-toast'

interface Brand {
  id: string
  name: string
  type: string
  active: boolean
  logoBase64?: string | null
  description?: string | null
  website?: string | null
}

const emptyForm: Omit<Brand, 'id'> = {
  name: '',
  type: 'brand',
  active: true,
  logoBase64: null,
  description: '',
  website: '',
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Brand, 'id'>>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadBrands = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles?type=brand`)
      const data = await res.json()
      setBrands(data.profiles ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBrands() }, [loadBrands])

  function openNew() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(b: Brand) {
    setForm({ name: b.name, type: 'brand', active: b.active, logoBase64: b.logoBase64, description: b.description, website: b.website })
    setEditId(b.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const url = editId ? `/api/company-profiles/${editId}` : '/api/company-profiles'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editId ? 'Fabricante atualizado' : 'Fabricante criado')
      setShowForm(false)
      loadBrands()
    } catch {
      toast.error('Erro ao salvar fabricante')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir fabricante?')) return
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/${id}`, { method: 'DELETE' })
    toast.success('Fabricante excluído')
    loadBrands()
  }

  async function toggleActive(b: Brand) {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !b.active }),
    })
    loadBrands()
  }

  const active = brands.filter(b => b.active)
  const inactive = brands.filter(b => !b.active)

  return (
    <div className="shell">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="eyebrow">Configurações</div>
            <h1 className="page-title">Fabricantes Parceiros</h1>
          <p className="text-sm text-ink/55 mt-1.5">Logotipos e descrições exibidos na página de fabricantes das propostas PDF</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold shadow-sm">
          <FaPlus size={12} /> Novo Fabricante
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink/45">Carregando...</div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16 text-ink/45">
          <FaIndustry size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum fabricante cadastrado</p>
          <p className="text-sm mt-1">Clique em &quot;Novo Fabricante&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-bold text-ink/45 uppercase tracking-wider">Ativos — aparecem na proposta</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">{active.length} marcas</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-5">
                {active.map(b => <BrandCard key={b.id} brand={b} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ink/45 uppercase tracking-wider mb-4">
                Inativos — ocultos na proposta ({inactive.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-5">
                {inactive.map(b => <BrandCard key={b.id} brand={b} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editId ? 'Editar Fabricante' : 'Novo Fabricante'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/75 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Intelbras"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <LogoUpload
                value={form.logoBase64}
                onChange={val => setForm(f => ({ ...f, logoBase64: val }))}
              />

              <div>
                <label className="block text-sm font-medium text-ink/75 mb-1">Descrição</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Breve descrição do fabricante e seus produtos..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/75 mb-1">Website</label>
                <input
                  value={form.website ?? ''}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://www.fabricante.com.br"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-ink/75">Exibir na proposta</span>
              </label>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-background">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BrandCard({ brand, onEdit, onDelete, onToggle }: {
  brand: Brand
  onEdit: (b: Brand) => void
  onDelete: (id: string) => void
  onToggle: (b: Brand) => void
}) {
  const site = brand.website?.replace(/^https?:\/\/(www\.)?/, '') ?? ''
  return (
    <div className={`bg-surface border rounded-xl shadow-sm overflow-hidden group flex flex-col transition-all hover:shadow-md ${!brand.active ? 'opacity-50 grayscale' : ''}`}>
      {/* teal accent bar */}
      <div className="h-1 bg-gradient-to-r from-teal-600 to-teal-300" />

      {/* logo area */}
      <div className="h-24 flex items-center justify-center px-5 py-4 bg-surface">
        {brand.logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoBase64} alt={brand.name} className="max-h-14 max-w-full object-contain" />
        ) : (
          <div className="flex items-center justify-center w-16 h-10 rounded-lg bg-ink/5">
            <FaIndustry size={22} className="text-ink/45" />
          </div>
        )}
      </div>

      {/* divider */}
      <div className="h-px bg-ink/5" />

      {/* info */}
      <div className="px-4 pt-3 pb-2 flex-1 flex flex-col">
        <div className="font-black text-sm text-teal-800 leading-tight mb-1">{brand.name}</div>
        {brand.description && (
          <p className="text-xs text-ink/55 leading-relaxed line-clamp-3 flex-1">{brand.description}</p>
        )}
        {site && (
          <div className="text-xs text-teal-600 font-semibold mt-2 pt-2 border-t border-line/10 truncate">
            {site}
          </div>
        )}
      </div>

      {/* actions (hover) */}
      <div className="px-3 pb-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        <button
          onClick={() => onToggle(brand)}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
            brand.active
              ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              : 'bg-ink/5 text-ink/55 hover:bg-ink/10'
          }`}
        >
          {brand.active ? '● Ativo' : '○ Inativo'}
        </button>
        <div className="flex gap-1">
          <button onClick={() => onEdit(brand)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><FaEdit size={12} /></button>
          <button onClick={() => onDelete(brand.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FaTrash size={12} /></button>
        </div>
      </div>
    </div>
  )
}
