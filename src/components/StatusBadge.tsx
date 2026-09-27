import { ProposalStatus } from '@/types'

// Badges do Padrão Visual do Portal: cor sempre semântica (bom, atenção,
// crítico, neutro), nunca a cor da marca, e o violeta é só de IA. Rascunho e
// Gerada ficam neutros e se distinguem pela palavra, que sempre acompanha.
const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  draft:     { label: 'Rascunho', className: 'badge-neutro' },
  generated: { label: 'Gerada',   className: 'badge-neutro' },
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
