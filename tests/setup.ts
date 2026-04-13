import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Suppress console.error noise in tests
vi.spyOn(console, 'error').mockImplementation(() => {})
