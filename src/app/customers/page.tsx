'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { HiPencilSquare, HiTrash, HiXMark } from 'react-icons/hi2'
import { Customer } from '@/types'

const emptyForm = {
  companyName: '', tradeName: '', cnpj: '', contactName: '',
  email: '', phone: '', city: '', state: 'SP',
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[160, 110, 110, 140, 80, 40, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-gray-100 rounded-full" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(Customer & { _count?: { proposals: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    const res = await fetch(`/api/customers?${p}`)
    const data = await res.json()
    setCustomers(data.customers ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      companyName: c.companyName, tradeName: c.tradeName ?? '',
      cnpj: c.cnpj ?? '', contactName: c.contactName ?? '',
      email: c.email ?? '', phone: c.phone ?? '',
      city: c.city ?? '', state: c.state ?? 'SP',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover cliente?')) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Clientes</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">
              {loading ? 'Carregando...' : `${customers.length} cliente${customers.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Novo Cliente</button>
        </div>

        {/* Filtro */}
        <div className="card mb-4 p-4">
          <input
            className="input max-w-sm"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Razão Social</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cidade/UF</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Propostas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm font-semibold text-gray-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : customers.map((c) => (
                <tr key={c.id} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-gray-900 leading-tight">{c.companyName}</div>
                    {c.tradeName && <div className="text-[11px] text-gray-400 mt-0.5">{c.tradeName}</div>}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-400 font-semibold">{c.cnpj ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{c.contactName ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">{c.email ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 font-medium">
                    {c.city && c.state ? `${c.city}/${c.state}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
                      {c._count?.proposals ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Editar"
                      >
                        <HiPencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {editing ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Razão Social *</label>
                <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome Fantasia</label>
                  <input className="input" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
                </div>
                <div>
                  <label className="label">CNPJ</label>
                  <input className="input" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contato</label>
                  <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">E-mail</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cidade</label>
                  <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="label">UF</label>
                  <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.companyName} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
