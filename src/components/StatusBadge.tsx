import { ProposalStatus } from '@/types'

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft:     { label: 'Rascunho', className: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200' },
  generated: { label: 'Gerada',   className: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200' },
  sent:      { label: 'Enviada',  className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' },
  approved:  { label: 'Aprovada', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' },
  rejected:  { label: 'Recusada', className: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ProposalStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${config.className}`}>
      {config.label}
    </span>
  )
}
