import { ProposalStatus } from '@/types'

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  generated: { label: 'Gerada', className: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Enviada', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Recusada', className: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ProposalStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
