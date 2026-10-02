'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import { Product } from '@/types'
import { CATEGORY_NAMES, subcategoriesOf } from '@/lib/taxonomy'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const UNIDADES = ['un', 'm', 'm²', 'cj', 'serv']

/** "Pitch: P2,5" por linha → { Pitch: 'P2,5' } (ficha técnica que a IA e o PDF usam). */
function lerFicha(texto: string): Record<string, string> {
  const ficha: Record<string, string> = {}
  for (const linha of texto.split('\n')) {
    const i = linha.indexOf(':')
    if (i <= 0) continue
    const k = linha.slice(0, i).trim(), v = linha.slice(i + 1).trim()
    if (k && v) ficha[k] = v
  }
  return ficha
}

/**
 * Produto digitado pelo projetista, direto da BOM: o que não existe no
 * Magento (telas de LED sob medida, displays, estruturas). Vai para o
 * catálogo — reaproveitável em outras propostas — e entra na BOM de uma vez.
 * A classificação fica "manual" (o sync e a IA não a trocam).
 */
export default function ProdutoDigitado({
  categoriaPadrao, onCriado,
}: {
  categoriaPadrao?: string
  onCriado: (p: Product, quantidade: number) => void
}) {
  const inicial = categoriaPadrao && CATEGORY_NAMES.includes(categoriaPadrao) ? categoriaPadrao : 'Displays e Telas de LED'
  const [f, setF] = useState({
    name: '', brand: '', sku: '', category: inicial, subcategory: '', unit: 'un',
    preco: '', custo: '', quantidade: '1', descricao: '', ficha: '',
  })
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }))
  const subs = subcategoriesOf(f.category)

  const salvar = async () => {
    if (!f.name.trim()) { toast.error('Informe o nome do produto'); return }
    setSalvando(true)
    try {
      const specs = lerFicha(f.ficha)
      const res = await fetch(`${BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: f.sku.trim() || undefined,
          name: f.name.trim(),
          brand: f.brand.trim() || null,
          category: f.category,
          subcategory: f.subcategory || null,
          description: f.descricao.trim() || null,
          basePrice: parseFloat(f.preco.replace(',', '.')) || 0,
          cost: parseFloat(f.custo.replace(',', '.')) || 0,
          stock: 0,
          unit: f.unit,
          attributes: {
            origem: 'projetista',
            ...(Object.keys(specs).length ? { specs, specsManuais: true } : {}),
          },
          compatible: [], required: [], suggested: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error === 'SKU already exists' ? 'Já existe um produto com esse SKU' : data.error ?? `HTTP ${res.status}`)
      toast.success(`${data.product.name} cadastrado (${data.product.sku})`)
      onCriado(data.product, Math.max(1, parseInt(f.quantidade) || 1))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      <p className="text-xs text-ink/55">
        Para o que não está no catálogo da loja. O produto fica salvo no catálogo e pode ser usado em outras propostas.
      </p>
      <div>
        <label className="label">Nome do produto *</label>
        <input className="input" autoFocus value={f.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Painel de LED outdoor P4 — 6,4 × 3,2 m" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Marca</label>
          <input className="input" value={f.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex.: Absen" />
        </div>
        <div>
          <label className="label">Código / SKU</label>
          <input className="input" value={f.sku} onChange={e => set('sku', e.target.value)} placeholder="Vazio: gera um código DIG-" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Segmento (categoria) *</label>
          <select className="input" value={f.category} onChange={e => setF(x => ({ ...x, category: e.target.value, subcategory: '' }))}>
            {CATEGORY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subcategoria</label>
          <select className="input" value={f.subcategory} onChange={e => set('subcategory', e.target.value)} disabled={!subs.length}>
            <option value="">—</option>
            {subs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="label">Preço unit. (R$)</label>
          <input className="input" inputMode="decimal" value={f.preco} onChange={e => set('preco', e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <label className="label">Custo unit. (R$)</label>
          <input className="input" inputMode="decimal" value={f.custo} onChange={e => set('custo', e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <label className="label">Unidade</label>
          <select className="input" value={f.unit} onChange={e => set('unit', e.target.value)}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantidade</label>
          <input className="input" type="number" min={1} value={f.quantidade} onChange={e => set('quantidade', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Ficha técnica</label>
        <textarea
          className="input font-mono text-xs leading-relaxed"
          rows={5}
          value={f.ficha}
          onChange={e => set('ficha', e.target.value)}
          placeholder={'Uma característica por linha, no formato Nome: valor\nPitch: P4\nResolução do painel: 1600 × 800 px\nBrilho: 5.500 nits\nGrau de proteção: IP65\nConsumo médio: 350 W/m²'}
        />
        <p className="text-[11px] text-ink/45 mt-1">A IA usa a ficha para escrever o descritivo técnico e a função do item na proposta.</p>
      </div>
      <div>
        <label className="label">Descrição (opcional)</label>
        <textarea className="input text-sm" rows={2} value={f.descricao} onChange={e => set('descricao', e.target.value)} />
      </div>
      <div className="flex justify-end pt-1">
        <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
          <FiPlus className="w-4 h-4" />{salvando ? 'Cadastrando…' : 'Cadastrar e adicionar à BOM'}
        </button>
      </div>
    </div>
  )
}
