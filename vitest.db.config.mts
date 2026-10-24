import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globalSetup: ['./tests/helpers/testcontainers-global-setup.ts'],
    setupFiles: ['./tests/helpers/testcontainers-env-setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    pool: 'forks',
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
