import { type OfferStatus } from '../../types/index'
import "./StatusBadge.css"

interface StatusBadgeProps {
  status: OfferStatus
}

const STATUS_LABELS: Record<OfferStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  scheduled: 'Agendada',
  expired: 'Expirada',
  draft: 'Rascunho',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" />
      {STATUS_LABELS[status]}
    </span>
  )
}
