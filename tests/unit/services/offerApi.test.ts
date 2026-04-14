/**
 * Unit Tests — offerApi
 *
 * Strategy: intercept fetch via MSW (v2) so we test the real HTTP logic
 * without a running server. Each test focuses on one observable behavior.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { offerApi } from '../../../src/services/offerApi'
import type { Offer, UpdateOfferPayload } from '../../../src/types/index'

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
  allowedRoles: ['sales', 'manager', 'admin'],
  startsAt: '2024-01-01T00:00:00.000Z',
  endsAt: '2024-12-31T23:59:59.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['notebook', 'premium'],
  imageUrl: 'https://example.com/image.jpg',
  ...overrides,
})

const BASE = 'http://localhost:3001'

// ─── MSW Server ───────────────────────────────────────────────────────────────

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('offerApi.getAll', () => {
  it('returns an array of offers on success', async () => {
    const offers = [makeOffer(), makeOffer({ id: 'offer-2', title: 'Mouse Gamer' })]
    server.use(
      http.get(`${BASE}/offers`, () => HttpResponse.json(offers))
    )

    const result = await offerApi.getAll()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('offer-1')
    expect(result[1].title).toBe('Mouse Gamer')
  })

  it('throws an ApiError when the server responds with 500', async () => {
    server.use(
      http.get(`${BASE}/offers`, () =>
        new HttpResponse('Internal Server Error', { status: 500 })
      )
    )

    await expect(offerApi.getAll()).rejects.toMatchObject({ status: 500 })
  })

  it('throws an ApiError when the server responds with 404', async () => {
    server.use(
      http.get(`${BASE}/offers`, () =>
        new HttpResponse('Not Found', { status: 404 })
      )
    )

    await expect(offerApi.getAll()).rejects.toMatchObject({ status: 404 })
  })
})

// ─── getById ──────────────────────────────────────────────────────────────────

describe('offerApi.getById', () => {
  it('returns a single offer by id', async () => {
    const offer = makeOffer()
    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(offer))
    )

    const result = await offerApi.getById('offer-1')

    expect(result.id).toBe('offer-1')
    expect(result.title).toBe('Notebook Pro')
  })

  it('throws when the offer is not found (404)', async () => {
    server.use(
      http.get(`${BASE}/offers/missing`, () =>
        new HttpResponse('Not Found', { status: 404 })
      )
    )

    await expect(offerApi.getById('missing')).rejects.toMatchObject({ status: 404 })
  })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe('offerApi.update', () => {
  it('applies changes and returns the updated offer when versions match', async () => {
    const current = makeOffer({ version: 3 })
    const payload: UpdateOfferPayload = {
      id: 'offer-1',
      version: 3,
      changes: { title: 'Notebook Pro Max' },
    }
    const updated = { ...current, title: 'Notebook Pro Max', version: 4 }

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current)),
      http.patch(`${BASE}/offers/offer-1`, () => HttpResponse.json(updated))
    )

    const result = await offerApi.update(payload)

    expect(result.title).toBe('Notebook Pro Max')
    expect(result.version).toBe(4)
  })

  it('throws a 409 ApiError when versions do not match (optimistic lock conflict)', async () => {
    const current = makeOffer({ version: 5 }) // server is at v5
    const payload: UpdateOfferPayload = {
      id: 'offer-1',
      version: 3,              // client thinks it is v3
      changes: { title: 'Stale title' },
    }

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current))
    )

    await expect(offerApi.update(payload)).rejects.toMatchObject({ status: 409 })
  })

  it('throws when the PATCH request itself fails', async () => {
    const current = makeOffer({ version: 1 })
    const payload: UpdateOfferPayload = {
      id: 'offer-1',
      version: 1,
      changes: { title: 'New Title' },
    }

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current)),
      http.patch(`${BASE}/offers/offer-1`, () =>
        new HttpResponse('Server Error', { status: 500 })
      )
    )

    await expect(offerApi.update(payload)).rejects.toMatchObject({ status: 500 })
  })
})

// ─── applyStockDelta ──────────────────────────────────────────────────────────

describe('offerApi.applyStockDelta', () => {
  it('decrements stock correctly when versions match', async () => {
    const current = makeOffer({ stock: 50, version: 2 })
    const updated = { ...current, stock: 40, version: 3 }

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current)),
      http.patch(`${BASE}/offers/offer-1`, () => HttpResponse.json(updated))
    )

    const result = await offerApi.applyStockDelta('offer-1', -10, 2)

    expect(result.stock).toBe(40)
    expect(result.version).toBe(3)
  })

  it('increments stock correctly', async () => {
    const current = makeOffer({ stock: 20, version: 1 })
    const updated = { ...current, stock: 30, version: 2 }

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current)),
      http.patch(`${BASE}/offers/offer-1`, () => HttpResponse.json(updated))
    )

    const result = await offerApi.applyStockDelta('offer-1', 10, 1)

    expect(result.stock).toBe(30)
  })

  it('throws a 409 ApiError on version mismatch', async () => {
    const current = makeOffer({ stock: 50, version: 7 })

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current))
    )

    await expect(offerApi.applyStockDelta('offer-1', -5, 4)).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
    })
  })

  it('does not go below zero even when delta exceeds stock', async () => {
    const current = makeOffer({ stock: 3, version: 1 })
    let capturedBody: Record<string, unknown> = {}

    server.use(
      http.get(`${BASE}/offers/offer-1`, () => HttpResponse.json(current)),
      http.patch(`${BASE}/offers/offer-1`, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ ...current, ...capturedBody })
      })
    )

    await offerApi.applyStockDelta('offer-1', -999, 1)

    // Math.max(0, 3 + (-999)) = 0
    expect(capturedBody.stock).toBe(0)
  })
})