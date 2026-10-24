import { expect, test } from '@playwright/test'

import { resolveCollectionPath } from '../../src/utilities/collectionRoutes'
import { PUBLIC_ROUTES_FIXTURE } from '../helpers/publicRoutesFixtures'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'
import { login } from '../helpers/login'

const BASE_URL = 'http://localhost:3000'

test.describe('public sitemap and official redirects', () => {
  test('does not expose the unused GraphQL API or Playground', async ({ request }) => {
    const [api, playground] = await Promise.all([
      request.post(`${BASE_URL}/api/graphql`, {
        data: { query: '{ __typename }' },
      }),
      request.get(`${BASE_URL}/api/graphql-playground`),
    ])

    expect(api.status()).toBe(404)
    expect(playground.status()).toBe(404)
  })

  test('hardens Preview responses against referrer, cache, and crawler exposure', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/next/preview?previewSession=invalid-opaque-token`,
    )

    expect(response.status()).toBe(401)
    expect(response.headers()['referrer-policy']).toBe('no-referrer')
    expect(response.headers()['cache-control']).toBe('private, no-store, max-age=0')
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive')
  })

  test('serves registry-derived, published-only page URLs in the actual sitemap', async ({
    page,
    request,
  }) => {
    // The production build may have prerendered the sitemap before E2E
    // fixtures existed. Mutate the published fixture through the real REST
    // route so the collection hook invalidates the same cache tag at runtime.
    await seedTestUser()
    try {
      const lookup = await request.get(
        `${BASE_URL}/api/pages?where[slug][equals]=${PUBLIC_ROUTES_FIXTURE.publishedPageSlug}&limit=1&locale=en`,
      )
      const lookupBody = (await lookup.json()) as { docs?: Array<{ id?: number | string }> }
      const pageID = lookupBody.docs?.[0]?.id
      if (pageID == null) throw new Error('Published sitemap fixture was not found.')

      await login({ page, user: testUser })
      const mutationStatus = await page.evaluate(
        async ({ id }) => {
          const response = await fetch(`/api/pages/${id}?locale=en`, {
            body: JSON.stringify({ title: 'PR25 sitemap published fixture refreshed' }),
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            method: 'PATCH',
          })
          return response.status
        },
        { id: pageID },
      )
      expect(mutationStatus).toBe(200)

      const response = await request.get(`${BASE_URL}/pages-sitemap.xml`)

      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain('application/xml')

      const xml = await response.text()
      const publishedPath = resolveCollectionPath('pages', {
        slug: PUBLIC_ROUTES_FIXTURE.publishedPageSlug,
      })
      const draftPath = resolveCollectionPath('pages', {
        slug: PUBLIC_ROUTES_FIXTURE.draftPageSlug,
      })
      const homePath = resolveCollectionPath('pages', { slug: 'home' })

      expect(publishedPath).not.toBeNull()
      expect(draftPath).not.toBeNull()
      expect(homePath).toBe('/')
      const sitemapPaths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), ([, loc]) => {
        return new URL(loc).pathname
      })

      expect(sitemapPaths).toContain(publishedPath)
      expect(sitemapPaths).toContain(homePath)
      expect(sitemapPaths).not.toContain(draftPath)
    } finally {
      await cleanupTestUser()
    }
  })

  test('resolves a simple old path through the official redirects collection', async ({ page }) => {
    await page.goto(`${BASE_URL}${PUBLIC_ROUTES_FIXTURE.simpleRedirectFrom}`)

    // These routes use Partial Prerendering, so Next may deliver its redirect
    // as a streamed meta redirect instead of an initial 308 response. Assert
    // the browser-visible outcome rather than an implementation-specific code.
    await expect(page).toHaveURL(`${BASE_URL}${PUBLIC_ROUTES_FIXTURE.simpleRedirectTo}`)
  })

  test('resolves nested Program and Study Plan old paths', async ({ page }) => {
    await page.goto(`${BASE_URL}${PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath}`)
    await expect(page).toHaveURL(`${BASE_URL}${PUBLIC_ROUTES_FIXTURE.nestedProgramNewPath}`)

    await page.goto(`${BASE_URL}${PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath}/study-plan`)
    await expect(page).toHaveURL(
      `${BASE_URL}${PUBLIC_ROUTES_FIXTURE.nestedProgramNewPath}/study-plan`,
    )
  })
})
