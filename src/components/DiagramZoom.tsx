'use client'

import { useCallback, useEffect, useState } from 'react'
import { HiMagnifyingGlassPlus, HiMagnifyingGlassMinus, HiXMark, HiArrowsPointingOut } from 'react-icons/hi2'

interface Props {
  /** Imagem já renderizada (Eraser) */
  imageUrl?: string | null
  /** SVG do Mermaid, já renderizado pelo preview */
  svg?: string | null
  titulo?: string
}

const NIVEIS = [0.5, 0.75, 1, 1.5, 2, 3, 4]

/**
 * Tela cheia com zoom para o diagrama pronto.
 *
 * O preview da aba Cenário é limitado a 480px de altura — suficiente para
 * conferir se saiu certo, insuficiente para o projetista ler nome de
 * equipamento e rótulo de enlace. Aqui a imagem abre em tela cheia, com zoom
 * até 4× e arraste.
 */
export default function DiagramZoom({ imageUrl, svg, titulo = 'Diagrama' }: Props) {
  const [aberto, setAberto] = useState(false)
  const [nivel, setNivel] = useState(2) // índice em NIVEIS → 1×
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [arrastando, setArrastando] = useState<{ x: number; y: number } | null>(null)

  const escala = NIVEIS[nivel]
  const temConteudo = Boolean(imageUrl || svg)

  const fechar = useCallback(() => {
    setAberto(false)
    setNivel(2)
    setPos({ x: 0, y: 0 })
  }, [])

  // Esc fecha; +/- controlam o zoom sem tirar a mão do teclado.
  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') fechar()
      if (e.key === '+' || e.key === '=') setNivel(n => Math.min(n + 1, NIVEIS.length - 1))
      if (e.key === '-' || e.key === '_') setNivel(n => Math.max(n - 1, 0))
      if (e.key === '0') { setNivel(2); setPos({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', onKey)
    // Trava a rolagem do fundo enquanto o visualizador está aberto.
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto, fechar])

  if (!temConteudo) return null

  return (
    <>
      <button type="button" className="btn-secondary btn-xs" onClick={() => setAberto(true)}>
        <HiArrowsPointingOut className="w-3.5 h-3.5" />
        Ampliar
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: 'rgba(18,24,26,0.92)' }}
          onMouseUp={() => setArrastando(null)}
          onMouseLeave={() => setArrastando(null)}
        >
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="text-sm font-semibold" style={{ color: '#fff' }}>{titulo}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary btn-xs"
                onClick={() => setNivel(n => Math.max(n - 1, 0))} disabled={nivel === 0} title="Diminuir (−)">
                <HiMagnifyingGlassMinus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono w-14 text-center" style={{ color: '#fff' }}>
                {Math.round(escala * 100)}%
              </span>
              <button type="button" className="btn-secondary btn-xs"
                onClick={() => setNivel(n => Math.min(n + 1, NIVEIS.length - 1))}
                disabled={nivel === NIVEIS.length - 1} title="Aumentar (+)">
                <HiMagnifyingGlassPlus className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="btn-secondary btn-xs"
                onClick={() => { setNivel(2); setPos({ x: 0, y: 0 }) }} title="Tamanho original (0)">
                100%
              </button>
              <button type="button" className="btn-secondary btn-xs" onClick={fechar} title="Fechar (Esc)">
                <HiXMark className="w-3.5 h-3.5" />
                Fechar
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-hidden flex items-center justify-center"
            style={{ cursor: arrastando ? 'grabbing' : 'grab' }}
            onMouseDown={e => setArrastando({ x: e.clientX - pos.x, y: e.clientY - pos.y })}
            onMouseMove={e => {
              if (arrastando) setPos({ x: e.clientX - arrastando.x, y: e.clientY - arrastando.y })
            }}
          >
            <div
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
                transition: arrastando ? 'none' : 'transform .15s ease',
                background: '#fff',
                borderRadius: 8,
                padding: 12,
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={titulo} draggable={false} style={{ display: 'block', maxWidth: 'none' }} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
              )}
            </div>
          </div>

          <div className="px-5 py-2 text-center text-[11px] flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            Arraste para mover · + e − para o zoom · 0 volta ao original · Esc fecha
          </div>
        </div>
      )}
    </>
  )
}
