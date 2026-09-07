import { ProposalStatus } from '@/types'

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft:     { label: 'Rascunho', className: 'bg-ink/5 text-ink/65 ring-1 ring-inset ring-line/15' },
  generated: { label: 'Gerada',   className: 'bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-700' },
  sent:      { label: 'Enviada',  className: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-200 dark:ring-amber-800' },
  approved:  { label: 'Aprovada', className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800' },
  rejected:  { label: 'Recusada', className: 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-800' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ProposalStatus] ?? {
    label: status,
    className: 'bg-ink/5 text-ink/65',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${config.className}`}>
      {config.label}
    </span>
  )
}
