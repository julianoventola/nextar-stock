import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: './tests/setup.ts',
    exclude: [...configDefaults.exclude, 'packages/template/*'],
  }
})
