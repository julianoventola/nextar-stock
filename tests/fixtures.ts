import { Offer } from '../src/types'

export const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'offer-test-001',
  title: 'Produto Teste',
  description: 'Descrição do produto teste',
  category: 'electronics',
  originalPrice: 1000,
  discountedPrice: 800,
  discountPercentage: 20,
  stock: 50,
  minStock: 10,
  maxStock: 200,
  version: 1,
  status: 'active',
  visibility: 'public',
  allowedRoles: ['sales', 'manager', 'admin'],
  startsAt: '2024-01-01T00:00:00.000Z',
  endsAt: '2099-12-31T23:59:59.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: ['teste'],
  imageUrl: 'https://via.placeholder.com/400',
  ...overrides,
})

export const makeExpiredOffer = (overrides: Partial<Offer> = {}): Offer =>
  makeOffer({
    status: 'active',
    startsAt: '2020-01-01T00:00:00.000Z',
    endsAt: '2020-12-31T23:59:59.000Z',
    ...overrides,
  })

export const makeCriticalStockOffer = (overrides: Partial<Offer> = {}): Offer =>
  makeOffer({ stock: 3, minStock: 10, ...overrides })

export const makeOutOfStockOffer = (overrides: Partial<Offer> = {}): Offer =>
  makeOffer({ stock: 0, ...overrides })
