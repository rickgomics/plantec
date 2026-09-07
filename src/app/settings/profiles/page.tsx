'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaPlus, FaEdit, FaTrash, FaBuilding } from 'react-icons/fa'
import { HiGlobeAlt, HiSparkles, HiPhoto } from 'react-icons/hi2'
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
  const [importingLogo, setImportingLogo] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles`)
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

  async function openEdit(p: CompanyProfile) {
    setEditId(p.id)
    setShowForm(true)
    // Seed form immediately with list data so modal opens fast
    setForm({ name: p.name, type: p.type, logoBase64: p.logoBase64 ?? null, description: p.description ?? '', website: p.website ?? '', phone: p.phone ?? '', email: p.email ?? '', address: p.address ?? '' })
    // Then fetch full record (list may omit heavy fields like logoBase64)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/${p.id}`)
      if (res.ok) {
        const { profile: full } = await res.json()
        setForm({ name: full.name, type: full.type, logoBase64: full.logoBase64 ?? null, description: full.description ?? '', website: full.website ?? '', phone: full.phone ?? '', email: full.email ?? '', address: full.address ?? '' })
      }
    } catch { /* keep the seeded data */ }
  }

  async function scrapeWebsite() {
    const url = form.website?.trim()
    if (!url) { toast.error('Preencha o website primeiro'); return null }
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/scrape?url=${encodeURIComponent(url)}`)
    if (!res.ok) { toast.error('Não foi possível acessar o site'); return null }
    return await res.json() as { title: string; metaDesc: string; logoUrl: string; bodyText: string }
  }

  async function handleImportLogo() {
    setImportingLogo(true)
    try {
      const data = await scrapeWebsite()
      if (!data) return
      if (!data.logoUrl) { toast.error('Nenhum logo encontrado no site'); return }

      const imgRes = await fetch(
        `/api/company-profiles/scrape?url=${encodeURIComponent(form.website!)}&mode=logo&logoUrl=${encodeURIComponent(data.logoUrl)}`
      )
      if (!imgRes.ok) { toast.error('Falha ao baixar o logo'); return }
      const imgData = await imgRes.json() as { dataUri?: string; error?: string }
      if (!imgData.dataUri) { toast.error(imgData.error ?? 'Logo inválido'); return }

      setForm(f => ({ ...f, logoBase64: imgData.dataUri! }))
      toast.success('Logo importado com sucesso')
    } catch {
      toast.error('Erro ao importar logo')
    } finally {
      setImportingLogo(false)
    }
  }

  async function handleGenerateDesc() {
    setGeneratingDesc(true)
    try {
      const data = await scrapeWebsite()
      if (!data) return

      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'profileDescription',
          context: {
            companyName: form.name || data.title,
            website: form.website,
            metaDescription: data.metaDesc,
            siteContent: data.bodyText,
          },
        }),
      })

      if (!aiRes.ok) { toast.error('Erro na geração IA'); return }
      const aiData = await aiRes.json() as { text?: string; error?: string }
      if (!aiData.text) { toast.error(aiData.error ?? 'Resposta vazia'); return }

      setForm(f => ({ ...f, description: aiData.text! }))
      toast.success('Descrição gerada com sucesso')
    } catch {
      toast.error('Erro ao gerar descrição')
    } finally {
      setGeneratingDesc(false)
    }
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
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/company-profiles/${id}`, { method: 'DELETE' })
    toast.success('Perfil excluído')
    loadProfiles()
  }

  const plantecProfiles = profiles.filter(p => p.type === 'plantec')
  const partnerProfiles = profiles.filter(p => p.type === 'partner')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Perfis de Empresa</h1>
          <p className="text-sm text-ink/55 mt-1">Gerencie perfis para capas e introduções de propostas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FaPlus /> Novo Perfil
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink/45">Carregando...</div>
      ) : (
        <div className="space-y-6">
          <ProfileGroup title="Plantec" profiles={plantecProfiles} onEdit={openEdit} onDelete={handleDelete} />
          <ProfileGroup title="Parceiros" profiles={partnerProfiles} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editId ? 'Editar Perfil' : 'Novo Perfil'}</h2>
            </div>
            <div className="p-6 space-y-4">

              {/* ── Tipo + Nome ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink/75 mb-1">Tipo</label>
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
                  <label className="block text-sm font-medium text-ink/75 mb-1">Nome *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome da empresa"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* ── Website + ações IA ── */}
              <div>
                <label className="block text-sm font-medium text-ink/75 mb-1">Website</label>
                <input
                  value={form.website ?? ''}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="ex: institucional.plantec.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />

                {form.website?.trim() && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleImportLogo}
                      disabled={importingLogo || generatingDesc}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-line/15 bg-background hover:bg-brand-50 hover:border-brand-300 text-sm font-medium text-ink/75 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <HiPhoto className="w-4 h-4" />
                      {importingLogo ? 'Importando logo…' : 'Importar logo'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateDesc}
                      disabled={generatingDesc || importingLogo}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-sm font-medium text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <HiSparkles className="w-4 h-4" />
                      {generatingDesc ? 'Gerando descrição…' : 'Gerar descrição com IA'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Logo ── */}
              <LogoUpload
                value={form.logoBase64}
                onChange={val => setForm(f => ({ ...f, logoBase64: val }))}
              />

              {/* ── Descrição ── */}
              <div>
                <label className="block text-sm font-medium text-ink/75 mb-1">Descrição institucional</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Sobre a empresa… ou use 'Gerar descrição com IA' acima."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* ── Contato ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink/75 mb-1">Telefone</label>
                  <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 9999-9999" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/75 mb-1">Email</label>
                  <input value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-ink/75 mb-1">Endereço</label>
                  <input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Cidade, Estado" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
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

function ProfileGroup({ title, profiles, onEdit, onDelete }: {
  title: string
  profiles: CompanyProfile[]
  onEdit: (p: CompanyProfile) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink/55 uppercase tracking-wider mb-3">{title}</h2>
      {profiles.length === 0 ? (
        <div className="text-sm text-ink/45 italic py-2">Nenhum perfil cadastrado</div>
      ) : (
        <div className="grid gap-3">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-4 bg-surface border rounded-xl shadow-sm overflow-hidden">
              <div className="flex-shrink-0 w-14 h-10 flex items-center justify-center bg-background rounded">
                {p.logoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoBase64} alt={p.name} className="max-h-10 max-w-[56px] w-auto h-auto object-contain" />
                ) : (
                  <FaBuilding size={18} className="text-ink/45" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink truncate">{p.name}</div>
                {p.website && <div className="text-xs text-ink/45 truncate">{p.website}</div>}
                {p.description && <div className="text-sm text-ink/55 truncate">{p.description}</div>}
              </div>
              <div className="flex-shrink-0 flex gap-1">
                <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><FaEdit /></button>
                <button onClick={() => onDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Excluir"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
