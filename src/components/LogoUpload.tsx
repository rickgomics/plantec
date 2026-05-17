'use client'

import { useRef } from 'react'
import { FaUpload, FaTrash } from 'react-icons/fa'

interface Props {
  value: string | null | undefined
  onChange: (base64: string | null) => void
  label?: string
}

export default function LogoUpload({ value, onChange, label = 'Logo' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Logo" className="h-16 w-auto object-contain border rounded p-1 bg-white" />
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
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300
            rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
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
