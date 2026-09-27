'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiGrid, FiFileText, FiDownload, FiPackage, FiUsers, FiBriefcase, FiTag } from 'react-icons/fi'
import { IconType } from 'react-icons'
import ThemeToggle from './ThemeToggle'

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// Menu lateral com a identidade PlantecIA (azul-marinho e logo), por pedido
// do usuário em 27/09/2026; as telas seguem o Padrão Visual do Portal.
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
    <aside className="sidebar w-60 min-h-screen flex flex-col flex-shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          {/* Logo completo — texto branco/ciano lê bem sobre o azul-marinho */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${bp}/plantec-logo-full.png`}
            alt="Plantec IA"
            className="h-[135px] w-auto object-contain object-left flex-1 min-w-0"
          />
          <ThemeToggle compact />
        </div>
        <div className="text-[#5FCCC4] text-[9px] font-bold tracking-[0.2em] uppercase mt-2 pl-0.5">
          BOM Builder
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <div key={item.href}>
              {item.grupo && <div className="sidebar-grupo px-3 pt-4 pb-1.5">{item.grupo}</div>}
              <Link href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/10 text-[10px] text-white/40">
        Plantec Distribuidora
      </div>
    </aside>
  )
}
