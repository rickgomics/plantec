'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { HiArrowUpTray } from 'react-icons/hi2'

interface Segmento {
  id: string
  label: string
  arte: { dataUri: string; geradoEm?: string } | null
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const MAX_BYTES = 3 * 1024 * 1024

/**
 * Arte de capa por segmento.
 *
 * A arte é uma camada de fundo sobre o gradiente do tema — o gradiente
 * continua embaixo, então nada fica em branco sem imagem. Uma arte por
 * segmento: trocar substitui a anterior em toda proposta daquele segmento.
 * As artes antigas foram geradas pela OpenAI; desde 27/09/2026 a troca é por
 * arquivo enviado.
 */
export default function CoverArtPanel() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/covers`)
      const data = await res.json()
      setSegmentos(data.segmentos ?? [])
    } catch {
      toast.error('Não foi possível carregar as artes de capa')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function enviar(seg: Segmento, file: File) {
    if (file.size > MAX_BYTES) { toast.error('Imagem acima de 3 MB — o PDF ficaria pesado demais'); return }
    setEnviando(seg.id)
    try {
      const dataUri = await new Promise<string>((ok, erro) => {
        const r = new FileReader()
        r.onload = () => ok(String(r.result))
        r.onerror = () => erro(r.error)
        r.readAsDataURL(file)
      })
      const res = await fetch(`${BASE}/api/covers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vertical: seg.id, dataUri }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Falha ao enviar a arte'); return }
      toast.success(`Arte de ${seg.label} trocada`)
      carregar()
    } catch {
      toast.error('Erro ao enviar a imagem')
    } finally {
      setEnviando(null)
    }
  }

  if (carregando) return <p className="text-sm text-ink/45">Carregando artes…</p>

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-ink/75 text-sm">Arte de Capa por Segmento</h3>
        <p className="text-xs text-ink/45 mt-0.5">
          Imagem de fundo aplicada a todas as propostas daquele segmento. Retrato (A4 em pé), JPEG de até 3 MB.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {segmentos.map(seg => (
          <div key={seg.id} className="card p-3 space-y-2">
            <div
              className="rounded-lg overflow-hidden h-28 bg-ink/5 flex items-center justify-center"
              style={seg.arte ? { backgroundImage: `url(${seg.arte.dataUri})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!seg.arte && <span className="text-[11px] text-ink/35 font-medium">sem arte (só o tema)</span>}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink/75 truncate">{seg.label}</span>
              <label className={`btn-secondary btn-xs cursor-pointer ${enviando !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                <HiArrowUpTray className="w-3.5 h-3.5" />
                {enviando === seg.id ? 'Enviando…' : seg.arte ? 'Trocar' : 'Enviar'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviar(seg, f) }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
