import { useMemo } from 'react'
import {
  useOffersStore,
  selectFilteredOffers,
  selectSyncState,
  selectOfferById,
} from '@/store/offersStore'
import { computeOfferMetrics } from '@/utils/offerUtils'

/**
 * Returns filtered offers based on current filter state.
 * Subscribes only to offers + filter fields — not the whole store.
 */
export function useFilteredOffers() {
  return useOffersStore(selectFilteredOffers)
}

/**
 * Returns dashboard-level metrics. Memoized to avoid recomputation.
 */
export function useOfferMetrics() {
  const offers = useOffersStore(s => s.offers)
  return useMemo(() => computeOfferMetrics(offers), [offers])
}

/**
 * Returns sync state for a specific offer ID.
 */
export function useOfferSyncState(offerId: string) {
  return useOffersStore(selectSyncState(offerId))
}

/**
 * Returns a single offer by ID.
 */
export function useOffer(id: string) {
  return useOffersStore(selectOfferById(id))
}

/**
 * Returns store actions without subscribing to any state.
 * Components that only dispatch actions won't re-render on state changes.
 */
export function useOfferActions() {
  return useOffersStore(s => ({
    fetchOffers: s.fetchOffers,
    updateStockOptimistic: s.updateStockOptimistic,
    updateOfferOptimistic: s.updateOfferOptimistic,
    selectOffer: s.selectOffer,
    setFilterStatus: s.setFilterStatus,
    setFilterCategory: s.setFilterCategory,
    setSearchQuery: s.setSearchQuery,
    refreshOffer: s.refreshOffer,
    clearGlobalError: s.clearGlobalError,
  }))
}
