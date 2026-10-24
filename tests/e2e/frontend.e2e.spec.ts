import { test, expect, type Page } from '@playwright/test'

/**
 * Frontend smoke E2E.
 *
 * Asserts the AAU homepage (NOT the Payload Blank Template) and the
 * same-URL language toggle behavior.
 *
 * This test requires the dev server to be running. It is run by
 * `pnpm test:e2e` via the Playwright `webServer` config which boots
 * `pnpm dev`. The Payload server itself only needs to boot — these tests
 * do NOT depend on a populated DB because the homepage falls back to
 * static dictionary content when Payload has no `pages` or `home-page`.
 */

test.describe('Public homepage (single root, no /ar or /en)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('renders the AAU homepage, not the Payload starter', async ({ page }: { page: Page }) => {
    await page.goto('http://localhost:3000/')
    // We don't navigate to /ar — the URL stays at /.
    await expect(page).toHaveURL('http://localhost:3000/')

    // The hero is present.
    const hero = page.getByTestId('home-hero')
    await expect(hero).toBeVisible()

    // The starter copy from the template is NOT here.
    await expect(page.getByText('Welcome to your new project.')).toHaveCount(0)
    await expect(page.getByText('Payload Blank Template')).toHaveCount(0)
  })

  test('Arabic is the default and html has lang=ar dir=rtl', async ({ page }: { page: Page }) => {
    await page.goto('http://localhost:3000/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('toggle switches language in place — URL does NOT change', async ({
    page,
  }: { page: Page }) => {
    await page.goto('http://localhost:3000/')
    const urlBefore = page.url()

    // Click the language toggle.
    await page.getByTestId('language-toggle').first().click()

    // URL stayed the same.
    expect(page.url()).toBe(urlBefore)

    // html attributes flipped.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    // English copy is visible.
    await expect(page.getByTestId('home-hero').getByText('Start Your Journey')).toBeVisible()
  })
})
