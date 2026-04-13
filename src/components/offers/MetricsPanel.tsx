import { useOfferMetrics } from '../../hooks/useOffers'
import { formatCurrency } from '../../utils/offerUtils'

export function MetricsPanel() {
  const metrics = useOfferMetrics()

  return (
    <div className="metrics-grid">
      <div className="metric-card metric-card--accent">
        <div className="metric-card__label">Total de Ofertas</div>
        <div className="metric-card__value">{metrics.totalOffers}</div>
        <div className="metric-card__sub">{metrics.activeOffers} ativas</div>
      </div>

      <div className="metric-card metric-card--danger">
        <div className="metric-card__label">Estoque Crítico</div>
        <div className="metric-card__value">{metrics.criticalStockOffers}</div>
        <div className="metric-card__sub">{metrics.outOfStockOffers} esgotadas</div>
      </div>

      <div className="metric-card metric-card--success">
        <div className="metric-card__label">Valor em Estoque</div>
        <div className="metric-card__value" style={{ fontSize: 18 }}>
          {formatCurrency(metrics.totalStockValue)}
        </div>
        <div className="metric-card__sub">total em produtos</div>
      </div>

      <div className="metric-card metric-card--warning">
        <div className="metric-card__label">Desconto Médio</div>
        <div className="metric-card__value">{metrics.averageDiscount}%</div>
        <div className="metric-card__sub">sobre todas as ofertas</div>
      </div>
    </div>
  )
}
