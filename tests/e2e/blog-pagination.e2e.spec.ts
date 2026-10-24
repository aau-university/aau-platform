import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'

import {
  createBlogPostFixture,
  deleteBlogPostFixture,
  E2E_BASE_URL,
  type PayloadID,
  randomPayloadIDBase,
  updateBlogPostFixture,
} from '../helpers/payloadLocalFixtures'

const PAGE_SIZE = 9
const POST_COUNT = PAGE_SIZE + 1

test.describe('Blog pagination with localized published posts', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  const runPrefix = `e2e-blog-${randomUUID()}`
  const fixtureIDBase = randomPayloadIDBase(POST_COUNT)
  const createdPostIDs: PayloadID[] = []
  const titles = {
    ar: Array.from({ length: POST_COUNT }, (_, index) => `${runPrefix}-ar-${index}`),
    en: Array.from({ length: POST_COUNT }, (_, index) => `${runPrefix}-en-${index}`),
  }
  test.beforeAll(async () => {
    for (let index = 0; index < POST_COUNT; index += 1) {
      const publishedAt = new Date(Date.UTC(2099, 0, index + 1)).toISOString()
      const post = await createBlogPostFixture({
        id: fixtureIDBase + index,
        title: titles.ar[index],
        slug: `${runPrefix}-${index}`,
        excerpt: `${runPrefix}-excerpt-ar-${index}`,
        publishedAt,
      })
      createdPostIDs.push(post.id)
      await updateBlogPostFixture(post.id, {
        title: titles.en[index],
        excerpt: `${runPrefix}-excerpt-en-${index}`,
      })
    }
  })

  test.afterAll(async () => {
    const cleanupErrors: unknown[] = []
    for (const id of createdPostIDs.reverse()) {
      try {
        await deleteBlogPostFixture(id)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Blog E2E cleanup failed.')
  })

  for (const locale of ['ar', 'en'] as const) {
    test(`opens page 2 and renders the ${locale} scratch post`, async ({ context, page }) => {
      await context.addCookies([
        { name: 'aau_lang', value: locale, domain: 'localhost', path: '/' },
      ])
      await page.goto(`${E2E_BASE_URL}/blog`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)

      const paginationName = locale === 'ar' ? 'ترقيم الصفحات' : 'Pagination'
      const pagination = page.getByRole('navigation', { name: paginationName, exact: true })
      await expect(pagination).toBeVisible()
      await pagination.getByRole('link', { name: '2', exact: true }).click()

      await expect(page).toHaveURL(`${E2E_BASE_URL}/blog?page=2`)
      await expect(pagination.getByRole('link', { name: '2', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(page.getByText(titles[locale][0], { exact: true }).first()).toBeVisible()
      await expect(page.getByText(titles[locale][POST_COUNT - 1], { exact: true })).toHaveCount(0)
    })
  }
})
