'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      })
      const data = await res.json()
      if (data.text) {
        onGenerated(data.text)
      } else {
        toast.error(data.error ?? 'Erro ao gerar conteúdo')
      }
    } catch {
      toast.error('Erro ao conectar com a IA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className={`btn-ai ${className}`.trim()}
    >
      <FaRobot className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Gerando...' : label}
    </button>
  )
}
