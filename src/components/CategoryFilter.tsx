'use client'

import { useEffect, useState } from 'react'

interface CategoryCount {
  category: string
  count: number
  subs: { name: string; count: number }[]
}

/**
 * Filtro de categoria > subcategoria com as contagens reais do catálogo
 * (/api/products/categories), na ordem da taxonomia (src/lib/taxonomy.ts).
 */
export default function CategoryFilter({
  category, subcategory, onChange, className = 'w-48',
}: {
  category: string
  subcategory: string
  onChange: (category: string, subcategory: string) => void
  className?: string
}) {
  const [cats, setCats] = useState<CategoryCount[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/products/categories`)
      .then(r => (r.ok ? r.json() : { categories: [] }))
      .then(d => setCats(d.categories ?? []))
      .catch(() => setCats([]))
  }, [])

  const subs = cats.find(c => c.category === category)?.subs ?? []
  const fmt = (n: number) => n.toLocaleString('pt-BR')

  return (
    <>
      <select className={`input ${className}`} value={category} onChange={e => onChange(e.target.value, '')}>
        <option value="">Todas categorias</option>
        {cats.map(c => (
          <option key={c.category} value={c.category}>{c.category} ({fmt(c.count)})</option>
        ))}
      </select>
      {subs.length > 0 && (
        <select className={`input ${className}`} value={subcategory} onChange={e => onChange(category, e.target.value)}>
          <option value="">Todas subcategorias</option>
          {subs.map(s => (
            <option key={s.name} value={s.name}>{s.name} ({fmt(s.count)})</option>
          ))}
        </select>
      )}
    </>
  )
}
