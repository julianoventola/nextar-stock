import { useFilteredOffers } from '@/hooks/useOffers'
import { useOffersStore } from '@/store/offersStore'
import { OfferCard } from './OfferCard'

function SkeletonCard() {
  return (
    <div className="skeleton" style={{ height: 340 }} />
  )
}

export function OffersGrid() {
  const offers = useFilteredOffers()
  const isLoading = useOffersStore(s => s.isLoading)

  if (isLoading) {
    return (
      <div className="loading-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📭</div>
        <div className="empty-state__title">Nenhuma oferta encontrada</div>
        <div className="empty-state__sub">Tente ajustar os filtros ou a busca</div>
      </div>
    )
  }

  return (
    <div className="offers-grid">
      {offers.map(offer => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  )
}
