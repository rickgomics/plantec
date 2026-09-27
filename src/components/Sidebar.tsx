'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiGrid, FiFileText, FiDownload, FiPackage, FiUsers, FiBriefcase, FiTag } from 'react-icons/fi'
import { IconType } from 'react-icons'
import ThemeToggle from './ThemeToggle'

// Padrão Visual do Portal: barra clara, sem logo (o logo PlantecIA só se lê
// sobre fundo escuro) — mesma decisão do KPI Dashboard em 27/09/2026.
const navItems: { href: string; label: string; icon: IconType; grupo?: string }[] = [
  { href: '/dashboard',         label: 'Painel',       icon: FiGrid },
  { href: '/proposals',         label: 'Propostas',    icon: FiFileText },
  { href: '/import',            label: 'Importar',     icon: FiDownload },
  { href: '/products',          label: 'Produtos',     icon: FiPackage },
  { href: '/customers',         label: 'Clientes',     icon: FiUsers },
  { href: '/settings/profiles', label: 'Perfis',       icon: FiBriefcase, grupo: 'Configurações' },
  { href: '/settings/brands',   label: 'Fabricantes',  icon: FiTag },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar w-56 min-h-screen flex flex-col flex-shrink-0">
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow">Plantec</div>
          <div className="font-display font-extrabold uppercase text-[22px] leading-none tracking-[0.01em] text-ink mt-1">
            BOM Builder
          </div>
        </div>
        <ThemeToggle compact />
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <div key={item.href}>
              {item.grupo && (
                <div className="eyebrow !text-ink/45 px-3 pt-4 pb-1.5 !text-[10px]">{item.grupo}</div>
              )}
              <Link href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-line/10 text-[11px] text-ink/45">
        Plantec Distribuidora
      </div>
    </aside>
  )
}
