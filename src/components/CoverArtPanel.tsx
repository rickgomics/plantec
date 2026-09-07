'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { HiSparkles } from 'react-icons/hi2'

interface Segmento {
  id: string
  label: string
  promptPadrao: string
  arte: { dataUri: string; prompt: string; geradoEm?: string } | null
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Arte de capa por segmento, gerada na OpenAI.
 *
 * A arte é uma camada de fundo sobre o gradiente do tema — o gradiente
 * continua embaixo, então nada fica em branco se a imagem falhar. Uma arte
 * por segmento: gerar de novo substitui a anterior, e a troca aparece em
 * toda proposta que usa aquela capa.
 */
export default function CoverArtPanel() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [promptEditado, setPromptEditado] = useState('')

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

  async function gerar(seg: Segmento) {
    setGerando(seg.id)
    try {
      const res = await fetch(`${BASE}/api/covers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: seg.id,
          prompt: aberto === seg.id && promptEditado.trim() ? promptEditado : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Falha ao gerar a arte'); return }
      toast.success(`Arte de ${seg.label} gerada`)
      setAberto(null)
      carregar()
    } catch {
      toast.error('Erro ao conectar com o gerador de imagens')
    } finally {
      setGerando(null)
    }
  }

  if (carregando) return <p className="text-sm text-ink/45">Carregando artes…</p>

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-ink/75 text-sm">Arte de Capa por Segmento</h3>
        <p className="text-xs text-ink/45 mt-0.5">
          Imagem de fundo gerada por IA, aplicada a todas as propostas que usam a capa daquele segmento.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {segmentos.map(seg => (
          <div key={seg.id} className="card p-3 space-y-2">
            <div
              className="rounded-lg overflow-hidden h-28 bg-ink/5 flex items-center justify-center"
              style={seg.arte ? { backgroundImage: `url(${seg.arte.dataUri})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!seg.arte && <span className="text-[11px] text-ink/35 font-medium">sem arte</span>}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink/75 truncate">{seg.label}</span>
              <button
                type="button"
                className="btn-ai btn-xs"
                disabled={gerando !== null}
                onClick={() => gerar(seg)}
              >
                <HiSparkles className="w-3.5 h-3.5" />
                {gerando === seg.id ? 'Gerando…' : seg.arte ? 'Refazer' : 'Gerar'}
              </button>
            </div>

            <button
              type="button"
              className="text-[11px] text-ink/45 hover:text-ink/75 underline"
              onClick={() => {
                setAberto(aberto === seg.id ? null : seg.id)
                setPromptEditado(seg.arte?.prompt || seg.promptPadrao)
              }}
            >
              {aberto === seg.id ? 'ocultar prompt' : 'ajustar prompt'}
            </button>

            {aberto === seg.id && (
              <textarea
                className="input text-[11px]"
                rows={5}
                value={promptEditado}
                onChange={e => setPromptEditado(e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
