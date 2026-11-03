/**
 * Authenticated Admin content assertions.
 *
 * ── Why HTTP 200 is not the test ──────────────────────────────────────────
 * On 2026-09-14 every one of these routes returned 200 with a fully rendered
 * Admin shell — Apache, Next and Payload all healthy — and a blank content
 * area. Payload caught the database error inside the list-view data fetch and
 * rendered the page anyway. A status-code test, a "page loads" test and a
 * "body is visible" test would all have passed throughout.
 *
 * So each route here is asserted on the CONTENT it is supposed to show: a
 * collection list must contain its own fixture document by name, and a global
 * must render its editor with the fixture value in it. Both fail if the data
 * fetch behind the view returns nothing, whatever the status code.
 *
 * ── Controls ──────────────────────────────────────────────────────────────
 * Pages, News and Analytics Settings are the three entities that kept working
 * on staging. They are asserted identically, so a change that breaks every
 * route equally cannot pass by breaking the controls too.
 */
import { expect, test, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config.js'
import {
  ADMIN_CONTENT_FIXTURE,
  createAdminContentFixtures,
  deleteAdminContentFixtures,
} from '../helpers/adminContentFixtures'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

const BASE = 'http://localhost:3000'

/**
 * Text Payload renders when the view's own data fetch failed. Asserted as
 * ABSENT on every route: this is the literal string the staging outage put in
 * the logs, and the class of failure the whole file exists to catch.
 */
const FAILURE_TEXTS = [
  'There was an error',
  'permission denied',
  'Failed query',
  'Something went wrong',
]

interface CollectionRoute {
  slug: string
  label: string
  /** The fixture document that must appear in the list. */
  expected: string
  control?: boolean
}

const COLLECTION_ROUTES: CollectionRoute[] = [
  { slug: 'pages', label: 'Pages', expected: ADMIN_CONTENT_FIXTURE.page.any, control: true },
  { slug: 'news', label: 'News', expected: ADMIN_CONTENT_FIXTURE.news.any, control: true },
  { slug: 'colleges', label: 'Colleges', expected: ADMIN_CONTENT_FIXTURE.college.any },
  {
    slug: 'academic-departments',
    label: 'Academic Departments',
    expected: ADMIN_CONTENT_FIXTURE.department.any,
  },
  {
    slug: 'academic-programs',
    label: 'Academic Programs',
    expected: ADMIN_CONTENT_FIXTURE.program.any,
  },
  {
    slug: 'faculty-members',
    label: 'Faculty Members',
    expected: ADMIN_CONTENT_FIXTURE.facultyMember.any,
  },
  { slug: 'study-plans', label: 'Study Plans', expected: ADMIN_CONTENT_FIXTURE.studyPlan.any },
]

interface GlobalRoute {
  slug: string
  /** A value that must be rendered into the global's editor. */
  expected?: string
  control?: boolean
}

const GLOBAL_ROUTES: GlobalRoute[] = [
  { slug: 'site-settings', expected: ADMIN_CONTENT_FIXTURE.siteName.ar },
  { slug: 'about-page', expected: ADMIN_CONTENT_FIXTURE.aboutBadge.ar },
  { slug: 'contact-settings' },
  { slug: 'navbar-settings' },
  { slug: 'footer-settings' },
  { slug: 'analytics-settings', control: true },
]

/** Assert the view rendered its data rather than an error surface. */
async function expectNoDataFailure(page: Page): Promise<void> {
  const body = (await page.locator('body').innerText()) ?? ''
  for (const failure of FAILURE_TEXTS) {
    expect(body, `the page reports a data failure: ${failure}`).not.toContain(failure)
  }
}

test.describe('Admin renders real content for every versioned entity', () => {
  test.describe.configure({ timeout: 180_000 })

  let page: Page
  let payload: Payload

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000)
    payload = await getPayload({ config })
    await createAdminContentFixtures(payload)

    await seedTestUser()
    const context = await browser.newContext()
    page = await context.newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    // Guarded: if the `browser` fixture fails to launch, Playwright never runs
    // the beforeAll body, so `payload` is undefined here — and an unguarded
    // teardown then throws a second, unrelated error that hides the real one.
    await cleanupTestUser().catch(() => undefined)
    if (payload) {
      await deleteAdminContentFixtures(payload)
    }
    // `payload.destroy()` is deliberately NOT called. Playwright runs this suite
    // with `workers: 1`, so every spec file shares ONE Node process and one
    // cached Payload instance — destroying it here tore down the database
    // adapter for every spec that runs afterwards. This file sorts first
    // ('admin-content' before 'admin.'), so the very next file failed inside
    // drizzle's buildQuery with "Cannot read properties of undefined (reading
    // 'id')" while looking entirely unrelated to this change. The instance
    // belongs to tests/e2e/globalSetup.ts, which destroys it in its teardown
    // once every spec has finished.
  })

  for (const route of COLLECTION_ROUTES) {
    const kind = route.control ? 'control' : 'affected'
    test(`/admin/collections/${route.slug} lists its content (${kind})`, async () => {
      await page.goto(`${BASE}/admin/collections/${route.slug}`)
      await expect(page).toHaveURL(new RegExp(`/admin/collections/${route.slug}(\\?.*)?$`))

      // The view rendered at all.
      await expect(page.locator('h1').first()).toBeVisible()

      // The view rendered its DATA. This is the assertion the outage would
      // have failed: the document exists in the main table, and appears here
      // only if the version-backed list query succeeded and returned it.
      await expect(
        page.getByText(route.expected, { exact: false }).first(),
        `${route.slug} list view does not show ${route.expected}`,
      ).toBeVisible({ timeout: 30_000 })

      await expectNoDataFailure(page)
    })
  }

  for (const route of GLOBAL_ROUTES) {
    const kind = route.control ? 'control' : 'affected'
    test(`/admin/globals/${route.slug} renders its editor (${kind})`, async () => {
      await page.goto(`${BASE}/admin/globals/${route.slug}`)
      await expect(page).toHaveURL(new RegExp(`/admin/globals/${route.slug}(\\?.*)?$`))

      await expect(page.locator('h1').first()).toBeVisible()
      // A global's edit view is a form with a save control. An empty content
      // area renders neither.
      await expect(page.locator('form').first()).toBeVisible({ timeout: 30_000 })

      if (route.expected) {
        await expect(
          page.locator(`input[value="${route.expected}"]`).first(),
          `${route.slug} editor does not show ${route.expected}`,
        ).toBeVisible({ timeout: 30_000 })
      }

      await expectNoDataFailure(page)
    })
  }

  test('the document history is visible in the Admin versions view', async () => {
    // An editor must be able to see and roll back to a version. A row in the
    // database that the Versions view does not list is not useful history.
    const { docs } = await payload.find({
      collection: 'colleges',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: 'pr27-admin-college' } },
    })
    const college = docs[0]
    expect(college, 'the college fixture should exist').toBeTruthy()

    await page.goto(`${BASE}/admin/collections/colleges/${college!.id}/versions`)
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expectNoDataFailure(page)

    // The fixture is created normally (create + second-locale update), so it
    // carries real version history; the Neon backfill that used to leave
    // exactly one canonical version was removed.
    const versions = await payload.countVersions({
      collection: 'colleges',
      overrideAccess: true,
      where: { parent: { equals: college!.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)
  })

  test('localized content survives the backfill and renders in the Admin', async () => {
    // Arabic is this platform's DEFAULT locale and the language most of the
    // migrated content is written in, so a backfill that lost the `ar` locale
    // row would leave the Admin blank for real editors while looking perfectly
    // fine in English. Both locales are asserted, on the same document.
    await page.goto(`${BASE}/admin/collections/colleges?locale=ar`)
    await expect(page.getByText(ADMIN_CONTENT_FIXTURE.college.ar).first()).toBeVisible({
      timeout: 30_000,
    })
    await expectNoDataFailure(page)

    await page.goto(`${BASE}/admin/collections/colleges?locale=en`)
    await expect(page.getByText(ADMIN_CONTENT_FIXTURE.college.en).first()).toBeVisible({
      timeout: 30_000,
    })
    await expectNoDataFailure(page)
  })
})
