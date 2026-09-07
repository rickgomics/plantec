'use client'

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  HiPencilSquare, HiTrash, HiXMark, HiArrowPath,
  HiCheckCircle, HiExclamationCircle, HiPhoto,
  HiTag, HiCube, HiCurrencyDollar, HiArchiveBox,
} from 'react-icons/hi2'
import { Product } from '@/types'

const CATEGORIES = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']

function marginColor(cost: number, price: number) {
  if (price === 0) return 'text-ink/45'
  const m = ((price - cost) / price) * 100
  if (m >= 15) return 'text-emerald-600'
  if (m >= 10) return 'text-amber-600'
  return 'text-red-500'
}

function marginPct(cost: number, price: number) {
  if (price === 0) return '—'
  return (((price - cost) / price) * 100).toFixed(1) + '%'
}

const emptyForm = {
  sku: '', name: '', description: '', brand: '', category: 'CFTV', subcategory: '',
  basePrice: '', cost: '', stock: '', unit: 'un', active: true,
}

interface SyncProgress {
  total: number; totalPages: number; page: number
  synced: number; errors: number; errorMessage?: string
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[60, 160, 90, 80, 80, 55, 40, 50, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-ink/5 rounded-full" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

function imageUrl(p: Product): string | null {
  return (p.attributes as Record<string, unknown> | null)?.image_url as string ?? null
}

// ── Product Detail Drawer ──────────────────────────────────────────────────────

function ProductDrawer({ product, onClose, onEdit }: {
  product: Product
  onClose: () => void
  onEdit: () => void
}) {
  const fmt   = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const img   = imageUrl(product)
  const attrs = (product.attributes ?? {}) as Record<string, unknown>
  const cost  = Number(product.cost)
  const price = Number(product.basePrice)
  const mPct  = price > 0 ? (((price - cost) / price) * 100).toFixed(1) + '%' : '—'
  const mColor = marginColor(cost, price)
  const [imgError, setImgError] = useState(false)

  const mVal = price > 0 ? ((price - cost) / price) * 100 : -1
  const mBg  = mVal >= 15 ? 'bg-emerald-50 border-emerald-100'
             : mVal >= 10 ? 'bg-amber-50 border-amber-100'
             : mVal >= 0  ? 'bg-red-50 border-red-100'
             :               'bg-background border-line/10'

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in-right">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-line/10 shrink-0">
          <div className="min-w-0 pr-3">
            <span className="font-mono text-[11px] font-semibold text-ink/45 bg-ink/5 rounded px-1.5 py-0.5">
              {product.sku}
            </span>
            <h2 className="text-base font-black text-ink tracking-tight mt-1.5 leading-snug">
              {product.name}
            </h2>
            {product.brand && (
              <p className="text-sm text-ink/55 font-medium mt-0.5">{product.brand}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/45 hover:text-ink/65 hover:bg-ink/5 transition-colors shrink-0"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Image */}
          <div className="bg-background border-b border-line/10 flex items-center justify-center" style={{ minHeight: 220 }}>
            {img && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={product.name}
                className="max-h-56 max-w-full object-contain p-6"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-ink/35 py-10">
                <HiPhoto className="w-12 h-12" />
                <span className="text-xs font-medium">Sem imagem</span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">

            {/* Financial cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-center">
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Preço</p>
                <p className="text-sm font-black text-brand-700 leading-tight">{fmt(price)}</p>
              </div>
              <div className="rounded-xl bg-background border border-line/10 p-3 text-center">
                <p className="text-[10px] font-black text-ink/45 uppercase tracking-widest mb-1">Custo</p>
                <p className="text-sm font-black text-ink/75 leading-tight">{fmt(cost)}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${mBg}`}>
                <p className="text-[10px] font-black text-ink/45 uppercase tracking-widest mb-1">Margem</p>
                <p className={`text-sm font-black leading-tight ${mColor}`}>{mPct}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <Row icon={<HiTag />} label="Categoria"
                value={`${product.category}${product.subcategory ? ` · ${product.subcategory}` : ''}`}
              />
              <Row icon={<HiCube />} label="Estoque" value={
                <span className={product.stock > 0 ? 'text-emerald-600 font-bold' : 'text-ink/45'}>
                  {product.stock > 0 ? `${product.stock} ${product.unit}` : 'Indisponível'}
                </span>
              } />
              <Row icon={<HiArchiveBox />} label="Unidade" value={product.unit} />
              <Row icon={<HiCurrencyDollar />} label="Status" value={
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  product.active
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                    : 'bg-ink/5 text-ink/55 ring-1 ring-inset ring-gray-200'
                }`}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
              } />
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-[10px] font-black text-ink/45 uppercase tracking-widest mb-2">Descrição</p>
                <p className="text-sm text-ink/65 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Ficha técnica do attribute set do Magento (câmeras, gravadores, switches) */}
            {!!attrs.specs && Object.keys(attrs.specs as Record<string, string>).length > 0 && (
              <div>
                <p className="text-[10px] font-black text-ink/45 uppercase tracking-widest mb-2">Ficha técnica</p>
                <div className="space-y-1.5">
                  {Object.entries(attrs.specs as Record<string, string>).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 text-sm">
                      <span className="text-ink/45 font-medium">{SPEC_LABELS[k] ?? k}</span>
                      <span className="text-ink/75 font-semibold text-xs text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extra attributes from Magento */}
            {(!!attrs.ncm || !!attrs.nsegmento || !!attrs.manufacturer_id) && (
              <div>
                <p className="text-[10px] font-black text-ink/45 uppercase tracking-widest mb-2">Atributos</p>
                <div className="space-y-1.5">
                  {!!attrs.ncm && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink/45 font-medium">NCM</span>
                      <span className="font-mono text-ink/75 text-xs font-semibold">{String(attrs.ncm)}</span>
                    </div>
                  )}
                  {!!attrs.nsegmento && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink/45 font-medium">Segmento</span>
                      <span className="text-ink/75 font-semibold text-xs">{String(attrs.nsegmento)}</span>
                    </div>
                  )}
                  {!!attrs.magento_price && Number(attrs.magento_price) !== price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink/45 font-medium">Preço de tabela</span>
                      <span className="text-ink/75 font-semibold text-xs">{fmt(Number(attrs.magento_price))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-line/10 shrink-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Fechar</button>
          <button onClick={onEdit} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <HiPencilSquare className="w-4 h-4" /> Editar
          </button>
        </div>
      </div>
    </>
  )
}

function Row({ icon, label, value }: { icon: JSX.Element; label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center text-ink/45 shrink-0 [&>svg]:w-4 [&>svg]:h-4">
        {icon}
      </span>
      <span className="text-sm text-ink/45 font-medium w-20 shrink-0">{label}</span>
      <span className="text-sm text-ink font-semibold">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** Rótulos da ficha técnica — espelham SPEC_DEFS em @/lib/magentoSpecs */
const SPEC_LABELS: Record<string, string> = {
  canais: 'Quantidade de canais',
  baias: 'HDs suportados',
  capacidadeMaxima: 'Capacidade máxima total',
  armazenamento: 'Armazenamento',
  ssd: 'Compatibilidade SSD',
  resolucao: 'Resolução de vídeo',
  lente: 'Tamanho da lente',
  anguloDeVisao: 'Ângulo de visão',
  sensor: 'Sensor de imagem',
  visaoNoturna: 'Visão noturna',
  grauDeProtecao: 'Grau de proteção',
  alimentacao: 'Alimentação de entrada',
  zoom: 'Zoom',
  tipoDeCase: 'Tipo de case',
  localDeInstalacao: 'Local de instalação',
  modelo: 'Modelo da câmera',
  smart: 'Smart',
  starlight: 'Função Starlight',
  microfoneEmbutido: 'Microfone embutido',
  wifi: 'Conexão WiFi',
  portas: 'Quantidade de portas',
  portasUplink: 'Portas uplink',
  redeEthernet: 'Rede Ethernet',
  poe: 'Portas PoE',
  gerenciavel: 'Gerenciável',
  protocoloDeVideo: 'Protocolo de vídeo',
  inteligenciaDeVideo: 'Inteligência de vídeo',
  analiseDeVideo: 'Análise de vídeo',
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
  const [detail, setDetail] = useState<Product | null>(null)

  // Sync state
  const [syncOpen, setSyncOpen]     = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0, totalPages: 0, page: 0, synced: 0, errors: 0,
  })
  const esRef = useRef<EventSource | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (category) p.set('category', category)
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products?${p}`)
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
    setDetail(null)
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
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products/${id}`, { method: 'DELETE' })
    setDetail(null)
    load()
  }

  const handleSync = () => {
    if (esRef.current) esRef.current.close()
    setSyncProgress({ total: 0, totalPages: 0, page: 0, synced: 0, errors: 0 })
    setSyncStatus('running')
    setSyncOpen(true)

    const es = new EventSource('/api/plantec/sync')
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'start') {
        setSyncProgress(p => ({ ...p, total: data.total, totalPages: data.totalPages }))
      } else if (data.type === 'progress') {
        setSyncProgress(p => ({ ...p, page: data.page, totalPages: data.totalPages, synced: data.synced, errors: data.errors }))
      } else if (data.type === 'done') {
        setSyncProgress(p => ({ ...p, synced: data.synced, errors: data.errors }))
        setSyncStatus('done')
        es.close()
        load()
      } else if (data.type === 'error') {
        setSyncProgress(p => ({ ...p, errorMessage: data.message }))
        setSyncStatus('error')
        es.close()
      }
    }
    es.onerror = () => {
      setSyncProgress(p => ({ ...p, errorMessage: 'Conexão perdida com o servidor.' }))
      setSyncStatus('error')
      es.close()
    }
  }

  const closeSync = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    setSyncOpen(false)
    setSyncStatus('idle')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const pct = syncProgress.total > 0
    ? Math.round((syncProgress.synced / syncProgress.total) * 100)
    : 0

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Produtos</h1>
            <p className="text-sm text-ink/45 mt-0.5 font-medium">
              {loading ? 'Carregando...' : `${products.length} produto${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              className="btn-secondary flex items-center gap-2"
              title="Importar todos os produtos do catálogo Plantec / Magento"
            >
              <HiArrowPath className="w-4 h-4" />
              Sincronizar Catálogo
            </button>
            <button onClick={openCreate} className="btn-primary">+ Novo Produto</button>
          </div>
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
            <thead className="bg-background border-b border-line/10">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest w-10" />
                <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">SKU</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Produto</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Categoria</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Preço</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Custo</th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Margem</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-ink/45 uppercase tracking-widest">Estoque</th>
                <th className="px-4 py-3 text-center text-[10px] font-black text-ink/45 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm font-semibold text-ink/45">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : products.map((p) => {
                const img = imageUrl(p)
                const isSelected = detail?.id === p.id
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetail(isSelected ? null : p)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-brand-50 ring-1 ring-inset ring-brand-200'
                        : 'hover:bg-brand-50/30'
                    }`}
                  >
                    {/* Thumbnail */}
                    <td className="pl-4 pr-1 py-3">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p.name}
                          className="w-9 h-9 object-contain rounded bg-background border border-line/10"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-ink/5 flex items-center justify-center">
                          <HiPhoto className="w-4 h-4 text-ink/35" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-ink/45 font-semibold">{p.sku}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-ink leading-tight">{p.name}</div>
                      {p.brand && <div className="text-[11px] text-ink/45 mt-0.5">{p.brand}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-ink/55 font-medium">{p.category}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink">{fmt(Number(p.basePrice))}</td>
                    <td className="px-4 py-3.5 text-right text-ink/55 font-medium">{fmt(Number(p.cost))}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold ${marginColor(Number(p.cost), Number(p.basePrice))}`}>
                      {marginPct(Number(p.cost), Number(p.basePrice))}
                    </td>
                    <td className="px-4 py-3.5 text-center text-ink/55 font-medium">{p.stock}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                          : 'bg-ink/5 text-ink/55 ring-1 ring-inset ring-gray-200'
                      }`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Drawer */}
      {detail && (
        <ProductDrawer
          product={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
        />
      )}

      {/* Produto Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line/10 sticky top-0 bg-surface rounded-t-2xl">
              <h2 className="text-base font-black text-ink tracking-tight">
                {editing ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-ink/45 hover:text-ink/65 hover:bg-ink/5 transition-colors"
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
                <label htmlFor="active" className="text-sm font-medium text-ink/75">Produto ativo</label>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-line/10">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.sku || !form.name} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {syncOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line/10">
              <h2 className="text-base font-black text-ink tracking-tight">Sincronizar Catálogo Plantec</h2>
              {syncStatus !== 'running' && (
                <button onClick={closeSync} className="p-1.5 rounded-lg text-ink/45 hover:text-ink/65 hover:bg-ink/5 transition-colors">
                  <HiXMark className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {syncStatus === 'running' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                      <HiArrowPath className="w-4 h-4 text-brand-600 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Importando produtos do Magento...</p>
                      <p className="text-xs text-ink/45 mt-0.5">
                        {syncProgress.total > 0
                          ? `Página ${syncProgress.page} de ${syncProgress.totalPages} · ${syncProgress.total.toLocaleString('pt-BR')} produtos`
                          : 'Conectando ao catálogo...'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-ink/45 mb-1.5 font-medium">
                      <span>{syncProgress.synced.toLocaleString('pt-BR')} importados</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    {syncProgress.errors > 0 && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">
                        {syncProgress.errors} erro{syncProgress.errors !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-ink/45 text-center">
                    Este processo pode levar alguns minutos. Não feche esta janela.
                  </p>
                </div>
              )}
              {syncStatus === 'done' && (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                    <HiCheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-base font-black text-ink">Sincronização concluída!</p>
                    <p className="text-sm text-ink/55 mt-1">
                      <span className="font-bold text-ink">{syncProgress.synced.toLocaleString('pt-BR')}</span> produtos importados
                      {syncProgress.errors > 0 && (
                        <> · <span className="text-amber-600 font-semibold">{syncProgress.errors} erro{syncProgress.errors !== 1 ? 's' : ''}</span></>
                      )}
                    </p>
                  </div>
                  <button onClick={closeSync} className="btn-primary w-full">Fechar</button>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                    <HiExclamationCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-base font-black text-ink">Erro na sincronização</p>
                    <p className="text-sm text-red-600 mt-1">{syncProgress.errorMessage}</p>
                    {syncProgress.synced > 0 && (
                      <p className="text-xs text-ink/45 mt-2">
                        {syncProgress.synced.toLocaleString('pt-BR')} produtos foram importados antes do erro.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={closeSync} className="btn-secondary flex-1">Fechar</button>
                    <button onClick={handleSync} className="btn-primary flex-1">Tentar novamente</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
