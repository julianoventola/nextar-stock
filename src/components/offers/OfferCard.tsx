import { type Offer } from '../../types'
import { useOfferActions, useOfferSyncState } from '../../hooks/useOffers'
import { useOffersStore } from '../../store/offersStore'
import { formatCurrency, calculateSavings } from '../../utils/offerUtils'
import { StatusBadge } from '../ui/StatusBadge'
import { StockBar } from '../ui/StockBar'
import { StockControls } from '../ui/StockControls'
import { SyncIndicator } from '../ui/SyncIndicator'
import "./OfferCard.css"
interface OfferCardProps {
  offer: Offer
}

const VISIBILITY_LABELS = {
  public: 'Público',
  internal: 'Interno',
  restricted: 'Restrito',
}

export function OfferCard({ offer }: OfferCardProps) {
  const { selectOffer } = useOfferActions()
  const selectedId = useOffersStore(s => s.selectedOfferId)
  const syncState = useOfferSyncState(offer.id)

  const isSelected = selectedId === offer.id
  const isSyncing = syncState.status === 'saving'
  const savings = calculateSavings(offer)

  return (
    <div
      className={`offer-card fade-in ${isSelected ? 'selected' : ''} ${isSyncing ? 'syncing' : ''}`}
      onClick={() => selectOffer(isSelected ? null : offer.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && selectOffer(isSelected ? null : offer.id)}
      aria-label={`Oferta: ${offer.title}`}
    >
      {/* Sync status strip */}
      <div className={`offer-card__sync-strip offer-card__sync-strip--${syncState.status}`} />

      <div className="offer-card__body">
        {/* Header */}
        <div className="offer-card__header">
          <div>
            <div className="offer-card__title">{offer.title}</div>
            <div className="offer-card__category">{offer.category}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <StatusBadge status={offer.status} />
            <span className={`visibility-badge visibility-badge--${offer.visibility}`}>
              {VISIBILITY_LABELS[offer.visibility]}
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="offer-card__pricing">
          <span className="offer-card__price-current">
            {formatCurrency(offer.discountedPrice)}
          </span>
          <span className="offer-card__price-original">
            {formatCurrency(offer.originalPrice)}
          </span>
          <span className="offer-card__discount-badge">
            -{offer.discountPercentage}%
          </span>
        </div>

        {savings > 0 && (
          <div style={{ fontSize: 11, color: 'var(--color-success)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
            Economia de {formatCurrency(savings)}
          </div>
        )}

        {/* Stock */}
        <StockBar offer={offer} />

        {/* Stock Controls */}
        <StockControls offer={offer} disabled={isSyncing} />

        {/* Sync feedback */}
        <SyncIndicator syncState={syncState} />

        {/* Tags */}
        {offer.tags.length > 0 && (
          <div className="tags">
            {offer.tags.map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        )}

        {/* Version indicator */}
        <div style={{
          marginTop: 12,
          fontSize: 9,
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>v{offer.version}</span>
          <span>ID: {offer.id}</span>
        </div>
      </div>
    </div>
  )
}
