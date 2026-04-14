import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import {
  useFilteredOffers,
  useOfferMetrics,
  useOfferSyncState,
  useOffer,
  useOfferActions
} from '../../../src/hooks/useOffers'
import { useOffersStore } from '../../../src/store/offersStore'
import * as offerUtils from '../../../src/utils/offerUtils'

// Mock da store do Zustand
vi.mock('../../../src/store/offersStore', () => ({
  useOffersStore: vi.fn(),
  selectFilteredOffers: vi.fn(),
  selectSyncState: vi.fn(),
  selectOfferById: vi.fn(),
}))

// Mock dos utilitários
vi.mock('../../../src/utils/offerUtils', () => ({
  computeOfferMetrics: vi.fn(),
}))

describe('useOffers Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useOfferMetrics', () => {
    it('deve calcular e retornar as métricas das ofertas', () => {
      const mockOffers = [{ id: '1', stock: 10 }]
      const mockMetrics = { totalStock: 10, count: 1 }

      vi.mocked(useOffersStore).mockReturnValue(mockOffers)
      vi.mocked(offerUtils.computeOfferMetrics).mockReturnValue(mockMetrics)

      const { result } = renderHook(() => useOfferMetrics())

      expect(offerUtils.computeOfferMetrics).toHaveBeenCalledWith(mockOffers)
      expect(result.current).toEqual(mockMetrics)
    })
  })

  describe('useOfferSyncState', () => {
    it('deve retornar o estado de sincronização de uma oferta específica', () => {
      const mockSyncState = { status: 'loading' }
      vi.mocked(useOffersStore).mockReturnValue(mockSyncState)

      const { result } = renderHook(() => useOfferSyncState('123'))

      expect(result.current).toEqual(mockSyncState)
    })
  })

  describe('useOffer', () => {
    it('deve retornar uma única oferta pelo ID', () => {
      const mockOffer = { id: '1', name: 'Stock Item' }
      vi.mocked(useOffersStore).mockReturnValue(mockOffer)

      const { result } = renderHook(() => useOffer('1'))

      expect(result.current).toEqual(mockOffer)
    })
  })

  describe('useOfferActions', () => {
    it('deve retornar todas as ações da store', () => {
      const mockActions = {
        fetchOffers: vi.fn(),
        updateStockOptimistic: vi.fn(),
        selectOffer: vi.fn(),
        // ... outras ações
      }

      vi.mocked(useOffersStore).mockImplementation((selector: any) =>
        selector(mockActions)
      )

      const { result } = renderHook(() => useOfferActions())

      expect(result.current.fetchOffers).toBeDefined()
      expect(result.current.updateStockOptimistic).toBeDefined()
      expect(typeof result.current.selectOffer).toBe('function')
    })
  })
})