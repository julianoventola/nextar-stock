import {
  type Offer,
  type OfferMetrics,
  type StockHealth,
  type StockUpdateError,
  type UserRole
} from '../types/index'

// ─── Stock Validation ─────────────────────────────────────────────────────────

/**
 * Validates if a stock delta operation is valid for the given offer.
 * Returns null if valid, or an error code if invalid.
 * (Single Responsibility: only validates, doesn't mutate)
 */
export function validateStockDelta(
  offer: Offer,
  delta: number
): StockUpdateError | null {
  if (!offer) return 'OFFER_NOT_FOUND'
  if (offer.status !== 'active') return 'OFFER_INACTIVE'

  const projectedStock = offer.stock + delta

  if (projectedStock < 0) return 'INSUFFICIENT_STOCK'
  if (projectedStock > offer.maxStock) return 'EXCEEDS_MAX_STOCK'

  return null
}

/**
 * Applies a delta to the offer's stock.
 * Pure function — does NOT mutate the original offer.
 */
export function applyStockDelta(offer: Offer, delta: number): Offer {
  return {
    ...offer,
    stock: offer.stock + delta,
    updatedAt: new Date().toISOString()
  }
}

// ─── Discount Calculations ────────────────────────────────────────────────────

/**
 * Calculates the discounted price given an original price and percentage.
 * Rounds to 2 decimal places using banker's rounding strategy.
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercentage: number
): number {
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new RangeError('discountPercentage must be between 0 and 100')
  }
  const raw = originalPrice * (1 - discountPercentage / 100)
  return Math.round(raw * 100) / 100
}

/**
 * Calculates the discount percentage from original and discounted prices.
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  discountedPrice: number
): number {
  if (originalPrice <= 0) throw new RangeError('originalPrice must be positive')
  if (discountedPrice > originalPrice) {
    throw new RangeError('discountedPrice cannot exceed originalPrice')
  }
  const raw = ((originalPrice - discountedPrice) / originalPrice) * 100
  return Math.round(raw * 100) / 100
}

/**
 * Calculates the absolute savings amount.
 */
export function calculateSavings(offer: Offer): number {
  return Math.round((offer.originalPrice - offer.discountedPrice) * 100) / 100
}

// ─── Time Window Validation ───────────────────────────────────────────────────

/**
 * Checks if an offer is within its active time window.
 * Injectable `now` parameter makes this fully testable.
 */
export function isOfferWithinTimeWindow(offer: Offer, now: Date = new Date()): boolean {
  const start = new Date(offer.startsAt)
  const end = new Date(offer.endsAt)
  return now >= start && now <= end
}

/**
 * Returns the remaining time in milliseconds for an offer.
 */
export function getOfferRemainingMs(offer: Offer, now: Date = new Date()): number {
  const end = new Date(offer.endsAt)
  return Math.max(0, end.getTime() - now.getTime())
}

/**
 * Determines the computed status of an offer factoring in time window.
 */
export function getEffectiveStatus(offer: Offer, now: Date = new Date()): Offer['status'] {
  if (offer.status === 'paused' || offer.status === 'draft') return offer.status
  const start = new Date(offer.startsAt)
  const end = new Date(offer.endsAt)
  if (now < start) return 'scheduled'
  if (now > end) return 'expired'
  return 'active'
}

// ─── Stock Health ─────────────────────────────────────────────────────────────

/**
 * Evaluates the stock health level of an offer.
 */
export function getStockHealth(offer: Offer): StockHealth {
  if (offer.stock === 0) {
    return { level: 'empty', percentage: 0, label: 'Esgotado' }
  }

  const percentage = Math.round((offer.stock / offer.maxStock) * 100)

  if (offer.stock <= offer.minStock) {
    return { level: 'critical', percentage, label: 'Crítico' }
  }

  if (percentage <= 30) {
    return { level: 'warning', percentage, label: 'Baixo' }
  }

  return { level: 'healthy', percentage, label: 'Normal' }
}

// ─── Visibility & Access Control ─────────────────────────────────────────────

/**
 * Determines if a user with a given role can see/edit an offer.
 * (Open/Closed Principle: extend roles without modifying logic)
 */
export function canUserAccessOffer(offer: Offer, userRole: UserRole): boolean {
  return offer.allowedRoles.includes(userRole)
}

// ─── Metrics Calculation ──────────────────────────────────────────────────────

/**
 * Computes dashboard-level metrics from a list of offers.
 * Pure function — safe to memoize.
 */
export function computeOfferMetrics(offers: Offer[]): OfferMetrics {
  const activeOffers = offers.filter(o => o.status === 'active')

  return {
    totalOffers: offers.length,
    activeOffers: activeOffers.length,
    criticalStockOffers: offers.filter(
      o => o.stock > 0 && o.stock <= o.minStock
    ).length,
    outOfStockOffers: offers.filter(o => o.stock === 0).length,
    totalStockValue: offers.reduce(
      (acc, o) => acc + o.discountedPrice * o.stock,
      0
    ),
    averageDiscount:
      offers.length === 0
        ? 0
        : Math.round(
          (offers.reduce((acc, o) => acc + o.discountPercentage, 0) /
            offers.length) *
          100
        ) / 100,
  }
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(0)}%`
}
