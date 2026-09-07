'use client'

import { useEffect, useState } from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'

const KEY = 'plantec-theme'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(KEY, next ? 'dark' : 'light')
    setDark(next)
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={dark ? 'Modo claro' : 'Modo escuro'}
        className="p-1.5 rounded-lg text-brand-300 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
      >
        {dark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs
                 text-brand-300 hover:bg-white/5 hover:text-white transition-colors"
    >
      {dark ? <FiSun className="w-4 h-4 flex-shrink-0" /> : <FiMoon className="w-4 h-4 flex-shrink-0" />}
      <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
    </button>
  )
}
