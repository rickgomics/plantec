'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaPlus, FaEdit, FaTrash, FaBuilding } from 'react-icons/fa'
import LogoUpload from '@/components/LogoUpload'
import toast from 'react-hot-toast'

interface CompanyProfile {
  id: string
  name: string
  type: string
  logoBase64?: string | null
  description?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

const emptyForm: Omit<CompanyProfile, 'id'> = {
  name: '',
  type: 'plantec',
  logoBase64: null,
  description: '',
  website: '',
  phone: '',
  email: '',
  address: '',
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<CompanyProfile, 'id'>>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/company-profiles')
      const data = await res.json()
      setProfiles(data.profiles ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  function openNew() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(p: CompanyProfile) {
    setForm({ name: p.name, type: p.type, logoBase64: p.logoBase64, description: p.description, website: p.website, phone: p.phone, email: p.email, address: p.address })
    setEditId(p.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const url = editId ? `/api/company-profiles/${editId}` : '/api/company-profiles'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success(editId ? 'Perfil atualizado' : 'Perfil criado')
      setShowForm(false)
      loadProfiles()
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir perfil?')) return
    await fetch(`/api/company-profiles/${id}`, { method: 'DELETE' })
    toast.success('Perfil excluído')
    loadProfiles()
  }

  const plantecProfiles = profiles.filter(p => p.type === 'plantec')
  const partnerProfiles = profiles.filter(p => p.type === 'partner')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfis de Empresa</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie perfis para capas e introduções de propostas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FaPlus /> Novo Perfil
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          <ProfileGroup title="Plantec" profiles={plantecProfiles} onEdit={openEdit} onDelete={handleDelete} />
          <ProfileGroup title="Parceiros" profiles={partnerProfiles} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editId ? 'Editar Perfil' : 'Novo Perfil'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="plantec">Plantec</option>
                  <option value="partner">Parceiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome da empresa"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <LogoUpload
                value={form.logoBase64}
                onChange={val => setForm(f => ({ ...f, logoBase64: val }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição institucional</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Sobre a empresa..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 9999-9999" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Cidade, Estado" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
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

function ProfileGroup({ title, profiles, onEdit, onDelete }: {
  title: string
  profiles: CompanyProfile[]
  onEdit: (p: CompanyProfile) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {profiles.length === 0 ? (
        <div className="text-sm text-gray-400 italic py-2">Nenhum perfil cadastrado</div>
      ) : (
        <div className="grid gap-3">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-white border rounded-xl shadow-sm">
              {p.logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoBase64} alt={p.name} className="h-12 w-16 object-contain" />
              ) : (
                <div className="h-12 w-16 flex items-center justify-center bg-gray-100 rounded text-gray-400">
                  <FaBuilding size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.description && <div className="text-sm text-gray-500 truncate">{p.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FaEdit /></button>
                <button onClick={() => onDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
