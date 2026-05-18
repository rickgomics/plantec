'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',         label: 'Dashboard',  icon: '◈' },
  { href: '/proposals',         label: 'Propostas',  icon: '◻' },
  { href: '/products',          label: 'Produtos',   icon: '▦' },
  { href: '/customers',         label: 'Clientes',   icon: '◎' },
  { href: '/settings/profiles', label: 'Perfis',     icon: '◉' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-brand-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/plantec-icon.svg" alt="Plantec" className="w-9 h-9 flex-shrink-0" />
          <div>
            <div className="text-white font-black text-base tracking-tight leading-none">PLANTEC</div>
            <div className="text-brand-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">BOM Builder</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg w-5 text-center leading-none">{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-brand-400 text-xs font-semibold">Plantec Distribuidora</div>
        <div className="text-brand-600 text-[10px] mt-0.5 font-medium">v1.0 · 2026</div>
      </div>
    </aside>
  )
}
