import { Offer, UpdateOfferPayload, ApiError } from '@/types'

const API_BASE = 'http://localhost:3001'

// ─── HTTP Client ──────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: await response.text().catch(() => 'Unknown error'),
    }
    throw error
  }

  return response.json() as Promise<T>
}

// ─── Offer API ────────────────────────────────────────────────────────────────

export const offerApi = {
  /**
   * Fetches all offers from the server.
   */
  getAll: (): Promise<Offer[]> =>
    request<Offer[]>('/offers'),

  /**
   * Fetches a single offer by ID.
   */
  getById: (id: string): Promise<Offer> =>
    request<Offer>(`/offers/${id}`),

  /**
   * Updates an offer with optimistic locking via version check.
   * In a real AWS Amplify / GraphQL setup, the condition expression
   * would enforce version matching server-side.
   *
   * Here we simulate: fetch current → compare version → patch or reject.
   */
  update: async (payload: UpdateOfferPayload): Promise<Offer> => {
    // Simulate version check (in production, server enforces this)
    const current = await request<Offer>(`/offers/${payload.id}`)

    if (current.version !== payload.version) {
      const error: ApiError = {
        status: 409,
        message: 'Version conflict: this offer was modified by another user.',
        code: 'VERSION_CONFLICT',
      }
      throw error
    }

    const updated: Partial<Offer> = {
      ...current,
      ...payload.changes,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    }

    return request<Offer>(`/offers/${payload.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updated),
    })
  },

  /**
   * Applies a stock delta operation (increment/decrement).
   * Uses deltas instead of absolute values to minimize conflicts.
   */
  applyStockDelta: async (
    offerId: string,
    delta: number,
    version: number
  ): Promise<Offer> => {
    const current = await request<Offer>(`/offers/${offerId}`)

    if (current.version !== version) {
      const error: ApiError = {
        status: 409,
        message: 'Version conflict detected during stock update.',
        code: 'VERSION_CONFLICT',
      }
      throw error
    }

    const newStock = Math.max(0, current.stock + delta)
    return request<Offer>(`/offers/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stock: newStock,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      }),
    })
  },
}
