import { test, expect } from '@playwright/test'

/**
 * V2-02 Frontend Route Smoke E2E.
 *
 * Covers all routes ported under PR-032 → PR-049 (about, news, events,
 * blog, colleges, faculty, campus-life, centers, projects-studio,
 * research/{journal,articles}, offers, faq, partners, team, contact,
 * admission, email-request).
 *
 * Smoke contract per route:
 *   1. Goto route — must respond (no 500 / no Next.js error overlay)
 *   2. <body> is not empty
 *   3. A heading (h1/h2) or main landmark is present
 *
 * Form routes (contact, admission, email-request) additionally assert
 * that a <form> and the expected field name(s) are present.
 *
 * The honeypot audit covers ALL three public forms — contact, admission,
 * and email-request all ship a hidden `_hp` honeypot field per their
 * respective Zod schemas (`contactSchema`, `joinRequestSchema`,
 * `emailRequestSchema`). The field must exist in the DOM (so the server
 * can validate it) but be hidden from real users.
 *
 * This test reuses the Playwright `webServer` config from
 * `playwright.config.ts` (boots `pnpm dev` on http://localhost:3000).
 * It does NOT require a populated DB — every loader falls back to
 * safe defaults when Payload returns no rows.
 */

const BASE = 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Route list — every V2-02 ported route (PR-032 → PR-049)
// ---------------------------------------------------------------------------
const routes = [
  '/about',
  '/news',
  '/events',
  '/blog',
  '/colleges',
  '/faculty',
  '/campus-life',
  '/centers',
  '/projects-studio',
  '/research/journal',
  '/research/articles',
  '/offers',
  '/faq',
  '/partners',
  '/team',
  '/contact',
  '/admission',
  '/email-request',
]

// ---------------------------------------------------------------------------
// Smoke tests — one test per route
// ---------------------------------------------------------------------------
for (const route of routes) {
  test(`${route} responds and renders without crash`, async ({ page }) => {
    // Collect console errors + page errors while loading
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })

    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })

    // 1. HTTP response should not be a server error
    expect(response, `${route} returned no response`).not.toBeNull()
    expect(response!.status(), `${route} returned HTTP ${response!.status()}`).toBeLessThan(500)

    // 2. No Next.js runtime error overlay.
    //    In Next 16 dev mode the portal element is always mounted, so we
    //    assert that it does NOT contain a visible error dialog instead of
    //    asserting the element is absent.
    await expect(page.locator('nextjs-portal')).toBeHidden({ timeout: 3_000 }).catch(() => {})
    await expect(
      page.locator('[data-nextjs-dialog] h1, [data-nextjs-dialog] [role="alert"]'),
    ).toHaveCount(0)
    await expect(page.locator('text=Unhandled Runtime Error')).toHaveCount(0)
    await expect(page.locator('text=Application error')).toHaveCount(0)

    // 3. <body> should not be empty
    await expect(page.locator('body')).not.toBeEmpty()

    // 4. Should have at least one heading or main landmark
    const hasContent = await page.locator('h1, h2, main, [role="main"]').count()
    expect(hasContent, `${route} has no h1/h2/main landmark`).toBeGreaterThan(0)

    // 5. Record (but do not hard-fail on) console errors — surfaced in the
    //    audit report. Hydration warnings and 3rd-party noise are common
    //    during `next dev` and should not block this smoke suite.
    if (pageErrors.length > 0) {
      console.log(`[${route}] page errors:`, pageErrors)
    }
    if (consoleErrors.length > 0) {
      console.log(`[${route}] console errors:`, consoleErrors)
    }
  })
}

// ---------------------------------------------------------------------------
// Form-route assertions
// ---------------------------------------------------------------------------
test.describe('Form routes — field presence', () => {
  test('/contact renders the contact form with expected fields', async ({ page }) => {
    await page.goto(`${BASE}/contact`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15_000 })
    // ContactForm.client.tsx uses raw <input name="name|email|phone|subject|message">
    await expect(page.locator('input[name="name"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
  })

  test('/admission renders the multi-step admission form', async ({ page }) => {
    await page.goto(`${BASE}/admission`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15_000 })
    // AdmissionForm.client.tsx uses <input name="fullName"> as its first field
    await expect(page.locator('input[name="fullName"]').first()).toBeVisible()
  })

  test('/email-request renders the email-request form with expected fields', async ({ page }) => {
    await page.goto(`${BASE}/email-request`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15_000 })
    // EmailRequestForm.client.tsx uses <input name="fullName"> and a honeypot
    await expect(page.locator('input[name="fullName"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Honeypot audit — every public form (contact, admission, email-request)
// ships a hidden `_hp` honeypot field per `contactSchema`/`joinRequestSchema`/
// `emailRequestSchema`. The field must be present in the DOM (so the server
// can validate it) but hidden from real users.
// ---------------------------------------------------------------------------
test.describe('Honeypot field — present and hidden on every public form', () => {
  for (const route of ['/contact', '/admission', '/email-request']) {
    test(`${route} honeypot (_hp) is present and hidden`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      // Wait for the form to render — loaders are wrapped in <Suspense>.
      await expect(page.locator('form').first()).toBeVisible({ timeout: 15_000 })
      const honeypot = page.locator('input[name="_hp"]')
      await expect(honeypot).toHaveCount(1)
      await expect(honeypot).toBeHidden()
    })
  }
})
