import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { handlers, resetMockOffers, conflictHandler, networkErrorHandler } from './msw-handlers'
import { makeOffer } from '../fixtures'

// Setup MSW server
const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockOffers()
})
afterAll(() => server.close())

// ─── Helper: fresh store instance per test ────────────────────────────────────
// We re-import the store factory to get a clean state each time
async function getCleanStore() {
  const { useOffersStore } = await import('@/store/offersStore')
  // Reset store to initial state by calling with a fresh state
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
  return useOffersStore
}

// ─── fetchOffers ─────────────────────────────────────────────────────────────

describe('Store: fetchOffers', () => {
  it('populates offers from the API on success', async () => {
    const store = await getCleanStore()
    await store.getState().fetchOffers()

    const { offers, isLoading } = store.getState()
    expect(offers).toHaveLength(3)
    expect(isLoading).toBe(false)
  })

  it('sets globalError when API fails', async () => {
    server.use(
      http.get('http://localhost:3001/offers', () => HttpResponse.error())
    )
    const store = await getCleanStore()
    await store.getState().fetchOffers()

    expect(store.getState().globalError).toBeTruthy()
    expect(store.getState().offers).toHaveLength(0)
  })

  it('clears globalError on successful fetch', async () => {
    const store = await getCleanStore()
    store.setState({ globalError: 'Old error' })
    await store.getState().fetchOffers()
    expect(store.getState().globalError).toBeNull()
  })
})

// ─── updateStockOptimistic ────────────────────────────────────────────────────

describe('Store: updateStockOptimistic — optimistic update', () => {
  beforeEach(async () => {
    const store = await getCleanStore()
    await store.getState().fetchOffers()
  })

  it('applies stock change immediately before server response (optimistic)', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    const initialStock = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!.stock

    // Don't await — check state before server resolves
    const promise = useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -10 })

    // Stock should have been updated optimistically
    const stockDuringUpdate = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!.stock
    expect(stockDuringUpdate).toBe(initialStock - 10)

    await promise
  })

  it('confirms stock after server response', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -10 })

    const offer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(offer.stock).toBe(40)
    expect(useOffersStore.getState().syncStates['offer-001']?.status).toBe('success')
  })

  it('sets syncState to saving during the request', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    const promise = useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -5 })

    const syncState = useOffersStore.getState().syncStates['offer-001']
    expect(syncState?.status).toBe('saving')

    await promise
  })

  it('validates before applying — sets error without touching stock', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    const offer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    const originalStock = offer.stock

    // Attempt to decrement more than available stock
    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -9999 })

    const afterOffer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(afterOffer.stock).toBe(originalStock)
    expect(useOffersStore.getState().syncStates['offer-001']?.status).toBe('error')
  })

  it('rejects update on inactive offer', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-003', delta: -1 })
    expect(useOffersStore.getState().syncStates['offer-003']?.status).toBe('error')
  })
})

// ─── Rollback on network error ────────────────────────────────────────────────

describe('Store: updateStockOptimistic — rollback on failure', () => {
  it('rolls back to snapshot on network error', async () => {
    server.use(networkErrorHandler)

    const { useOffersStore } = await import('@/store/offersStore')
    store.setState({ offers: [] })
    await useOffersStore.getState().fetchOffers()

    const originalStock = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!.stock
    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -10 })

    const afterStock = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!.stock
    expect(afterStock).toBe(originalStock)
    expect(useOffersStore.getState().syncStates['offer-001']?.status).toBe('error')
  })
})

// ─── Version conflict detection ───────────────────────────────────────────────

describe('Store: updateStockOptimistic — version conflict (409)', () => {
  it('detects version conflict and sets conflict syncState', async () => {
    server.use(conflictHandler)

    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({ offers: [makeOffer({ id: 'offer-001', stock: 50, version: 1 })] })

    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -5 })

    const syncState = useOffersStore.getState().syncStates['offer-001']
    expect(syncState?.status).toBe('conflict')
    expect(syncState?.errorMessage).toMatch(/modificado|conflito/i)
  })

  it('rolls back optimistic state on version conflict', async () => {
    server.use(conflictHandler)

    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({ offers: [makeOffer({ id: 'offer-001', stock: 50, version: 1 })] })
    const originalStock = 50

    await useOffersStore.getState().updateStockOptimistic({ offerId: 'offer-001', delta: -5 })

    const offer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(offer.stock).toBe(originalStock)
  })
})

// ─── updateOfferOptimistic ────────────────────────────────────────────────────

describe('Store: updateOfferOptimistic', () => {
  it('applies field change optimistically', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [makeOffer({ id: 'offer-001', status: 'active', version: 1 })],
      syncStates: {},
    })

    const promise = useOffersStore.getState().updateOfferOptimistic({
      id: 'offer-001',
      version: 1,
      changes: { status: 'paused' },
    })

    // Optimistic update applied immediately
    const optimisticOffer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(optimisticOffer.status).toBe('paused')

    await promise
  })

  it('confirms update and increments version after server success', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [makeOffer({ id: 'offer-001', status: 'active', version: 1 })],
      syncStates: {},
    })

    await useOffersStore.getState().updateOfferOptimistic({
      id: 'offer-001',
      version: 1,
      changes: { status: 'paused' },
    })

    const confirmed = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(confirmed.version).toBe(2)
    expect(useOffersStore.getState().syncStates['offer-001']?.status).toBe('success')
  })

  it('rolls back on network error', async () => {
    server.use(networkErrorHandler)
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [makeOffer({ id: 'offer-001', title: 'Original', version: 1 })],
      syncStates: {},
    })

    await useOffersStore.getState().updateOfferOptimistic({
      id: 'offer-001',
      version: 1,
      changes: { title: 'Modified' },
    })

    const offer = useOffersStore.getState().offers.find(o => o.id === 'offer-001')!
    expect(offer.title).toBe('Original')
    expect(useOffersStore.getState().syncStates['offer-001']?.status).toBe('error')
  })
})

// ─── UI state actions ─────────────────────────────────────────────────────────

describe('Store: UI state actions', () => {
  it('selectOffer sets selectedOfferId', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.getState().selectOffer('offer-001')
    expect(useOffersStore.getState().selectedOfferId).toBe('offer-001')
  })

  it('selectOffer with null deselects', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({ selectedOfferId: 'offer-001' })
    useOffersStore.getState().selectOffer(null)
    expect(useOffersStore.getState().selectedOfferId).toBeNull()
  })

  it('setFilterStatus updates filterStatus', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.getState().setFilterStatus('paused')
    expect(useOffersStore.getState().filterStatus).toBe('paused')
  })

  it('setSearchQuery updates searchQuery', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.getState().setSearchQuery('iphone')
    expect(useOffersStore.getState().searchQuery).toBe('iphone')
  })

  it('clearGlobalError resets globalError', async () => {
    const { useOffersStore } = await import('@/store/offersStore')
    useOffersStore.setState({ globalError: 'Some error' })
    useOffersStore.getState().clearGlobalError()
    expect(useOffersStore.getState().globalError).toBeNull()
  })
})

// ─── Selector: selectFilteredOffers ──────────────────────────────────────────

describe('Selector: selectFilteredOffers', () => {
  it('returns all offers when filters are default', async () => {
    const { useOffersStore, selectFilteredOffers } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [
        makeOffer({ id: '1', status: 'active', category: 'electronics' }),
        makeOffer({ id: '2', status: 'paused', category: 'audio' }),
      ],
      filterStatus: 'all',
      filterCategory: 'all',
      searchQuery: '',
    })
    expect(selectFilteredOffers(useOffersStore.getState())).toHaveLength(2)
  })

  it('filters by status correctly', async () => {
    const { useOffersStore, selectFilteredOffers } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [
        makeOffer({ id: '1', status: 'active' }),
        makeOffer({ id: '2', status: 'paused' }),
      ],
      filterStatus: 'active',
      filterCategory: 'all',
      searchQuery: '',
    })
    const result = selectFilteredOffers(useOffersStore.getState())
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('active')
  })

  it('filters by search query on title', async () => {
    const { useOffersStore, selectFilteredOffers } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [
        makeOffer({ id: '1', title: 'iPhone 15 Pro' }),
        makeOffer({ id: '2', title: 'Samsung Galaxy' }),
      ],
      filterStatus: 'all',
      filterCategory: 'all',
      searchQuery: 'iphone',
    })
    const result = selectFilteredOffers(useOffersStore.getState())
    expect(result).toHaveLength(1)
    expect(result[0].title).toContain('iPhone')
  })

  it('filters by search query on tags', async () => {
    const { useOffersStore, selectFilteredOffers } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [
        makeOffer({ id: '1', tags: ['black-friday'] }),
        makeOffer({ id: '2', tags: ['premium'] }),
      ],
      filterStatus: 'all',
      filterCategory: 'all',
      searchQuery: 'black',
    })
    const result = selectFilteredOffers(useOffersStore.getState())
    expect(result).toHaveLength(1)
  })

  it('applies multiple filters simultaneously', async () => {
    const { useOffersStore, selectFilteredOffers } = await import('@/store/offersStore')
    useOffersStore.setState({
      offers: [
        makeOffer({ id: '1', status: 'active', category: 'electronics', title: 'iPhone' }),
        makeOffer({ id: '2', status: 'active', category: 'audio', title: 'AirPods' }),
        makeOffer({ id: '3', status: 'paused', category: 'electronics', title: 'MacBook' }),
      ],
      filterStatus: 'active',
      filterCategory: 'electronics',
      searchQuery: '',
    })
    const result = selectFilteredOffers(useOffersStore.getState())
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

// Workaround for module-level variable usage in rollback test
const store = { setState: (_: unknown) => {} }
