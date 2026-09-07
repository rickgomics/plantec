'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  HiXMark, HiMagnifyingGlass, HiPlus, HiCheck,
  HiChevronDown, HiChevronUp, HiFunnel, HiArrowLeft, HiArrowRight,
} from 'react-icons/hi2'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterOption  = { value: string; label: string }
type FilterDef     = { key: string; label: string; options: FilterOption[]; singleSelect?: boolean }
type FlagDef       = { key: string; label: string }

type CategoryDef = {
  label:         string
  icon:          string
  endpoint:      string
  filters:       FilterDef[]
  flags:         FlagDef[]
  summaryFields: [string, string][]
  wizardKeys?:   string[]   // keys that are "required" for this category to load
}

export type IntelbrasProduct = {
  id:             number
  codigo_produto: string
  cod_produto?:   string
  produto?:       string
  modelo?:        string
  phaseout:       boolean
  tags:           string[]
  imagem_url:     string | null
  [key: string]:  unknown
}

// ── Category map ──────────────────────────────────────────────────────────────

const CATS: Record<string, CategoryDef> = {
  vip: {
    label: 'Câmeras Fixas', icon: '📷', endpoint: 'vip',
    filters: [
      { key: 'resolucao_mp', label: 'Resolução', options: [
        { value: '1', label: 'HD' }, { value: '2', label: '2 MP' }, { value: '4', label: '4 MP' },
        { value: '5', label: '5 MP' }, { value: '8', label: '8 MP' }, { value: '12', label: '12 MP' }, { value: '16', label: '16 MP' },
      ]},
      { key: 'lente_tipo', label: 'Lente', options: [
        { value: 'Fixa', label: 'Fixa' }, { value: 'Fisheye', label: 'Fisheye' },
        { value: 'Motorizada', label: 'Motorizada' }, { value: 'Varifocal', label: 'Varifocal' },
      ]},
      { key: 'dist_ir_m', label: 'Alcance IR', options: [
        { value: '10', label: '10 m' }, { value: '20', label: '20 m' }, { value: '25', label: '25 m' },
        { value: '30', label: '30 m' }, { value: '40', label: '40 m' }, { value: '50', label: '50 m' },
        { value: '60', label: '60 m' }, { value: '100', label: '100 m' }, { value: '120', label: '120 m' },
      ]},
    ],
    flags: [
      { key: 'analise_comportamental', label: 'Análise comportamental' },
      { key: 'deteccao_face',          label: 'Detecção de face' },
      { key: 'reconhecimento_facial',  label: 'Reconhecimento facial' },
      { key: 'linha_virtual',          label: 'Linha virtual' },
      { key: 'cerca_virtual',          label: 'Cerca virtual' },
      { key: 'objeto_abandonado',      label: 'Objeto abandonado' },
      { key: 'detect_ronda',           label: 'Detecção de ronda' },
      { key: 'aglomeracao',            label: 'Aglomeração' },
      { key: 'contagem_pessoa',        label: 'Contagem de pessoas' },
      { key: 'mapa_calor',             label: 'Mapa de calor' },
      { key: 'audio',                  label: 'Áudio' },
      { key: 'alarme',                 label: 'Alarme' },
      { key: 'lpr',                    label: 'Leitura de placas' },
      { key: 'em_linha',               label: 'Em linha' },
    ],
    summaryFields: [['Resolução', 'resolucao_formatada'], ['Lente', 'lente_tipo'], ['IR', 'dist_ir_formatada']],
  },
  sd: {
    label: 'Speed Dome', icon: '🎥', endpoint: 'sd',
    filters: [], flags: [],
    summaryFields: [['Resolução', 'resolucao_formatada'], ['Zoom', 'zoom_otico']],
  },
  termicas: {
    label: 'Térmicas', icon: '🌡️', endpoint: 'termicas',
    filters: [], flags: [],
    summaryFields: [['Resolução', 'resolucao_formatada']],
  },
  faciais: {
    label: 'Faciais', icon: '👤', endpoint: 'faciais',
    filters: [], flags: [],
    summaryFields: [['Faces', 'capacidade_facial_formatada']],
  },
  nvr: {
    label: 'NVR', icon: '🖥️', endpoint: 'nvr',
    filters: [
      { key: 'canais', label: 'Canais', options: [
        { value: '4', label: '4 ch' }, { value: '8', label: '8 ch' },
        { value: '16', label: '16 ch' }, { value: '32', label: '32 ch' }, { value: '64', label: '64 ch' },
      ]},
      { key: 'qtd_hds', label: 'Qtd. HDs', options: [
        { value: '1', label: '1 HD' }, { value: '2', label: '2 HDs' },
        { value: '4', label: '4 HDs' }, { value: '8', label: '8 HDs' },
      ]},
    ],
    flags: [
      { key: 'ia',           label: 'Detecção inteligente' },
      { key: 'ivs',          label: 'IVS' },
      { key: 'poe',          label: 'Portas PoE' },
      { key: 'gravacao_16mp', label: 'Gravação 16 MP' },
      { key: 'planificacao', label: 'Planificação' },
    ],
    summaryFields: [['Canais', 'canais'], ['HDs', 'qtd_hds'], ['Throughput', 'throughput']],
  },
  dvr: {
    label: 'DVR', icon: '📼', endpoint: 'dvr',
    filters: [
      { key: 'canais', label: 'Canais', options: [
        { value: '4', label: '4 ch' }, { value: '8', label: '8 ch' },
        { value: '16', label: '16 ch' }, { value: '32', label: '32 ch' },
      ]},
      { key: 'linha', label: 'Linha', options: [
        { value: 'MHDX', label: 'MHDX' }, { value: 'IMHDX', label: 'IMHDX' },
      ]},
      { key: 'resolucao', label: 'Resolução máx.', options: [
        { value: '1080', label: 'Até 1080p' }, { value: '5MP', label: 'Até 5 MP' },
        { value: '6MP', label: 'Até 6 MP' },   { value: '4K', label: 'Até 4K' },
      ]},
    ],
    flags: [
      { key: 'ia',     label: 'Detecção inteligente' },
      { key: 'ivs',    label: 'IVS' },
      { key: 'ssd',    label: 'SSD compatível' },
      { key: 'gigabit', label: 'Gigabit' },
    ],
    summaryFields: [['Canais', 'canais'], ['Resolução', 'resolucao_max']],
  },
  alarmes: {
    label: 'Alarmes', icon: '🔔', endpoint: 'alarmes',
    filters: [
      { key: 'zona_com_fio', label: 'Zonas com fio', options: [
        { value: '0', label: 'Nenhuma' }, { value: '4', label: '4' }, { value: '12', label: '12' },
        { value: '24', label: '24' }, { value: '64', label: '64' },
      ]},
      { key: 'zona_sem_fio', label: 'Zonas sem fio', options: [
        { value: '20', label: '20' }, { value: '24', label: '24' },
        { value: '48', label: '48' }, { value: '64', label: '64' },
      ]},
      { key: 'particoes', label: 'Partições', options: [
        { value: '1', label: '1' }, { value: '2', label: '2' },
        { value: '4', label: '4' }, { value: '16', label: '16' },
      ]},
    ],
    flags: [
      { key: 'monitorada',      label: 'Monitorada (Contact ID)' },
      { key: 'teclado',         label: 'Teclado incluso' },
      { key: 'receptor',        label: 'Receptor embutido' },
      { key: 'controle_remoto', label: 'Controle remoto' },
    ],
    summaryFields: [['Fio', 'zona_com_fio'], ['Sem fio', 'zona_sem_fio'], ['Partições', 'particoes']],
  },
  nobreaks: {
    label: 'Nobreaks', icon: '⚡', endpoint: 'nobreaks',
    filters: [
      { key: 'potencia_va', label: 'Potência', options: [
        { value: '600', label: '600 VA' }, { value: '700', label: '700 VA' },
        { value: '1000', label: '1 kVA' }, { value: '1200', label: '1,2 kVA' },
        { value: '1500', label: '1,5 kVA' }, { value: '3000', label: '3 kVA' },
        { value: '6000', label: '6 kVA' }, { value: '10000', label: '10 kVA' },
      ]},
      { key: 'topologia_grupo', label: 'Topologia', options: [
        { value: 'Interativo', label: 'Interativo' },
        { value: 'Online', label: 'Online dupla conversão' },
      ]},
      { key: 'onda_grupo', label: 'Onda', options: [
        { value: 'Senoidal', label: 'Senoidal' },
        { value: 'Semissenoidal', label: 'Semissenoidal' },
      ]},
    ],
    flags: [],
    summaryFields: [['Potência', 'potencia_va_formatada'], ['Topologia', 'topologia_grupo']],
  },
  eletrificadores: {
    label: 'Eletrificadores', icon: '⚡', endpoint: 'eletrificadores',
    filters: [], flags: [],
    summaryFields: [],
  },
  switches: {
    label: 'Switches', icon: '🔀', endpoint: 'switches',
    wizardKeys: ['alimentacao', 'poe'],
    filters: [
      { key: 'alimentacao', label: 'Alimentação', singleSelect: true, options: [
        { value: 'AC', label: 'AC' },
        { value: 'DC', label: 'DC' },
      ]},
      { key: 'poe', label: 'PoE', singleSelect: true, options: [
        { value: 'SIM', label: 'Com PoE' },
        { value: 'NAO', label: 'Sem PoE' },
      ]},
      { key: 'poe_faixa', label: 'Potência PoE', singleSelect: true, options: [
        { value: 'ATE_370W', label: 'Até 370 W' },
        { value: 'ACIMA_370W', label: 'Acima de 370 W' },
      ]},
    ],
    flags: [
      { key: 'fonte_redundante', label: 'Fonte redundante' },
      { key: 'ospf_rip',        label: 'OSPF / RIP' },
      { key: 'mpls',            label: 'MPLS' },
      { key: 'mp_bgp',          label: 'MP-BGP' },
    ],
    summaryFields: [
      ['Uplink', 'portas_uplink'],
      ['Downlink', 'portas_downlink'],
    ],
  },
  servicos: {
    label: 'Serviços SVA', icon: '🛠️', endpoint: 'servicos',
    filters: [
      { key: 'categoria_servico', label: 'Tipo de serviço', singleSelect: true, options: [
        { value: 'INSTALAÇÃO',             label: 'Instalação' },
        { value: 'CONFIGURAÇÃO',           label: 'Configuração' },
        { value: 'SUPORTE',                label: 'Suporte' },
        { value: 'STARTUP',                label: 'Startup' },
        { value: 'TREINAMENTO',            label: 'Treinamento' },
        { value: 'MONITORAMENTO DE ATIVO', label: 'Monitoramento' },
        { value: 'COMISSIONAMENTO',        label: 'Comissionamento' },
        { value: 'ENTREGA TECNICA',        label: 'Entrega técnica' },
        { value: 'HOSPEDAGEM DE ATIVO',    label: 'Hospedagem' },
        { value: 'Licença',                label: 'Licença' },
        { value: 'LICENÇA + INSTALAÇÃO',   label: 'Lic. + Instalação' },
        { value: 'LICENÇA + MONITORAMENTO', label: 'Lic. + Monitoramento' },
      ]},
      { key: 'categoria_produto', label: 'Produto relacionado', singleSelect: true, options: [
        { value: 'Redes Empresariais',           label: 'Redes Empresariais' },
        { value: 'NVR',                          label: 'NVR' },
        { value: 'Access Point',                 label: 'Access Point' },
        { value: 'Controle de Acesso Corporativo', label: 'Controle de Acesso' },
        { value: 'Nobreak',                      label: 'Nobreak' },
        { value: 'Rack',                         label: 'Rack' },
        { value: 'Central Telefônica',           label: 'Central Telefônica' },
        { value: 'TMR',                          label: 'TMR' },
      ]},
    ],
    flags: [],
    summaryFields: [['Atend.', 'atendimento'], ['Categoria', 'categoria_servico']],
  },
}

const CAT_KEYS = Object.keys(CATS)
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// ── Helpers ───────────────────────────────────────────────────────────────────

function productName(p: IntelbrasProduct): string {
  return (p.produto ?? p.modelo ?? '').trim()
}

function productCode(p: IntelbrasProduct): string {
  return (p.codigo_produto ?? p.cod_produto ?? '').trim()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterGroup({ def, active, onToggle }: {
  def:      FilterDef
  active:   Set<string>
  onToggle: (key: string, value: string, singleSelect?: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-line/10 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-ink/60 uppercase tracking-wider hover:bg-background"
      >
        {def.label}
        {open ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {def.options.map(opt => {
            const on = active.has(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(def.key, opt.value, def.singleSelect)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  on
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-surface text-ink/70 border-line/15 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FlagsGroup({ defs, active, onToggle }: {
  defs:     FlagDef[]
  active:   Set<string>
  onToggle: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (!defs.length) return null
  return (
    <div className="border-b border-line/10 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-ink/60 uppercase tracking-wider hover:bg-background"
      >
        Recursos
        {open ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {defs.map(f => {
            const on = active.has(f.key)
            return (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer group">
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  on ? 'bg-brand-500 border-brand-500' : 'bg-surface border-line/30 group-hover:border-brand-400'
                }`}>
                  {on && <HiCheck className="w-3 h-3 text-white" />}
                </span>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(f.key)} />
                <span className="text-xs text-ink/70">{f.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  selected,
  catDef,
  onToggle,
}: {
  product:  IntelbrasProduct
  selected: boolean
  catDef:   CategoryDef
  onToggle: (p: IntelbrasProduct) => void
}) {
  const name  = productName(product)
  const code  = productCode(product)
  const specs = catDef.summaryFields
    .map(([label, key]) => {
      const v = product[key]
      if (v === null || v === undefined || v === false || v === '') return null
      return `${label}: ${v === true ? 'Sim' : v}`
    })
    .filter(Boolean)

  return (
    <div
      onClick={() => onToggle(product)}
      className={`relative flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/40 ring-1 ring-brand-300 dark:ring-brand-700'
          : 'border-line/10 bg-surface hover:border-brand-300 hover:bg-background'
      }`}
    >
      {/* Selection indicator */}
      <span className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'bg-brand-500 border-brand-500' : 'border-line/20'
      }`}>
        {selected && <HiCheck className="w-3 h-3 text-white" />}
      </span>

      {/* Image / icon */}
      <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-background border border-line/10 flex items-center justify-center overflow-hidden">
        {product.imagem_url
          ? <img src={`${BP}${product.imagem_url as string}`} alt={name} className="w-full h-full object-contain p-1" />
          : <span className="text-2xl">{catDef.icon}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="font-semibold text-ink text-sm leading-tight">{name}</div>
        <div className="text-[11px] text-ink/50 font-mono mt-0.5">{code}</div>
        {specs.length > 0 && (
          <div className="text-[11px] text-ink/65 mt-1.5 leading-relaxed flex flex-wrap gap-x-2">
            {specs.map((s, i) => (
              <span key={i} className="whitespace-nowrap">{s}</span>
            ))}
          </div>
        )}
        {product.tags && (product.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(product.tags as string[]).slice(0, 3).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-ink/10 text-ink/60 rounded text-[10px] font-medium">
                {tag}
              </span>
            ))}
            {product.phaseout && (
              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">
                Phaseout
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface IntelbrasModalProps {
  onClose:  () => void
  onImport: (products: IntelbrasProduct[]) => Promise<void>
}

export default function IntelbrasModal({ onClose, onImport }: IntelbrasModalProps) {
  const [category,  setCategory]  = useState('vip')
  const [q,         setQ]         = useState('')
  const [filters,   setFilters]   = useState<Record<string, Set<string>>>({})
  const [activeFlags, setFlags]   = useState<Set<string>>(new Set())
  const [items,     setItems]     = useState<IntelbrasProduct[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [selected,  setSelected]  = useState<Map<number, IntelbrasProduct>>(new Map())
  const [importing, setImporting] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  const PAGE_SIZE = 12
  const catDef    = CATS[category]
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load products ──────────────────────────────────────────────────────────

  const load = useCallback(async (cat: string, query: string, filt: Record<string, Set<string>>, flags: Set<string>, pg: number) => {
    const def = CATS[cat]

    // For wizard categories (switches), require all wizardKeys to be set
    if (def.wizardKeys?.length) {
      const missing = def.wizardKeys.some(k => !filt[k]?.size)
      if (missing) {
        setItems([])
        setTotal(0)
        setLoading(false)
        return
      }
      // "poe_faixa" is only relevant when poe=SIM
      if (cat === 'switches' && filt['poe']?.has('NAO')) {
        const next = { ...filt }
        delete next['poe_faixa']
        filt = next
      }
    }

    setLoading(true)
    setError('')
    try {
      const sp = new URLSearchParams({ type: cat, page: String(pg), pageSize: String(PAGE_SIZE) })
      if (query) sp.set('q', query)

      Object.entries(filt).forEach(([k, vals]) => {
        if (def.filters.find(f => f.key === k)?.singleSelect) {
          // Single-select: pass as plain param (not array)
          const v = Array.from(vals)[0]
          if (v) sp.set(k, v)
        } else {
          vals.forEach(v => sp.append(`${k}[]`, v))
        }
      })
      flags.forEach(k => sp.set(k, 'sim'))

      const res  = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/intelbras?${sp}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Erro ao carregar produtos')
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload whenever category/filters/page change
  useEffect(() => {
    load(category, q, filters, activeFlags, page)
  }, [category, filters, activeFlags, page, load])

  // Debounce search
  const handleSearch = (val: string) => {
    setQ(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(category, val, filters, activeFlags, 1)
    }, 300)
  }

  // ── Category change — reset everything ────────────────────────────────────

  const changeCategory = (cat: string) => {
    setCategory(cat)
    setQ('')
    setFilters({})
    setFlags(new Set())
    setPage(1)
    setItems([])
  }

  // ── Filter toggles ─────────────────────────────────────────────────────────

  const toggleFilter = (key: string, value: string, singleSelect?: boolean) => {
    setFilters(prev => {
      const next = { ...prev }
      const cur  = new Set(next[key] ?? [])
      if (singleSelect) {
        if (cur.has(value)) delete next[key]
        else next[key] = new Set([value])
      } else {
        cur.has(value) ? cur.delete(value) : cur.add(value)
        if (cur.size === 0) delete next[key]; else next[key] = cur
      }
      return next
    })
    setPage(1)
  }

  const toggleFlag = (key: string) => {
    setFlags(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setQ('')
    setFilters({})
    setFlags(new Set())
    setPage(1)
  }

  const activeFilterCount =
    Object.values(filters).reduce((sum, s) => sum + s.size, 0) + activeFlags.size + (q ? 1 : 0)

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelected = (p: IntelbrasProduct) => {
    setSelected(prev => {
      const next = new Map(prev)
      next.has(p.id) ? next.delete(p.id) : next.set(p.id, p)
      return next
    })
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true)
    try {
      await onImport(Array.from(selected.values()))
      onClose()
    } finally {
      setImporting(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Wizard hint (switches need alimentacao + poe) ─────────────────────────

  const wizardMissing = catDef.wizardKeys?.length
    ? catDef.wizardKeys.some(k => !filters[k]?.size)
    : false

  // For switches, hide poe_faixa filter when poe = NAO
  const visibleFilters = catDef.filters.filter(fd => {
    if (category === 'switches' && fd.key === 'poe_faixa' && !filters['poe']?.has('SIM')) return false
    return true
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-brand-900 border-b border-white/10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0">📡</div>
          <div>
            <div className="font-bold text-white text-sm">Hub Intelbras</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[11px] text-white/50">Catálogo técnico · {total > 0 ? `${total} modelos em ${catDef.label}` : 'conectado'}</span>
            </div>
          </div>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-brand-900 text-xs font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {importing
              ? <span className="w-3.5 h-3.5 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
              : <HiPlus className="w-3.5 h-3.5" />}
            Adicionar {selected.size} à BOM
          </button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white flex-shrink-0 transition-colors">
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-0.5 px-3 pt-2.5 pb-0 overflow-x-auto flex-shrink-0 bg-surface border-b border-line/10">
        {CAT_KEYS.map(key => {
          const def = CATS[key]
          const active = category === key
          return (
            <button
              key={key}
              onClick={() => changeCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-transparent text-ink/55 hover:text-ink/80 hover:bg-background'
              }`}
            >
              <span>{def.icon}</span>
              {def.label}
            </button>
          )
        })}
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        {showFilters && (visibleFilters.length > 0 || catDef.flags.length > 0) && (
          <aside className="w-52 flex-shrink-0 border-r border-line/15 bg-surface overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-line/10">
              <span className="text-[11px] font-bold text-ink/50 uppercase tracking-wider">Filtros</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] text-brand-600 font-semibold hover:underline">
                  Limpar ({activeFilterCount})
                </button>
              )}
            </div>
            {visibleFilters.map(fd => (
              <FilterGroup
                key={fd.key}
                def={fd}
                active={filters[fd.key] ?? new Set()}
                onToggle={toggleFilter}
              />
            ))}
            <FlagsGroup defs={catDef.flags} active={activeFlags} onToggle={toggleFlag} />
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Search bar + controls */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line/10 bg-surface flex-shrink-0">
            <div className="relative flex-1">
              <HiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/50" />
              <input
                type="search"
                value={q}
                onChange={e => handleSearch(e.target.value)}
                placeholder={`Buscar em ${catDef.label}…`}
                className="input py-1.5 pl-8 text-sm w-full"
              />
            </div>
            {(visibleFilters.length > 0 || catDef.flags.length > 0) && (
              <button
                onClick={() => setShowFilters(s => !s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  activeFilterCount > 0
                    ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400'
                    : 'border-line/15 text-ink/60 hover:border-line/30'
                }`}
              >
                <HiFunnel className="w-3.5 h-3.5" />
                {activeFilterCount > 0 ? `${activeFilterCount} ativos` : 'Filtros'}
              </button>
            )}
            <span className="text-xs text-ink/50 whitespace-nowrap">{total} modelos</span>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {wizardMissing ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                <span className="text-3xl">{catDef.icon}</span>
                <p className="text-sm text-ink/60">
                  {category === 'switches'
                    ? 'Selecione a Alimentação e o PoE no painel lateral para ver os modelos compatíveis.'
                    : 'Selecione os filtros obrigatórios para ver os resultados.'}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center px-8">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400 text-sm">Erro de conexão com o Hub Intelbras</p>
                  <p className="text-xs text-ink/55 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => load(category, q, filters, activeFlags, page)}
                  className="px-4 py-1.5 rounded-lg border border-line/15 text-xs font-semibold text-ink/70 hover:bg-background transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-ink/50 text-sm">
                <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                Carregando…
              </div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-ink/50 text-sm">
                Nenhum produto encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selected={selected.has(p.id)}
                    catDef={catDef}
                    onToggle={toggleSelected}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-line/10 bg-surface flex-shrink-0">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line/15 text-xs font-semibold text-ink/70 disabled:opacity-40 hover:bg-background"
              >
                <HiArrowLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="text-xs text-ink/50">
                Página {page} de {totalPages}
                {' '}· {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line/15 text-xs font-semibold text-ink/70 disabled:opacity-40 hover:bg-background"
              >
                Próxima <HiArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Selected rail ── */}
      {selected.size > 0 && (
        <div className="border-t border-line/15 bg-brand-900 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-bold text-white/60 whitespace-nowrap">
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}:
          </span>
          <div className="flex-1 flex flex-wrap gap-1.5 overflow-hidden max-h-12">
            {Array.from(selected.values()).map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[11px] font-semibold text-white"
              >
                {productCode(p)}
                <button onClick={(e) => { e.stopPropagation(); toggleSelected(p) }} className="hover:text-red-400 transition-colors">
                  <HiXMark className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-brand-900 text-sm font-bold hover:bg-white/90 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {importing
              ? <span className="w-3.5 h-3.5 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
              : <HiPlus className="w-4 h-4" />}
            Adicionar à BOM
          </button>
        </div>
      )}
    </div>
  )
}
