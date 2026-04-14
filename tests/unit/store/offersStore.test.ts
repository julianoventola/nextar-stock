/**
 * Unit Tests — offersStore (Zustand)
 *
 * Strategy: mock offerApi so the store logic (optimistic updates, rollbacks,
 * conflict handling) is tested in pure isolation from the network.
 *
 * Each describe block maps to one store action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useOffersStore, selectFilteredOffers, selectSyncState } from '../../../src/store/offersStore'
import { offerApi } from '../../../src/services/offerApi'
import type { Offer } from '../../../src/types/index'

// ─── Mock the API module ──────────────────────────────────────────────────────

vi.mock('../../../src/services/offerApi')
const mockApi = vi.mocked(offerApi)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'offer-1',
  title: 'Notebook Pro',
  description: 'High-end notebook',
  category: 'electronics',
  originalPrice: 5000,
  discountedPrice: 4000,
  discountPercentage: 20,
  stock: 50,
  minStock: 5,
  maxStock: 100,
  version: 1,
  status: 'active',
  visibility: 'public',
  allowedRoles: ['sales'],
  startsAt: '2024-01-01T00:00:00.000Z',
  endsAt: '2024-12-31T23:59:59.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['notebook'],
  imageUrl: 'https://example.com/img.jpg',
  ...overrides,
})

// ─── Reset store state between tests ─────────────────────────────────────────

beforeEach(() => {
  useOffersStore.setState({
    offers: [],
    syncStates: {},
    selectedOfferId: null,
    filterStatus: 'all',
    filterCategory: 'all',
    searchQuery: '',
    isLoading: false,
    globalError: null,
  })
  vi.clearAllMocks()
})

// ─── fetchOffers ──────────────────────────────────────────────────────────────

describe('fetchOffers', () => {
  it('loads offers and clears loading flag on success', async () => {
    const offers = [makeOffer()]
    mockApi.getAll.mockResolvedValue(offers)

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    const state = useOffersStore.getState()
    expect(state.offers).toHaveLength(1)
    expect(state.isLoading).toBe(false)
    expect(state.globalError).toBeNull()
  })

  it('sets globalError and clears loading flag on failure', async () => {
    mockApi.getAll.mockRejectedValue(new Error('Network error'))

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    const state = useOffersStore.getState()
    expect(state.offers).toHaveLength(0)
    expect(state.isLoading).toBe(false)
    expect(state.globalError).toMatch(/falha/i)
  })

  it('is a no-op when already loading (prevents concurrent fetches)', async () => {
    useOffersStore.setState({ isLoading: true })

    await act(async () => {
      await useOffersStore.getState().fetchOffers()
    })

    expect(mockApi.getAll).not.toHaveBeenCalled()
  })

  it('clearGlobalError resets the error message', async () => {
    useOffersStore.setState({ globalError: 'Some error' })
    useOffersStore.getState().clearGlobalError()
    expect(useOffersStore.getState().globalError).toBeNull()
  })
})

// ─── updateStockOptimistic ────────────────────────────────────────────────────

describe('updateStockOptimistic', () => {
  it('applies optimistic update immediately and confirms with server response', async () => {
    const offer = makeOffer({ stock: 50, version: 1 })
    useOffersStore.setState({ offers: [offer] })

    const confirmed = { ...offer, stock: 40, version: 2 }
    mockApi.applyStockDelta.mockResolvedValue(confirmed)

    await act(async () => {
      await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-1', delta: -10 })
    })

    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.stock).toBe(40)
    expect(stored?.version).toBe(2)
  })

  it('rolls back to snapshot on network error', async () => {
    const offer = makeOffer({ stock: 50, version: 1 })
    useOffersStore.setState({ offers: [offer] })

    mockApi.applyStockDelta.mockRejectedValue({ status: 500, message: 'Server error' })

    await act(async () => {
      await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-1', delta: -10 })
    })

    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    // Restored to original
    expect(stored?.stock).toBe(50)
    expect(stored?.version).toBe(1)

    const sync = useOffersStore.getState().syncStates['offer-1']
    expect(sync.status).toBe('error')
    expect(sync.errorMessage).toMatch(/falha/i)
  })

  it('enters conflict state and fetches server version on 409', async () => {
    const offer = makeOffer({ stock: 50, version: 1 })
    const serverOffer = makeOffer({ stock: 45, version: 3 })
    useOffersStore.setState({ offers: [offer] })

    mockApi.applyStockDelta.mockRejectedValue({ status: 409, message: 'Conflict' })
    mockApi.getById.mockResolvedValue(serverOffer)

    await act(async () => {
      await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-1', delta: -10 })
    })

    const sync = useOffersStore.getState().syncStates['offer-1']
    expect(sync.status).toBe('conflict')
    expect(sync.conflictData?.version).toBe(3)

    // UI-visible offer rolled back to snapshot
    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.stock).toBe(50)
  })

  it('sets validation error immediately when delta would drop below minStock', async () => {
    // minStock = 5, stock = 3 → delta = -10 should fail validation
    const offer = makeOffer({ stock: 3, minStock: 5 })
    useOffersStore.setState({ offers: [offer] })

    await act(async () => {
      await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-1', delta: -10 })
    })

    // API must NOT have been called
    expect(mockApi.applyStockDelta).not.toHaveBeenCalled()

    const sync = useOffersStore.getState().syncStates['offer-1']
    expect(sync.status).toBe('error')
  })

  it('is a no-op when the offer id does not exist', async () => {
    useOffersStore.setState({ offers: [] })

    await act(async () => {
      await useOffersStore.getState().updateStockOptimistic({ offerId: 'ghost', delta: -5 })
    })

    expect(mockApi.applyStockDelta).not.toHaveBeenCalled()
  })
})

// ─── updateOfferOptimistic ────────────────────────────────────────────────────

describe('updateOfferOptimistic', () => {
  it('applies optimistic field change and replaces with confirmed server data', async () => {
    const offer = makeOffer({ title: 'Old Title', version: 2 })
    useOffersStore.setState({ offers: [offer] })

    const confirmed = { ...offer, title: 'New Title', version: 3 }
    mockApi.update.mockResolvedValue(confirmed)

    await act(async () => {
      await useOffersStore.getState().updateOfferOptimistic({
        id: 'offer-1',
        version: 2,
        changes: { title: 'New Title' },
      })
    })

    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.title).toBe('New Title')
    expect(stored?.version).toBe(3)
  })

  it('rolls back title change on generic error', async () => {
    const offer = makeOffer({ title: 'Original', version: 1 })
    useOffersStore.setState({ offers: [offer] })

    mockApi.update.mockRejectedValue({ status: 500, message: 'Server error' })

    await act(async () => {
      await useOffersStore.getState().updateOfferOptimistic({
        id: 'offer-1',
        version: 1,
        changes: { title: 'Changed' },
      })
    })

    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.title).toBe('Original')

    const sync = useOffersStore.getState().syncStates['offer-1']
    expect(sync.status).toBe('error')
  })

  it('sets conflict state on 409 and fetches server data', async () => {
    const offer = makeOffer({ version: 1 })
    const serverOffer = makeOffer({ version: 5, title: 'Server Title' })
    useOffersStore.setState({ offers: [offer] })

    mockApi.update.mockRejectedValue({ status: 409, message: 'Conflict' })
    mockApi.getById.mockResolvedValue(serverOffer)

    await act(async () => {
      await useOffersStore.getState().updateOfferOptimistic({
        id: 'offer-1',
        version: 1,
        changes: { title: 'Client Title' },
      })
    })

    const sync = useOffersStore.getState().syncStates['offer-1']
    expect(sync.status).toBe('conflict')
    expect(sync.conflictData?.title).toBe('Server Title')
  })
})

// ─── refreshOffer ─────────────────────────────────────────────────────────────

describe('refreshOffer', () => {
  it('replaces the offer in state with fresh server data', async () => {
    const offer = makeOffer({ title: 'Stale', version: 1 })
    useOffersStore.setState({ offers: [offer] })

    const fresh = makeOffer({ title: 'Fresh', version: 6 })
    mockApi.getById.mockResolvedValue(fresh)

    await act(async () => {
      await useOffersStore.getState().refreshOffer('offer-1')
    })

    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.title).toBe('Fresh')
    expect(stored?.version).toBe(6)
  })

  it('silently ignores errors (non-critical refresh)', async () => {
    const offer = makeOffer()
    useOffersStore.setState({ offers: [offer] })
    mockApi.getById.mockRejectedValue(new Error('Network error'))

    await expect(
      act(async () => {
        await useOffersStore.getState().refreshOffer('offer-1')
      })
    ).resolves.not.toThrow()

    // Offer stays unchanged
    const stored = useOffersStore.getState().offers.find(o => o.id === 'offer-1')
    expect(stored?.title).toBe('Notebook Pro')
  })
})

// ─── UI State Actions ─────────────────────────────────────────────────────────

describe('UI state actions', () => {
  it('selectOffer sets selectedOfferId', () => {
    useOffersStore.getState().selectOffer('offer-42')
    expect(useOffersStore.getState().selectedOfferId).toBe('offer-42')
  })

  it('selectOffer accepts null to deselect', () => {
    useOffersStore.setState({ selectedOfferId: 'offer-1' })
    useOffersStore.getState().selectOffer(null)
    expect(useOffersStore.getState().selectedOfferId).toBeNull()
  })

  it('setFilterStatus updates filterStatus', () => {
    useOffersStore.getState().setFilterStatus('active')
    expect(useOffersStore.getState().filterStatus).toBe('active')
  })

  it('setFilterCategory updates filterCategory', () => {
    useOffersStore.getState().setFilterCategory('audio')
    expect(useOffersStore.getState().filterCategory).toBe('audio')
  })

  it('setSearchQuery updates searchQuery', () => {
    useOffersStore.getState().setSearchQuery('notebook')
    expect(useOffersStore.getState().searchQuery).toBe('notebook')
  })
})

// ─── Selectors ────────────────────────────────────────────────────────────────

describe('selectFilteredOffers', () => {
  const offers: Offer[] = [
    makeOffer({ id: '1', status: 'active', category: 'electronics', title: 'Notebook', tags: [] }),
    makeOffer({ id: '2', status: 'paused', category: 'audio', title: 'Fone Bluetooth', tags: ['bluetooth'] }),
    makeOffer({ id: '3', status: 'active', category: 'electronics', title: 'Tablet X', tags: ['tablet'] }),
  ]

  it('returns all offers when no filters are set', () => {
    const state = { offers, filterStatus: 'all', filterCategory: 'all', searchQuery: '' } as Parameters<typeof selectFilteredOffers>[0]
    expect(selectFilteredOffers(state as never)).toHaveLength(3)
  })

  it('filters by status', () => {
    const state = { offers, filterStatus: 'active', filterCategory: 'all', searchQuery: '' }
    const result = selectFilteredOffers(state as never)
    expect(result.every(o => o.status === 'active')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filters by category', () => {
    const state = { offers, filterStatus: 'all', filterCategory: 'audio', searchQuery: '' }
    const result = selectFilteredOffers(state as never)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by search query (title match)', () => {
    const state = { offers, filterStatus: 'all', filterCategory: 'all', searchQuery: 'tablet' }
    const result = selectFilteredOffers(state as never)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('filters by search query (tag match)', () => {
    const state = { offers, filterStatus: 'all', filterCategory: 'all', searchQuery: 'bluetooth' }
    const result = selectFilteredOffers(state as never)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('returns empty array when no offer matches combined filters', () => {
    const state = { offers, filterStatus: 'paused', filterCategory: 'electronics', searchQuery: '' }
    expect(selectFilteredOffers(state as never)).toHaveLength(0)
  })

  it('search is case-insensitive', () => {
    const state = { offers, filterStatus: 'all', filterCategory: 'all', searchQuery: 'NOTEBOOK' }
    const result = selectFilteredOffers(state as never)
    expect(result[0].id).toBe('1')
  })
})

describe('selectSyncState', () => {
  it('returns idle state when no sync entry exists', () => {
    const state = useOffersStore.getState()
    const sync = selectSyncState('unknown')(state)
    expect(sync.status).toBe('idle')
    expect(sync.offerId).toBe('unknown')
  })

  it('returns the actual sync state when it exists', () => {
    useOffersStore.setState({
      syncStates: {
        'offer-1': { offerId: 'offer-1', status: 'saving' },
      },
    })
    const sync = selectSyncState('offer-1')(useOffersStore.getState())
    expect(sync.status).toBe('saving')
  })
})