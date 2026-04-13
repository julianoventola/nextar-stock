import { describe, it, expect } from 'vitest'
import {
  validateStockDelta,
  applyStockDelta,
  calculateDiscountedPrice,
  calculateDiscountPercentage,
  calculateSavings,
  isOfferWithinTimeWindow,
  getOfferRemainingMs,
  getEffectiveStatus,
  getStockHealth,
  canUserAccessOffer,
  computeOfferMetrics,
} from '@/utils/offerUtils'
import {
  makeOffer,
  makeExpiredOffer,
  makeCriticalStockOffer,
  makeOutOfStockOffer,
} from '../fixtures'

// ─── validateStockDelta ───────────────────────────────────────────────────────

describe('validateStockDelta', () => {
  it('returns null when decrement is valid', () => {
    const offer = makeOffer({ stock: 50, maxStock: 200 })
    expect(validateStockDelta(offer, -10)).toBeNull()
  })

  it('returns null when increment is valid', () => {
    const offer = makeOffer({ stock: 50, maxStock: 200 })
    expect(validateStockDelta(offer, 10)).toBeNull()
  })

  it('returns INSUFFICIENT_STOCK when delta would result in negative stock', () => {
    const offer = makeOffer({ stock: 5 })
    expect(validateStockDelta(offer, -10)).toBe('INSUFFICIENT_STOCK')
  })

  it('returns INSUFFICIENT_STOCK when stock is exactly zero and decrement is attempted', () => {
    const offer = makeOutOfStockOffer()
    expect(validateStockDelta(offer, -1)).toBe('INSUFFICIENT_STOCK')
  })

  it('returns EXCEEDS_MAX_STOCK when increment would exceed maxStock', () => {
    const offer = makeOffer({ stock: 195, maxStock: 200 })
    expect(validateStockDelta(offer, 10)).toBe('EXCEEDS_MAX_STOCK')
  })

  it('returns null when delta brings stock exactly to maxStock', () => {
    const offer = makeOffer({ stock: 190, maxStock: 200 })
    expect(validateStockDelta(offer, 10)).toBeNull()
  })

  it('returns null when delta brings stock exactly to zero', () => {
    const offer = makeOffer({ stock: 10 })
    expect(validateStockDelta(offer, -10)).toBeNull()
  })

  it('returns OFFER_INACTIVE when offer is paused', () => {
    const offer = makeOffer({ status: 'paused' })
    expect(validateStockDelta(offer, -1)).toBe('OFFER_INACTIVE')
  })

  it('returns OFFER_INACTIVE when offer is expired', () => {
    const offer = makeOffer({ status: 'expired' })
    expect(validateStockDelta(offer, 1)).toBe('OFFER_INACTIVE')
  })

  it('handles zero delta without error', () => {
    const offer = makeOffer({ stock: 50 })
    expect(validateStockDelta(offer, 0)).toBeNull()
  })
})

// ─── applyStockDelta ──────────────────────────────────────────────────────────

describe('applyStockDelta', () => {
  it('returns a new offer object (immutable)', () => {
    const offer = makeOffer({ stock: 50 })
    const result = applyStockDelta(offer, -10)
    expect(result).not.toBe(offer)
  })

  it('correctly decrements stock', () => {
    const offer = makeOffer({ stock: 50 })
    expect(applyStockDelta(offer, -10).stock).toBe(40)
  })

  it('correctly increments stock', () => {
    const offer = makeOffer({ stock: 50 })
    expect(applyStockDelta(offer, 20).stock).toBe(70)
  })

  it('preserves all other offer fields', () => {
    const offer = makeOffer({ stock: 50, title: 'Test Title' })
    const result = applyStockDelta(offer, -5)
    expect(result.title).toBe('Test Title')
    expect(result.id).toBe(offer.id)
  })

  it('updates the updatedAt timestamp', () => {
    const offer = makeOffer({ updatedAt: '2024-01-01T00:00:00.000Z' })
    const result = applyStockDelta(offer, -1)
    expect(result.updatedAt).not.toBe(offer.updatedAt)
  })
})

// ─── calculateDiscountedPrice ─────────────────────────────────────────────────

describe('calculateDiscountedPrice', () => {
  it('calculates 20% discount correctly', () => {
    expect(calculateDiscountedPrice(1000, 20)).toBe(800)
  })

  it('calculates 50% discount correctly', () => {
    expect(calculateDiscountedPrice(2499, 50)).toBe(1249.5)
  })

  it('returns original price for 0% discount', () => {
    expect(calculateDiscountedPrice(1000, 0)).toBe(1000)
  })

  it('returns 0 for 100% discount', () => {
    expect(calculateDiscountedPrice(1000, 100)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateDiscountedPrice(999.99, 15)
    expect(result).toBe(849.99)
  })

  it('throws RangeError for negative discount', () => {
    expect(() => calculateDiscountedPrice(1000, -5)).toThrow(RangeError)
  })

  it('throws RangeError for discount above 100', () => {
    expect(() => calculateDiscountedPrice(1000, 101)).toThrow(RangeError)
  })
})

// ─── calculateDiscountPercentage ──────────────────────────────────────────────

describe('calculateDiscountPercentage', () => {
  it('calculates 20% from prices', () => {
    expect(calculateDiscountPercentage(1000, 800)).toBe(20)
  })

  it('calculates 0% when prices are equal', () => {
    expect(calculateDiscountPercentage(1000, 1000)).toBe(0)
  })

  it('throws when discountedPrice > originalPrice', () => {
    expect(() => calculateDiscountPercentage(800, 1000)).toThrow(RangeError)
  })

  it('throws when originalPrice is zero', () => {
    expect(() => calculateDiscountPercentage(0, 0)).toThrow(RangeError)
  })
})

// ─── calculateSavings ────────────────────────────────────────────────────────

describe('calculateSavings', () => {
  it('calculates savings correctly', () => {
    const offer = makeOffer({ originalPrice: 1000, discountedPrice: 800 })
    expect(calculateSavings(offer)).toBe(200)
  })

  it('returns 0 when no discount', () => {
    const offer = makeOffer({ originalPrice: 1000, discountedPrice: 1000 })
    expect(calculateSavings(offer)).toBe(0)
  })
})

// ─── isOfferWithinTimeWindow ──────────────────────────────────────────────────

describe('isOfferWithinTimeWindow', () => {
  it('returns true when current time is within the window', () => {
    const offer = makeOffer({
      startsAt: '2024-01-01T00:00:00.000Z',
      endsAt: '2099-12-31T23:59:59.000Z',
    })
    expect(isOfferWithinTimeWindow(offer, new Date('2024-06-01'))).toBe(true)
  })

  it('returns false when current time is before the window', () => {
    const offer = makeOffer({
      startsAt: '2099-01-01T00:00:00.000Z',
      endsAt: '2099-12-31T23:59:59.000Z',
    })
    expect(isOfferWithinTimeWindow(offer, new Date('2024-01-01'))).toBe(false)
  })

  it('returns false when current time is after the window', () => {
    const offer = makeExpiredOffer()
    expect(isOfferWithinTimeWindow(offer, new Date('2024-01-01'))).toBe(false)
  })

  it('returns true on the exact start boundary', () => {
    const startDate = new Date('2024-06-01T00:00:00.000Z')
    const offer = makeOffer({
      startsAt: startDate.toISOString(),
      endsAt: '2099-12-31T23:59:59.000Z',
    })
    expect(isOfferWithinTimeWindow(offer, startDate)).toBe(true)
  })
})

// ─── getOfferRemainingMs ──────────────────────────────────────────────────────

describe('getOfferRemainingMs', () => {
  it('returns positive value for active offer', () => {
    const offer = makeOffer({ endsAt: '2099-12-31T23:59:59.000Z' })
    expect(getOfferRemainingMs(offer, new Date())).toBeGreaterThan(0)
  })

  it('returns 0 for expired offer', () => {
    const offer = makeExpiredOffer()
    expect(getOfferRemainingMs(offer, new Date('2025-01-01'))).toBe(0)
  })
})

// ─── getEffectiveStatus ───────────────────────────────────────────────────────

describe('getEffectiveStatus', () => {
  it('returns active for a valid active offer within window', () => {
    const offer = makeOffer({ status: 'active' })
    expect(getEffectiveStatus(offer, new Date('2024-06-01'))).toBe('active')
  })

  it('returns expired for an offer past its end date', () => {
    const offer = makeExpiredOffer({ status: 'active' })
    expect(getEffectiveStatus(offer, new Date('2025-01-01'))).toBe('expired')
  })

  it('returns paused regardless of time window', () => {
    const offer = makeOffer({ status: 'paused' })
    expect(getEffectiveStatus(offer, new Date('2024-06-01'))).toBe('paused')
  })

  it('returns scheduled for a future offer', () => {
    const offer = makeOffer({
      status: 'active',
      startsAt: '2099-01-01T00:00:00.000Z',
      endsAt: '2099-12-31T23:59:59.000Z',
    })
    expect(getEffectiveStatus(offer, new Date('2024-01-01'))).toBe('scheduled')
  })
})

// ─── getStockHealth ───────────────────────────────────────────────────────────

describe('getStockHealth', () => {
  it('returns empty when stock is 0', () => {
    expect(getStockHealth(makeOutOfStockOffer()).level).toBe('empty')
  })

  it('returns critical when stock is at or below minStock', () => {
    expect(getStockHealth(makeCriticalStockOffer()).level).toBe('critical')
  })

  it('returns warning when stock is between minStock and 30%', () => {
    const offer = makeOffer({ stock: 40, minStock: 10, maxStock: 200 })
    expect(getStockHealth(offer).level).toBe('warning')
  })

  it('returns healthy when stock is above 30%', () => {
    const offer = makeOffer({ stock: 100, minStock: 10, maxStock: 200 })
    expect(getStockHealth(offer).level).toBe('healthy')
  })

  it('returns percentage relative to maxStock', () => {
    const offer = makeOffer({ stock: 100, maxStock: 200 })
    expect(getStockHealth(offer).percentage).toBe(50)
  })
})

// ─── canUserAccessOffer ───────────────────────────────────────────────────────

describe('canUserAccessOffer', () => {
  it('returns true when role is in allowedRoles', () => {
    const offer = makeOffer({ allowedRoles: ['manager', 'admin'] })
    expect(canUserAccessOffer(offer, 'manager')).toBe(true)
  })

  it('returns false when role is not in allowedRoles', () => {
    const offer = makeOffer({ allowedRoles: ['admin'] })
    expect(canUserAccessOffer(offer, 'sales')).toBe(false)
  })
})

// ─── computeOfferMetrics ──────────────────────────────────────────────────────

describe('computeOfferMetrics', () => {
  it('returns zeroed metrics for empty array', () => {
    const metrics = computeOfferMetrics([])
    expect(metrics.totalOffers).toBe(0)
    expect(metrics.activeOffers).toBe(0)
    expect(metrics.averageDiscount).toBe(0)
    expect(metrics.totalStockValue).toBe(0)
  })

  it('counts total offers correctly', () => {
    const offers = [makeOffer(), makeOffer({ id: '002' }), makeOffer({ id: '003' })]
    expect(computeOfferMetrics(offers).totalOffers).toBe(3)
  })

  it('counts only active offers', () => {
    const offers = [
      makeOffer({ status: 'active' }),
      makeOffer({ id: '002', status: 'paused' }),
      makeOffer({ id: '003', status: 'active' }),
    ]
    expect(computeOfferMetrics(offers).activeOffers).toBe(2)
  })

  it('counts critical stock offers correctly', () => {
    const offers = [
      makeCriticalStockOffer({ id: '001' }),
      makeCriticalStockOffer({ id: '002' }),
      makeOffer({ id: '003', stock: 100 }),
    ]
    expect(computeOfferMetrics(offers).criticalStockOffers).toBe(2)
  })

  it('counts out-of-stock offers correctly', () => {
    const offers = [
      makeOutOfStockOffer({ id: '001' }),
      makeOffer({ id: '002', stock: 10 }),
    ]
    expect(computeOfferMetrics(offers).outOfStockOffers).toBe(1)
  })

  it('calculates total stock value as discountedPrice * stock', () => {
    const offers = [
      makeOffer({ discountedPrice: 100, stock: 10 }),
      makeOffer({ id: '002', discountedPrice: 200, stock: 5 }),
    ]
    expect(computeOfferMetrics(offers).totalStockValue).toBe(2000)
  })

  it('calculates average discount correctly', () => {
    const offers = [
      makeOffer({ discountPercentage: 20 }),
      makeOffer({ id: '002', discountPercentage: 40 }),
    ]
    expect(computeOfferMetrics(offers).averageDiscount).toBe(30)
  })
})
