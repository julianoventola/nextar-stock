import { useOffersStore } from '../../store/offersStore'
import { useShallow } from 'zustand/react/shallow'
import { useOfferActions } from '../../hooks/useOffers'
import { type OfferStatus, type OfferCategory } from '../../types/index'

const STATUS_OPTIONS: { value: OfferStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'expired', label: 'Expiradas' },
]

const CATEGORY_OPTIONS: { value: OfferCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'electronics', label: 'Eletrônicos' },
  { value: 'audio', label: 'Áudio' },
  { value: 'accessories', label: 'Acessórios' },
  { value: 'software', label: 'Software' },
]

export function Sidebar() {
  const { filterStatus, filterCategory, offers, searchQuery } = useOffersStore(useShallow(s => ({
    filterStatus: s.filterStatus,
    filterCategory: s.filterCategory,
    offers: s.offers,
    searchQuery: s.searchQuery,
  })))
  const { setFilterStatus, setFilterCategory, setSearchQuery } = useOfferActions()

  const countByStatus = (status: OfferStatus | 'all') =>
    status === 'all' ? offers.length : offers.filter(o => o.status === status).length

  return (
    <aside className="sidebar">
      {/* Search */}
      <div>
        <div className="sidebar__section-label">Buscar</div>
        <input
          className="search-input"
          type="text"
          placeholder="Título, tags..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Buscar ofertas"
        />
      </div>

      {/* Status filter */}
      <div>
        <div className="sidebar__section-label">Status</div>
        <div className="filter-group">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`filter-btn ${filterStatus === opt.value ? 'active' : ''}`}
              onClick={() => setFilterStatus(opt.value)}
            >
              {opt.label}
              <span className="filter-btn__count">{countByStatus(opt.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div>
        <div className="sidebar__section-label">Categoria</div>
        <div className="filter-group">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`filter-btn ${filterCategory === opt.value ? 'active' : ''}`}
              onClick={() => setFilterCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 'auto' }}>
        <div className="sidebar__section-label">Legenda — Estoque</div>
        {[
          { color: 'var(--color-stock-healthy)', label: 'Normal (>30%)' },
          { color: 'var(--color-stock-warning)', label: 'Baixo (≤30%)' },
          { color: 'var(--color-stock-critical)', label: 'Crítico (≤mín.)' },
          { color: 'var(--color-stock-empty)', label: 'Esgotado' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
