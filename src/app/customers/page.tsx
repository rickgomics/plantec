'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { Customer } from '@/types'

const emptyForm = {
  companyName: '', tradeName: '', cnpj: '', contactName: '',
  email: '', phone: '', city: '', state: 'SP',
}

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500 text-sm mt-0.5">{customers.length} cliente(s)</p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Novo Cliente</button>
        </div>

        <div className="card mb-4 p-4">
          <input
            className="input max-w-sm"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Carregando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Razão Social</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Cidade/UF</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Propostas</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.companyName}</div>
                      {c.tradeName && <div className="text-xs text-gray-400">{c.tradeName}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.cnpj ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.contactName ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.city && c.state ? `${c.city}/${c.state}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {c._count?.proposals ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-xs mr-3">Editar</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
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
            <div className="flex gap-3 justify-end px-5 py-4 border-t">
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
