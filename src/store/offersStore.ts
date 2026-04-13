import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import {
  type Offer,
  type OffersState,
  type OfferSyncState,
  type SyncStatus,
  type StockDelta,
  type UpdateOfferPayload,
  type OfferStatus,
  type OfferCategory,
} from '../types/index'
import { offerApi } from '../services/offerApi'
import { validateStockDelta, applyStockDelta } from '../utils/offerUtils'
import { version } from 'react'

// ─── Store Actions ────────────────────────────────────────────────────────────

interface OffersActions {
  // Data fetching
  fetchOffers: () => Promise<void>
  refreshOffer: (id: string) => Promise<void>

  // Optimistic stock update with rollback
  updateStockOptimistic: (delta: StockDelta) => Promise<void>

  // Optimistic field update with rollback
  updateOfferOptimistic: (payload: UpdateOfferPayload) => Promise<void>

  // UI state
  selectOffer: (id: string | null) => void
  setFilterStatus: (status: OfferStatus | 'all') => void
  setFilterCategory: (category: OfferCategory | 'all') => void
  setSearchQuery: (query: string) => void
  clearGlobalError: () => void

  // Sync state helpers (internal)
  _setSyncState: (offerId: string, patch: Partial<OfferSyncState>) => void
  _clearSyncState: (offerId: string) => void
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: OffersState = {
  offers: [],
  syncStates: {},
  selectedOfferId: null,
  filterStatus: 'all',
  filterCategory: 'all',
  searchQuery: '',
  isLoading: false,
  globalError: null,
}

// ─── Store Definition ─────────────────────────────────────────────────────────

export const useOffersStore = create<OffersState & OffersActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ── Fetch all offers ─────────────────────────────────────────────────────
    fetchOffers: async () => {
      if (get().isLoading) return
      set({ isLoading: true, globalError: null })
      try {
        const offers = await offerApi.getAll()
        set({ offers, isLoading: false })
      } catch {
        set({
          isLoading: false,
          globalError: 'Falha ao carregar ofertas. Tente novamente.',
        })
      }
    },

    // ── Refresh a single offer (used after conflict resolution) ───────────────
    refreshOffer: async (id: string) => {
      try {
        const fresh = await offerApi.getById(id)
        set(state => ({
          offers: state.offers.map(o => (o.id === id ? fresh : o)),
        }))
        get()._clearSyncState(id)
      } catch {
        // Non-critical — silent fail
      }
    },

    // ── Optimistic stock delta with rollback ─────────────────────────────────
    updateStockOptimistic: async ({ offerId, delta }: StockDelta) => {
      const { offers, _setSyncState, _clearSyncState } = get()
      const offer = offers.find(o => o.id === offerId)
      if (!offer) return

      // Validate before optimistic update (fail-fast)
      const validationError = validateStockDelta(offer, delta)
      if (validationError) {
        _setSyncState(offerId, {
          status: 'error',
          errorMessage: translateStockError(validationError),
        })
        return
      }

      // 1. Save snapshot for rollback
      const snapshot = { ...offer }
      console.log("Offer", offer);


      // 2. Apply optimistic update immediately
      const optimisticOffer = applyStockDelta({ ...offer, version: offer.version + 1 }, delta)
      console.log("optimisticOffer", optimisticOffer);

      set(state => ({
        offers: state.offers.map(o => (o.id === offerId ? optimisticOffer : o)),
      }))
      _setSyncState(offerId, { status: 'saving', snapshot })

      try {
        // 3. Sync with server
        const confirmed = await offerApi.applyStockDelta(offerId, delta, offer.version)

        // 4. Replace optimistic state with confirmed server state
        set(state => ({
          offers: state.offers.map(o => (o.id === offerId ? confirmed : o)),
        }))
        _setSyncState(offerId, { status: 'success' })

        // Auto-clear success state
        setTimeout(() => _clearSyncState(offerId), 2500)
      } catch (error) {
        const isConflict = isVersionConflict(error)

        if (isConflict) {
          // 5a. Version conflict — keep snapshot, show conflict UI
          set(state => ({
            offers: state.offers.map(o => (o.id === offerId ? snapshot : o)),
          }))
          const currentServer = await offerApi.getById(offerId).catch(() => null)
          _setSyncState(offerId, {
            status: 'conflict',
            errorMessage: 'Este item foi modificado por outro usuário.',
            conflictData: currentServer ?? undefined,
          })
        } else {
          // 5b. Network/unknown error — rollback to snapshot
          set(state => ({
            offers: state.offers.map(o => (o.id === offerId ? snapshot : o)),
          }))
          _setSyncState(offerId, {
            status: 'error',
            errorMessage: 'Falha na sincronização. Alteração desfeita.',
          })
        }
      }
    },

    // ── Optimistic field update with rollback ────────────────────────────────
    updateOfferOptimistic: async (payload: UpdateOfferPayload) => {
      const { offers, _setSyncState, _clearSyncState } = get()
      const offer = offers.find(o => o.id === payload.id)
      if (!offer) return

      const snapshot = { ...offer }
      const optimistic: Offer = { ...offer, version: offer.version + 1, ...payload.changes }

      set(state => ({
        offers: state.offers.map(o => (o.id === payload.id ? optimistic : o)),
      }))
      _setSyncState(payload.id, { status: 'saving', snapshot })

      try {
        const confirmed = await offerApi.update(payload)
        set(state => ({
          offers: state.offers.map(o => (o.id === payload.id ? confirmed : o)),
        }))
        _setSyncState(payload.id, { status: 'success' })
        setTimeout(() => _clearSyncState(payload.id), 2500)
      } catch (error) {
        set(state => ({
          offers: state.offers.map(o => (o.id === payload.id ? snapshot : o)),
        }))

        if (isVersionConflict(error)) {
          const currentServer = await offerApi.getById(payload.id).catch(() => null)
          _setSyncState(payload.id, {
            status: 'conflict',
            errorMessage: 'Conflito de versão detectado.',
            conflictData: currentServer ?? undefined,
          })
        } else {
          _setSyncState(payload.id, {
            status: 'error',
            errorMessage: 'Falha ao salvar. Alterações desfeitas.',
          })
        }
      }
    },

    // ── UI state actions ─────────────────────────────────────────────────────
    selectOffer: (id) => set({ selectedOfferId: id }),
    setFilterStatus: (filterStatus) => set({ filterStatus }),
    setFilterCategory: (filterCategory) => set({ filterCategory }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    clearGlobalError: () => set({ globalError: null }),

    // ── Internal sync helpers ────────────────────────────────────────────────
    _setSyncState: (offerId, patch) =>
      set(state => {
        const existing = state.syncStates[offerId]
        const base: OfferSyncState = existing ?? { offerId, status: 'idle' as SyncStatus }
        const merged: OfferSyncState = Object.assign({}, base, patch)
        return {
          syncStates: { ...state.syncStates, [offerId]: merged },
        }
      }),

    _clearSyncState: (offerId) =>
      set(state => {
        const next = { ...state.syncStates }
        delete next[offerId]
        return { syncStates: next }
      }),
  }))
)

// ─── Selectors (granular — prevent unnecessary re-renders) ───────────────────

export const selectFilteredOffers = (state: OffersState) => {
  let result = state.offers

  if (state.filterStatus !== 'all') {
    result = result.filter(o => o.status === state.filterStatus)
  }
  if (state.filterCategory !== 'all') {
    result = result.filter(o => o.category === state.filterCategory)
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase()
    result = result.filter(
      o =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.tags.some(t => t.includes(q))
    )
  }

  return result
}

export const selectOfferById = (id: string) => (state: OffersState) =>
  state.offers.find(o => o.id === id)

export const selectSyncState = (id: string) => (state: OffersState) =>
  state.syncStates[id] ?? { offerId: id, status: 'idle' as SyncStatus }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVersionConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 409
  )
}

function translateStockError(code: string): string {
  const map: Record<string, string> = {
    INSUFFICIENT_STOCK: 'Estoque insuficiente para esta operação.',
    EXCEEDS_MAX_STOCK: 'Quantidade ultrapassa o estoque máximo permitido.',
    OFFER_NOT_FOUND: 'Oferta não encontrada.',
    OFFER_INACTIVE: 'Esta oferta não está ativa.',
  }
  return map[code] ?? 'Erro desconhecido.'
}
