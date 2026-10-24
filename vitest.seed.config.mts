import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['./tests/helpers/testcontainers-global-setup.ts'],
    hookTimeout: 5_400_000,
    include: ['tests/seed/**/*.int.spec.ts'],
    setupFiles: [
      './tests/helpers/testcontainers-env-setup.ts',
      './tests/seed/setup.ts',
    ],
    testTimeout: 5_400_000,
  },
})
