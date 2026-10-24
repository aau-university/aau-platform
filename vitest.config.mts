import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    // The complete suite transforms 180+ Next/Payload test modules in parallel.
    // Windows CI can spend more than Vitest's 5s default compiling a cold
    // cache even though the same tests complete immediately in isolation.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx',
    ],
  },
})
