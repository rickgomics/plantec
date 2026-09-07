import { ProposalStatus } from '@/types'

// Badges do Padrão Visual do Portal: cor sempre semântica, nunca a cor da
// marca — essa fica reservada a ação e link. "Gerada" é um estágio de funil,
// por isso violeta, e não o teal que ela usava antes.
const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft:     { label: 'Rascunho', className: 'badge-neutro' },
  generated: { label: 'Gerada',   className: 'badge-violet' },
  sent:      { label: 'Enviada',  className: 'badge-warn' },
  approved:  { label: 'Aprovada', className: 'badge-good' },
  rejected:  { label: 'Recusada', className: 'badge-critical' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ProposalStatus] ?? {
    label: status,
    className: 'badge-neutro',
  }
  return <span className={`badge ${config.className}`}>{config.label}</span>
}
