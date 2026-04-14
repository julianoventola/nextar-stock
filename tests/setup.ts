import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { setupServer } from 'msw/node'

export const server = setupServer()

beforeAll(() => server.listen({
  onUnhandledRequest: 'bypass',
}))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Suppress console.error noise in tests
vi.spyOn(console, 'error').mockImplementation(() => { })
