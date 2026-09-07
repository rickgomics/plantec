'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HiDocumentText,
  HiArchiveBox,
  HiBuildingOffice2,
  HiIdentification,
  HiTag,
  HiArrowDownTray,
} from 'react-icons/hi2'
import { IconType } from 'react-icons'
import ThemeToggle from './ThemeToggle'

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const navItems: { href: string; label: string; icon: IconType; dividerBefore?: boolean }[] = [
  { href: '/proposals',         label: 'Propostas',    icon: HiDocumentText },
  { href: '/import',            label: 'Importar',     icon: HiArrowDownTray },
  { href: '/products',          label: 'Produtos',     icon: HiArchiveBox },
  { href: '/customers',         label: 'Clientes',     icon: HiBuildingOffice2 },
  { href: '/settings/profiles', label: 'Perfis',       icon: HiIdentification, dividerBefore: true },
  { href: '/settings/brands',   label: 'Fabricantes',  icon: HiTag },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-brand-900 flex flex-col">

      {/* Logo + ThemeToggle no header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          {/* Logo completo — texto branco/ciano lê bem sobre brand-900 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${bp}/plantec-logo-full.png`}
            alt="Plantec IA"
            className="h-[135px] w-auto object-contain object-left flex-1 min-w-0"
          />
          <ThemeToggle compact />
        </div>
        <div className="text-brand-400 text-[9px] font-bold tracking-[0.2em] uppercase mt-2 pl-0.5">
          BOM Builder
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <div key={item.href}>
              {item.dividerBefore && <div className="my-2 border-t border-white/10" />}
              <Link
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          )
        })}
      </nav>

      {/* Footer mínimo */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="text-brand-500 text-[10px]">Plantec Distribuidora · v1.0</div>
      </div>
    </aside>
  )
}
