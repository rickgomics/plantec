'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/products', label: 'Produtos', icon: '📦' },
  { href: '/customers', label: 'Clientes', icon: '🏢' },
  { href: '/proposals', label: 'Propostas', icon: '📋' },
  { href: '/settings/profiles', label: 'Perfis', icon: '🏷️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-[#1B3A6B] flex flex-col">
      <div className="px-6 py-5 border-b border-blue-800">
        <div className="text-white font-bold text-xl tracking-tight">Plantec</div>
        <div className="text-blue-300 text-xs mt-0.5">BOM Builder</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-blue-800">
        <div className="text-blue-400 text-xs">Plantec Distribuidora</div>
        <div className="text-blue-500 text-xs mt-0.5">v0.1.0 MVP</div>
      </div>
    </aside>
  )
}
