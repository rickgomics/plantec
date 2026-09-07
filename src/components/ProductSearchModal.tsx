'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Product } from '@/types'
import { HiMagnifyingGlass, HiXMark, HiKey } from 'react-icons/hi2'

interface ProductSearchModalProps {
  onClose: () => void
  onAdd: (product: Product, quantity: number) => void
}

const CATEGORIES = ['CFTV', 'Energia', 'Redes', 'Controle de Acesso', 'Cabeamento', 'Nobreaks', 'Racks', 'Serviços']
const LIC_FABRICANTES = ['', '3CX', 'INTELBRAS - COMUNICAÇÃO', 'INTELBRAS - SEGURANÇA ELETRONICA', 'KHOMP - COMUNICAÇÃO', 'SOMA TARIFADOR', 'KHOMP - IOT', 'ALTISTECH']

type Mode = 'probing' | 'magento' | 'local' | 'licencas'

interface LicencaItem {
  chave: number
  codigo: string
  codigoBusca: string | null
  descricao: string
  descricaoResumida: string | null
  fabricante: string | null
  subgrupo: string
  codigoServico: string | null
}

function isExternalProduct(id: string) {
  return id.startsWith('magento_') || id.startsWith('hub_') || id.startsWith('lic_')
}

export default function ProductSearchModal({ onClose, onAdd }: ProductSearchModalProps) {
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('')
  const [licFabricante, setLicFab]  = useState('')
  const [products, setProducts]     = useState<Product[]>([])
  const [licencas, setLicencas]     = useState<LicencaItem[]>([])
  const [licTotal, setLicTotal]     = useState(0)
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState<Product | null>(null)
  const [selectedLic, setSelectedLic] = useState<LicencaItem | null>(null)
  const [quantity, setQuantity]     = useState(1)
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState('')

  const magentoAvailable = useRef<boolean | null>(null)
  const [mode, setMode] = useState<Mode>('probing')

  useEffect(() => {
    async function probe() {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/plantec/products?s=.&limit=1`)
        const available = r.status !== 503
        magentoAvailable.current = available
        setMode(available ? 'magento' : 'local')
      } catch {
        magentoAvailable.current = false
        setMode('local')
      }
    }
    probe()
  }, [])

  // ── Catalog fetch ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (mode === 'probing' || mode === 'licencas') return

    if (mode === 'magento') {
      if (!search.trim()) { setProducts([]); return }
      setLoading(true)
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/plantec/products?s=${encodeURIComponent(search)}&limit=20`)
        const data = r.ok ? await r.json() : { products: [] }
        setProducts(data.products ?? [])
      } catch { setProducts([]) }
      finally { setLoading(false) }
      return
    }

    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (search)   p.set('search',   search)
      if (category) p.set('category', category)
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products?${p}`)
      const data = await r.json()
      setProducts(data.products ?? [])
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }, [mode, search, category])

  useEffect(() => {
    const delay = mode === 'magento' ? 500 : 300
    const t = setTimeout(fetchProducts, delay)
    return () => clearTimeout(t)
  }, [fetchProducts, mode])

  // ── Licenças fetch ─────────────────────────────────────────────────────────
  const fetchLicencas = useCallback(async () => {
    if (mode !== 'licencas') return
    setLoading(true)
    try {
      const p = new URLSearchParams({ pageSize: '60' })
      if (search.trim())  p.set('q',          search.trim())
      if (licFabricante)  p.set('fabricante',  licFabricante)
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/licencas?${p}`)
      const data = r.ok ? await r.json() : { items: [], total: 0 }
      setLicencas(data.items ?? [])
      setLicTotal(data.total ?? 0)
    } catch { setLicencas([]); setLicTotal(0) }
    finally { setLoading(false) }
  }, [mode, search, licFabricante])

  useEffect(() => {
    const t = setTimeout(fetchLicencas, 400)
    return () => clearTimeout(t)
  }, [fetchLicencas])

  // Trigger initial load when entering licencas mode
  useEffect(() => {
    if (mode === 'licencas') fetchLicencas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Mode change ────────────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    setMode(m)
    setSearch('')
    setProducts([])
    setLicencas([])
    setSelected(null)
    setSelectedLic(null)
    setAddError('')
  }

  // ── Add product ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setAddError('')
    setAdding(true)
    try {
      // ── Licença product: upsert then add ────────────────────────────────
      if (mode === 'licencas' && selectedLic) {
        const payload = {
          sku:         selectedLic.codigo,
          name:        selectedLic.descricao,
          description: selectedLic.descricaoResumida ?? '',
          brand:       selectedLic.fabricante ?? '',
          category:    'Licenças',
          subcategory: selectedLic.subgrupo,
          basePrice:   0,
          cost:        0,
          stock:       0,
          unit:        'un',
          attributes:  { codigo_servico: selectedLic.codigoServico },
          compatible:  [],
          required:    [],
          suggested:   [],
          upsert:      true,
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          onAdd(data.product, quantity)
          onClose()
        } else {
          setAddError('Não foi possível salvar a licença. Tente novamente.')
        }
        return
      }

      if (!selected) return

      // Local product: add directly
      if (!isExternalProduct(selected.id)) {
        onAdd(selected, quantity)
        onClose()
        return
      }

      // Magento product: upsert first
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku:         selected.sku,
          name:        selected.name,
          description: selected.description,
          brand:       selected.brand,
          category:    selected.category,
          subcategory: selected.subcategory,
          basePrice:   selected.basePrice,
          cost:        selected.cost,
          stock:       selected.stock,
          unit:        selected.unit,
          attributes:  selected.attributes,
          compatible:  selected.compatible,
          required:    selected.required,
          suggested:   selected.suggested,
          upsert:      true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onAdd(data.product, quantity)
        onClose()
      } else {
        setAddError('Não foi possível salvar o produto. Tente novamente.')
      }
    } catch {
      setAddError('Erro ao adicionar produto.')
    } finally {
      setAdding(false)
    }
  }

  const imageUrl = (p: Product): string | null =>
    (p.attributes as Record<string, unknown> | null)?.image_url as string ?? null

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const hasSelection = mode === 'licencas' ? !!selectedLic : !!selected

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line/10">
          <h2 className="text-base font-black text-ink tracking-tight">Adicionar Produto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/45 hover:text-ink/65 hover:bg-ink/5 transition-colors">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Source tabs */}
        {mode !== 'probing' && (
          <div className="flex px-5 pt-3 gap-1 border-b border-line/10 pb-0">
            {magentoAvailable.current && (
              <button
                onClick={() => switchMode('magento')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                  mode === 'magento'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-900/20'
                    : 'border-transparent text-ink/45 hover:text-ink/65'
                }`}
              >
                Catálogo Plantec
              </button>
            )}
            <button
              onClick={() => switchMode('local')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                mode === 'local'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-900/20'
                  : 'border-transparent text-ink/45 hover:text-ink/65'
              }`}
            >
              Catálogo Local
            </button>
            <button
              onClick={() => switchMode('licencas')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                mode === 'licencas'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-900/20'
                  : 'border-transparent text-ink/45 hover:text-ink/65'
              }`}
            >
              <HiKey className="w-3.5 h-3.5" />
              Licenças de Software
            </button>
          </div>
        )}

        {/* Search / filters */}
        <div className="px-5 py-3 border-b border-line/10 flex gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/45" />
            <input
              type="text"
              placeholder={
                mode === 'licencas'
                  ? 'Buscar licença por nome ou código...'
                  : mode === 'magento'
                  ? 'Buscar por nome ou SKU no catálogo Plantec...'
                  : 'Buscar por nome ou SKU...'
              }
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); setSelectedLic(null) }}
              className="input pl-9"
              autoFocus
            />
          </div>
          {mode === 'local' && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-44">
              <option value="">Todas categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {mode === 'licencas' && (
            <select value={licFabricante} onChange={(e) => setLicFab(e.target.value)} className="input w-48 text-xs">
              <option value="">Todos fabricantes</option>
              {LIC_FABRICANTES.slice(1).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {mode === 'probing' || loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-ink/45">
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">
                {mode === 'probing' ? 'Conectando ao catálogo...' : 'Buscando...'}
              </span>
            </div>
          ) : mode === 'licencas' ? (
            licencas.length === 0 ? (
              <div className="py-10 text-center text-sm font-semibold text-ink/45">
                {search.trim() ? 'Nenhuma licença encontrada.' : 'Digite um termo ou selecione um fabricante para buscar.'}
              </div>
            ) : (
              <>
                {licTotal > licencas.length && (
                  <p className="px-4 py-2 text-[11px] text-ink/45 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/40">
                    Mostrando {licencas.length} de {licTotal} — refine a busca para ver mais.
                  </p>
                )}
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b border-line/10">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Código</th>
                      <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Descrição</th>
                      <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Fabricante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/5">
                    {licencas.map((lic) => (
                      <tr
                        key={lic.chave}
                        onClick={() => { setSelectedLic(lic); setAddError('') }}
                        className={`cursor-pointer transition-colors ${
                          selectedLic?.chave === lic.chave
                            ? 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-inset ring-brand-300 dark:ring-brand-700'
                            : 'hover:bg-brand-50/40 dark:hover:bg-brand-900/15'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px] text-ink/45 font-semibold whitespace-nowrap">{lic.codigo}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-ink leading-tight text-xs">{lic.descricao}</div>
                          <div className="text-[10px] text-ink/45 mt-0.5">{lic.subgrupo}</div>
                        </td>
                        <td className="px-4 py-2.5 text-ink/55 text-xs whitespace-nowrap">{lic.fabricante ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )
          ) : mode === 'magento' && !search.trim() ? (
            <div className="py-14 text-center text-ink/45">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <HiMagnifyingGlass className="w-5 h-5 text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-ink/55">Busque no catálogo Plantec</p>
              <p className="text-xs text-ink/45 mt-1">5.000+ produtos com preços B2B e estoque em tempo real</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-ink/45">
              Nenhum produto encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b border-line/10">
                <tr>
                  {mode === 'magento' && (
                    <th className="pl-4 pr-2 py-2 w-10" />
                  )}
                  <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">SKU</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Produto</th>
                  <th className="px-4 py-2 text-left text-[10px] font-black text-ink/45 uppercase tracking-widest">Categoria</th>
                  <th className="px-4 py-2 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Preço B2B</th>
                  <th className="px-4 py-2 text-right text-[10px] font-black text-ink/45 uppercase tracking-widest">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/5">
                {products.map((p) => {
                  const img = imageUrl(p)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => { setSelected(p); setAddError('') }}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === p.id
                          ? 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-inset ring-brand-300 dark:ring-brand-700'
                          : 'hover:bg-brand-50/40 dark:hover:bg-brand-900/15'
                      }`}
                    >
                      {mode === 'magento' && (
                        <td className="pl-4 pr-2 py-2">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={p.name}
                              className="w-9 h-9 object-contain rounded bg-background border border-line/10"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-ink/5" />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-ink/45 font-semibold">{p.sku}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-ink leading-tight">{p.name}</div>
                        {p.brand && <div className="text-[11px] text-ink/45 mt-0.5">{p.brand}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-ink/55 text-xs">{p.category}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink">
                        {Number(p.basePrice) > 0
                          ? `R$ ${fmt(Number(p.basePrice))}`
                          : <span className="text-ink/35 font-normal text-xs">sob consulta</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {p.stock > 0
                          ? <span className="text-emerald-600 font-semibold">{p.stock}</span>
                          : <span className="text-ink/35 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom bar */}
        {hasSelection && (
          <div className="px-5 py-3 border-t border-line/10 bg-background flex items-center gap-4 rounded-b-2xl">
            {mode === 'licencas' && selectedLic ? (
              <>
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <HiKey className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{selectedLic.descricao}</p>
                  <p className="text-xs text-ink/45 font-mono">{selectedLic.codigo} · {selectedLic.fabricante}</p>
                  {addError && <p className="text-xs text-red-500 mt-0.5">{addError}</p>}
                </div>
              </>
            ) : selected ? (
              <>
                {imageUrl(selected) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(selected)!}
                    alt={selected.name}
                    className="w-10 h-10 object-contain rounded bg-surface border border-line/15 shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{selected.name}</p>
                  <p className="text-xs text-ink/45 font-mono">{selected.sku}</p>
                  {addError && <p className="text-xs text-red-500 mt-0.5">{addError}</p>}
                </div>
              </>
            ) : null}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-semibold text-ink/55 uppercase tracking-wider">Qtd</label>
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
