import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

import { validateE2EEnvironment } from './tests/helpers/e2eSafety'

const { webServerEnv } = validateE2EEnvironment(process.env)
const e2eUploadsDirectory = path.resolve(process.cwd(), 'uploads')

// Fixture workers and Next's standalone server run with different cwd values.
// Give both Payload instances one explicit local upload root.
process.env.PAYLOAD_UPLOADS_DIR = e2eUploadsDirectory
webServerEnv.PAYLOAD_UPLOADS_DIR = e2eUploadsDirectory

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/globalSetup.ts',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Keep retries for traces, but never let a flaky retry make the release gate green. */
  failOnFlakyTests: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* REST/Local API E2E fixtures share one scratch database and server cache. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    // Browser release tests exercise the same optimized server image path as
    // deployment. This also avoids development-only Fast Refresh behavior
    // obscuring real Live Preview navigation and hydration results.
    command: 'pnpm start:standalone',
    env: webServerEnv,
    reuseExistingServer: false,
    // Avoid warming public `use cache` loaders before E2E fixtures exist.
    url: 'http://localhost:3000/admin/login',
  },
})
