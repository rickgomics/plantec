'use client'

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

/** Rodapé de lista paginada: "51–100 de 4.470" e anterior/próxima. */
export default function Paginacao({
  page, pageSize, total, onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  if (total <= pageSize) return null
  const paginas = Math.ceil(total / pageSize)
  const ini = (page - 1) * pageSize + 1
  const fim = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line/10 text-xs text-ink/55">
      <span className="num-mono">{ini.toLocaleString('pt-BR')}–{fim.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary btn-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <FiChevronLeft className="w-3.5 h-3.5" />Anterior
        </button>
        <span className="num-mono">{page} / {paginas}</span>
        <button type="button" className="btn-secondary btn-xs" disabled={page >= paginas} onClick={() => onPage(page + 1)}>
          Próxima<FiChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
