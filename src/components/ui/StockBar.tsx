import { type Offer } from '../../types/index'
import { getStockHealth } from '../../utils/offerUtils'

interface StockBarProps {
  offer: Offer
}

export function StockBar({ offer }: StockBarProps) {
  const health = getStockHealth(offer)

  return (
    <div className="stock-section">
      <div className="stock-header">
        <span className="stock-label">Estoque</span>
        <span className={`stock-value stock-value--${health.level}`}>
          {offer.stock} un. · {health.label}
        </span>
      </div>
      <div className="stock-bar-track">
        <div
          className={`stock-bar-fill stock-bar-fill--${health.level}`}
          style={{ width: `${health.percentage}%` }}
        />
      </div>
    </div>
  )
}
