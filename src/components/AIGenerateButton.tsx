'use client'

import { useState } from 'react'
import { FaRobot } from 'react-icons/fa'

interface Props {
  type: string
  context: Record<string, unknown>
  onGenerated: (text: string) => void
  label?: string
  className?: string
}

export default function AIGenerateButton({
  type,
  context,
  onGenerated,
  label = 'Gerar com IA',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      })
      const data = await res.json()
      if (data.text) {
        onGenerated(data.text)
      } else {
        alert(data.error ?? 'Erro ao gerar conteúdo')
      }
    } catch {
      alert('Erro ao conectar com a IA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg
        bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed
        transition-colors tracking-wide ${className}`}
    >
      <FaRobot className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Gerando...' : label}
    </button>
  )
}
