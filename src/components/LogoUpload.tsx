'use client'

import { useRef } from 'react'
import toast from 'react-hot-toast'
import { FaUpload, FaTrash, FaSyncAlt } from 'react-icons/fa'

interface Props {
  value: string | null | undefined
  onChange: (base64: string | null) => void
  label?: string
}

export default function LogoUpload({ value, onChange, label = 'Logo' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Limpa o input logo após capturar o File: sem isso, escolher o mesmo
    // arquivo duas vezes seguidas não dispara onChange e a troca falha calada.
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.onerror = () => toast.error('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink/75">{label}</label>
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain border rounded p-1 bg-white" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-sm"
          >
            <FaSyncAlt size={12} /> Trocar
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
          >
            <FaTrash size={12} /> Remover
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-line/20
            rounded-lg text-sm text-ink/65 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          <FaUpload />
          Enviar logo (PNG/JPG, max 2MB)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
