// ─── Domain Enums ────────────────────────────────────────────────────────────

export type OfferStatus = 'active' | 'paused' | 'scheduled' | 'expired' | 'draft'
export type OfferVisibility = 'public' | 'internal' | 'restricted'
export type OfferCategory = 'electronics' | 'audio' | 'accessories' | 'software'
export type UserRole = 'sales' | 'manager' | 'admin'

// ─── Core Domain Model ───────────────────────────────────────────────────────

export interface Offer {
  id: string
  title: string
  description: string
  category: OfferCategory
  originalPrice: number
  discountedPrice: number
  discountPercentage: number
  stock: number
  minStock: number
  maxStock: number
  version: number
  status: OfferStatus
  visibility: OfferVisibility
  allowedRoles: UserRole[]
  startsAt: string
  endsAt: string
  createdAt: string
  updatedAt: string
  tags: string[]
  imageUrl: string
}

// ─── UI State Layers (Optimistic UI pattern) ─────────────────────────────────

export type SyncStatus = 'idle' | 'saving' | 'success' | 'error' | 'conflict'

export interface OfferSyncState {
  offerId: string
  status: SyncStatus
  errorMessage?: string
  conflictData?: Offer       // Server version during a conflict
  snapshot?: Offer           // Rollback snapshot
  lastSyncedAt?: Date
}

// ─── Store Shape ─────────────────────────────────────────────────────────────

export interface OffersState {
  offers: Offer[]
  syncStates: Record<string, OfferSyncState>
  selectedOfferId: string | null
  filterStatus: OfferStatus | 'all'
  filterCategory: OfferCategory | 'all'
  searchQuery: string
  isLoading: boolean
  globalError: string | null
}

// ─── Stock Operation Types ────────────────────────────────────────────────────

export type StockDelta = {
  offerId: string
  delta: number              // positive = add, negative = subtract
  reason?: string
}

export type StockUpdateResult =
  | { success: true; newStock: number }
  | { success: false; error: StockUpdateError }

export type StockUpdateError =
  | 'INSUFFICIENT_STOCK'
  | 'EXCEEDS_MAX_STOCK'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_INACTIVE'
  | 'NETWORK_ERROR'
  | 'VERSION_CONFLICT'

// ─── API Contract Types ───────────────────────────────────────────────────────

export interface UpdateOfferPayload {
  id: string
  version: number            // Optimistic lock field
  changes: Partial<Omit<Offer, 'id' | 'createdAt' | 'version'>>
}

export interface ApiError {
  status: number
  message: string
  code?: string
}

// ─── Computed / Derived Types ─────────────────────────────────────────────────

export interface OfferMetrics {
  totalOffers: number
  activeOffers: number
  criticalStockOffers: number
  outOfStockOffers: number
  totalStockValue: number
  averageDiscount: number
}

export interface StockHealth {
  level: 'healthy' | 'warning' | 'critical' | 'empty'
  percentage: number
  label: string
}
