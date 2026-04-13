import { http, HttpResponse } from 'msw'
import { Offer } from '@/types'
import { makeOffer } from '../fixtures'

// Shared mutable state for integration tests
export let mockOffers: Offer[] = [
  makeOffer({ id: 'offer-001', stock: 50, version: 1, status: 'active' }),
  makeOffer({ id: 'offer-002', stock: 5, version: 3, status: 'active' }),
  makeOffer({ id: 'offer-003', stock: 0, version: 1, status: 'paused' }),
]

export function resetMockOffers() {
  mockOffers = [
    makeOffer({ id: 'offer-001', stock: 50, version: 1, status: 'active' }),
    makeOffer({ id: 'offer-002', stock: 5, version: 3, status: 'active' }),
    makeOffer({ id: 'offer-003', stock: 0, version: 1, status: 'paused' }),
  ]
}

export const handlers = [
  // GET all offers
  http.get('http://localhost:3001/offers', () => {
    return HttpResponse.json(mockOffers)
  }),

  // GET single offer
  http.get('http://localhost:3001/offers/:id', ({ params }) => {
    const offer = mockOffers.find(o => o.id === params['id'])
    if (!offer) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(offer)
  }),

  // PATCH offer (update)
  http.patch('http://localhost:3001/offers/:id', async ({ params, request }) => {
    const id = params['id'] as string
    const index = mockOffers.findIndex(o => o.id === id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    const body = (await request.json()) as Partial<Offer>
    mockOffers[index] = { ...mockOffers[index], ...body }
    return HttpResponse.json(mockOffers[index])
  }),
]

// Special handlers for conflict scenarios
export const conflictHandler = http.get(
  'http://localhost:3001/offers/:id',
  ({ params }) => {
    // Return offer with incremented version to simulate concurrent update
    const offer = mockOffers.find(o => o.id === params['id'])
    if (!offer) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ ...offer, version: offer.version + 99 })
  }
)

export const networkErrorHandler = http.patch(
  'http://localhost:3001/offers/:id',
  () => HttpResponse.error()
)
