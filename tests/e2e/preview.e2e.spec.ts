import { expect, type BrowserContext, type Page, type Request, test } from '@playwright/test'
import { decodeJwt } from 'jose'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config.js'
import { createOrReusePreviewSession } from '../../src/lib/payload/preview-session'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'
import { login } from '../helpers/login'
import { findPreviewFixtureIDs, PREVIEW_FIXTURE } from '../helpers/previewFixtures'

const BASE_URL = 'http://localhost:3000'
const {
  draftHome: DRAFT_HOME,
  dynamicDraftTitle: DYNAMIC_DRAFT_TITLE,
  dynamicNewSlug: DYNAMIC_NEW_SLUG,
  dynamicOldSlug: DYNAMIC_OLD_SLUG,
  publicHome: PUBLIC_HOME,
} = PREVIEW_FIXTURE

const FIXTURE_CONTEXT = { disableRevalidate: true } as const

function previewEntryURL(token: string): string {
  return `${BASE_URL}/next/preview?previewSession=${encodeURIComponent(token)}`
}

async function expectPreviewEntryStatus(
  context: BrowserContext,
  token: string,
  expected: number | ((status: number) => void),
): Promise<void> {
  const probe = await context.newPage()
  try {
    const response = await probe.goto(previewEntryURL(token))
    if (!response) throw new Error('Preview authorization probe returned no response.')
    if (expected === 307) {
      expect(response.ok(), await response.text()).toBe(true)
      expect(probe.url()).not.toBe(previewEntryURL(token))
    } else if (typeof expected === 'number') {
      expect(response.status(), await response.text()).toBe(expected)
    } else {
      const body = await response.text()
      try {
        expected(response.status())
      } catch (error) {
        throw new Error(`Unexpected Preview response ${response.status()}: ${body}`, {
          cause: error,
        })
      }
    }
  } finally {
    await probe.close()
  }
}

async function reauthenticate(
  context: BrowserContext,
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await context.clearCookies()
  await login({ page, user })
  await expect(page).toHaveURL(new RegExp(`${BASE_URL}/admin/?$`))
}

async function waitForAutosave(
  page: Page,
  collection: string,
  documentID: number | string,
  title: string,
) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      response.request().method() === 'PATCH' &&
      url.pathname === `/api/${collection}/${documentID}` &&
      url.searchParams.get('autosave') === 'true'
    )
  })
  await page.locator('#field-title').fill(title)
  const response = await responsePromise
  const autosaveURL = new URL(response.url())
  expect(autosaveURL.searchParams.get('draft')).toBe('true')
  expect(response.ok(), await response.text()).toBe(true)
  return response
}

async function openLivePreview(page: Page) {
  const iframe = page.locator('#live-preview-iframe')
  // Payload restores the panel preference asynchronously from local storage.
  // Let that hydration settle before deciding whether the toggle is needed.
  await page.waitForTimeout(750)
  if (!(await iframe.isVisible())) {
    const toggle = page.locator('#live-preview-toggler')
    await expect(toggle).toBeVisible()
    await toggle.click()
  }
  await expect(iframe).toBeVisible()
  return iframe
}

test.describe.serial('document-bound page previews', () => {
  test.describe.configure({ timeout: 240_000 })

  let adminContext: BrowserContext
  let adminPage: Page
  let payload: Payload
  let homeTicket: string
  let dynamicTicket: string

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    payload = await getPayload({ config })
    const users = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: testUser.email } },
    })
    const user = users.docs[0]
    if (!user) throw new Error('Preview E2E user was not created.')

    const { dynamicPageID, homeID } = await findPreviewFixtureIDs(payload)

    adminContext = await browser.newContext()
    adminPage = await adminContext.newPage()
    await login({ page: adminPage, user: testUser })
    const authCookie = (await adminContext.cookies()).find((cookie) => cookie.name.endsWith('-token'))
    const authSessionId = authCookie ? decodeJwt(authCookie.value).sid : undefined
    if (typeof authSessionId !== 'string') throw new Error('Payload login session ID was not found.')

    homeTicket = await createOrReusePreviewSession({
      authSessionId,
      collection: 'pages',
      documentId: homeID,
      payload,
      purpose: 'preview',
      userId: user.id,
    })
    dynamicTicket = await createOrReusePreviewSession({
      authSessionId,
      collection: 'pages',
      documentId: dynamicPageID,
      payload,
      purpose: 'preview',
      userId: user.id,
    })
  })

  test.afterAll(async () => {
    await adminContext?.close()
    await cleanupTestUser()
  })

  test('keeps published Home public while rendering its latest draft in preview', async ({
    browser,
  }) => {
    const publicContext = await browser.newContext()
    const page = await publicContext.newPage()

    await page.goto(`${BASE_URL}/`)
    await expect(
      page.locator('[data-testid="home-hero"]:visible').getByText(PUBLIC_HOME, { exact: true }),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="home-hero"]:visible').getByText(DRAFT_HOME, { exact: true }),
    ).toHaveCount(0)

    await publicContext.close()

    const pageErrors: string[] = []
    adminPage.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))
    await adminPage.goto(`${BASE_URL}/next/preview?previewSession=${encodeURIComponent(homeTicket)}`)
    await expect(adminPage).toHaveURL(new RegExp(`^${BASE_URL}/\\?previewSession=`))
    await expect(
      adminPage
        .locator('[data-testid="home-hero"]:visible')
        .getByText(DRAFT_HOME, { exact: true }),
    ).toBeVisible()
    await expect(
      adminPage
        .locator('[data-testid="home-hero"]:visible')
        .getByText(PUBLIC_HOME, { exact: true }),
    ).toHaveCount(0)
    expect(pageErrors, 'Draft Home preview must hydrate without client errors').toEqual([])

    await adminPage.goto(`${BASE_URL}/${DYNAMIC_OLD_SLUG}?previewSession=${encodeURIComponent(homeTicket)}`)
    await expect(adminPage).toHaveURL(new RegExp(`^${BASE_URL}/\\?previewSession=`))
    await expect(
      adminPage
        .locator('[data-testid="home-hero"]:visible')
        .getByText(DRAFT_HOME, { exact: true }),
    ).toBeVisible()
    await expect(
      adminPage.locator('main:visible').getByText(DYNAMIC_DRAFT_TITLE, { exact: true }),
    ).toHaveCount(0)
    expect(pageErrors, 'Document-bound redirect must not introduce client errors').toEqual([])

    await adminPage.goto(`${BASE_URL}/next/exit-preview?previewSession=${encodeURIComponent(homeTicket)}`)
    await expect(adminPage).toHaveURL(`${BASE_URL}/`)
    await expect(
      adminPage
        .locator('[data-testid="home-hero"]:visible')
        .getByText(PUBLIC_HOME, { exact: true }),
    ).toBeVisible()
    expect(pageErrors, 'Exiting Preview must hydrate without client errors').toEqual([])
  })

  test('redirects a dynamic Page preview to its latest draft slug', async () => {
    await adminPage.goto(`${BASE_URL}/next/preview?previewSession=${encodeURIComponent(dynamicTicket)}`)
    await expect(adminPage).toHaveURL(new RegExp(`${BASE_URL}/${DYNAMIC_NEW_SLUG}\\?previewSession=`))
    await expect(
      adminPage
        .locator('main:visible')
        .getByRole('heading', { name: DYNAMIC_DRAFT_TITLE, exact: true }),
    ).toBeVisible()

    await adminPage.goto(`${BASE_URL}/pr25-preview-wrong?previewSession=${encodeURIComponent(dynamicTicket)}`)
    await expect(adminPage).toHaveURL(new RegExp(`${BASE_URL}/${DYNAMIC_NEW_SLUG}\\?previewSession=`))
    await expect(
      adminPage
        .locator('main:visible')
        .getByRole('heading', { name: DYNAMIC_DRAFT_TITLE, exact: true }),
    ).toBeVisible()

    await adminPage.goto(`${BASE_URL}/next/exit-preview?previewSession=${encodeURIComponent(dynamicTicket)}`)
    await expect(adminPage).toHaveURL(`${BASE_URL}/`)
  })

  test('keeps the real Admin Live Preview session stable and rechecks coordinator authority', async ({
    browser,
  }) => {
    const suffix = `${Date.now()}`
    const coordinator = {
      email: `preview-coordinator-${suffix}@example.test`,
      password: `Preview-${suffix}!`,
    }
    const created: {
      college?: number | string
      news: Array<number | string>
      otherCollege?: number | string
      role?: number | string
      user?: number | string
    } = { news: [] }
    let coordinatorContext: BrowserContext | undefined
    let secondaryAdminPage: Page | undefined

    try {
      const college = await payload.create({
        collection: 'colleges',
        context: FIXTURE_CONTEXT,
        data: {
          _status: 'published',
          name: `Preview College ${suffix}`,
          slug: `preview-college-${suffix}`,
        },
        locale: 'ar',
        overrideAccess: true,
      })
      created.college = college.id

      const otherCollege = await payload.create({
        collection: 'colleges',
        context: FIXTURE_CONTEXT,
        data: {
          _status: 'published',
          name: `Other Preview College ${suffix}`,
          slug: `other-preview-college-${suffix}`,
        },
        locale: 'ar',
        overrideAccess: true,
      })
      created.otherCollege = otherCollege.id

      const role = await payload.create({
        collection: 'roles',
        data: {
          canAccessPayloadAdmin: true,
          isActive: true,
          isSystemRole: false,
          level: 2,
          name: `Preview Coordinator ${suffix}`,
          permissions: [{ key: 'news.manage' }],
          slug: 'coordinator',
        },
        locale: 'en',
        overrideAccess: true,
      })
      created.role = role.id

      const user = await payload.create({
        collection: 'users',
        context: { allowUnauthenticatedBootstrap: true },
        data: {
          ...coordinator,
          collegeScope: college.id,
          isActive: true,
          role: role.id,
          systemRole: 'coordinator',
        },
        overrideAccess: true,
      })
      created.user = user.id

      for (const index of [1, 2]) {
        const news = await payload.create({
          collection: 'news',
          context: FIXTURE_CONTEXT,
          data: {
            _status: 'published',
            college: college.id,
            slug: `preview-news-${index}-${suffix}`,
            summary: `Preview summary ${index}`,
            title: `Preview News ${index}`,
          },
          locale: 'ar',
          overrideAccess: true,
        })
        created.news.push(news.id)
      }

      const [primaryNewsID, secondaryNewsID] = created.news
      if (primaryNewsID == null || secondaryNewsID == null) {
        throw new Error('Admin Live Preview news fixtures were not created.')
      }

      coordinatorContext = await browser.newContext()
      const page = await coordinatorContext.newPage()
      await reauthenticate(coordinatorContext, page, coordinator)
      await page.goto(
        `${BASE_URL}/admin/collections/news/${primaryNewsID}?locale=ar`,
      )

      const iframe = await openLivePreview(page)
      await expect(iframe).toHaveAttribute('src', /\/next\/preview\?previewSession=/)
      const initialIframeSource = await iframe.getAttribute('src')
      if (!initialIframeSource) throw new Error('Payload did not provide a Live Preview iframe URL.')

      const previewFrame = await (await iframe.elementHandle())?.contentFrame()
      if (!previewFrame) throw new Error('Payload Live Preview iframe did not create a frame.')
      await expect(
        previewFrame.getByRole('heading', { name: 'Preview News 1', exact: true }),
      ).toBeVisible()

      const initialFinalURL = previewFrame.url()
      const previewToken = new URL(initialFinalURL).searchParams.get('previewSession')
      if (!previewToken) throw new Error('Live Preview did not retain its opaque session token.')

      const marker = `preview-window-${suffix}`
      await previewFrame.evaluate((value) => {
        ;(window as Window & { __aauPreviewWindowMarker?: string }).__aauPreviewWindowMarker =
          value
      }, marker)

      let iframeNavigationCount = 0
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
      let refreshRequestCount = 0
      const onConsole = (message: { text(): string; type(): string }) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      }
      const onPageError = (error: Error) => pageErrors.push(error.stack ?? error.message)
      const onRequest = (request: Request) => {
        const url = new URL(request.url())
        if (request.frame() === previewFrame && request.isNavigationRequest()) {
          iframeNavigationCount += 1
        }
        if (
          request.headers().rsc === '1' &&
          url.pathname === `/news/preview-news-1-${suffix}`
        ) {
          refreshRequestCount += 1
        }
      }
      page.on('console', onConsole)
      page.on('pageerror', onPageError)
      page.on('request', onRequest)

      // Allow Payload's one-time ready/document synchronization to settle so
      // the assertions below measure Autosave-triggered refreshes only.
      await page.waitForTimeout(1_000)

      const autosaveTitles = Array.from(
        { length: 5 },
        (_, index) => `Preview Autosave ${index + 1} ${suffix}`,
      )
      const refreshBaseline = refreshRequestCount
      for (const title of autosaveTitles) {
        const refreshesBeforeAutosave = refreshRequestCount
        await waitForAutosave(page, 'news', primaryNewsID, title)
        await expect(previewFrame.getByRole('heading', { name: title, exact: true })).toBeVisible({
          timeout: 10_000,
        })
        expect(refreshRequestCount - refreshesBeforeAutosave).toBe(1)
        await expect(iframe).toHaveAttribute('src', initialIframeSource)
        expect(previewFrame.url()).toBe(initialFinalURL)
        expect(
          await previewFrame.evaluate(
            () =>
              (window as Window & { __aauPreviewWindowMarker?: string })
                .__aauPreviewWindowMarker,
          ),
        ).toBe(marker)
      }

      page.off('console', onConsole)
      page.off('pageerror', onPageError)
      page.off('request', onRequest)
      expect(iframeNavigationCount).toBe(0)
      expect(refreshRequestCount - refreshBaseline).toBe(5)
      expect(consoleErrors).toEqual([])
      expect(pageErrors).toEqual([])

      const [persistedPublicRow, latestVersions] = await Promise.all([
        payload.findByID({
          collection: 'news',
          depth: 0,
          draft: false,
          id: primaryNewsID,
          overrideAccess: true,
        }),
        payload.findVersions({
          collection: 'news',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          sort: '-createdAt',
          where: { parent: { equals: primaryNewsID } },
        }),
      ])
      expect(persistedPublicRow.title).toBe('Preview News 1')
      expect(latestVersions.docs[0]?.version.title).toBe(autosaveTitles.at(-1))

      const cleanPublicPage = await coordinatorContext.newPage()
      const cleanPublicResponse = await cleanPublicPage.goto(
        `${BASE_URL}/news/preview-news-1-${suffix}`,
      )
      expect(cleanPublicResponse?.status()).toBe(200)
      expect(new URL(cleanPublicPage.url()).searchParams.has('previewSession')).toBe(false)
      await expect(
        cleanPublicPage.getByRole('heading', { name: 'Preview News 1', exact: true }),
      ).toBeVisible()
      await expect(
        cleanPublicPage.getByRole('heading', { name: autosaveTitles.at(-1), exact: true }),
      ).toHaveCount(0)
      await cleanPublicPage.close()

      secondaryAdminPage = await coordinatorContext.newPage()
      await secondaryAdminPage.goto(
        `${BASE_URL}/admin/collections/news/${secondaryNewsID}?locale=ar`,
      )
      const secondaryIframe = await openLivePreview(secondaryAdminPage)
      await expect(secondaryIframe).toHaveAttribute('src', /\/next\/preview\?previewSession=/)
      const secondaryFrame = await (await secondaryIframe.elementHandle())?.contentFrame()
      if (!secondaryFrame) throw new Error('Second Admin Live Preview did not create a frame.')
      await expect(
        secondaryFrame.getByRole('heading', { name: 'Preview News 2', exact: true }),
      ).toBeVisible()
      const secondaryToken = new URL(secondaryFrame.url()).searchParams.get('previewSession')
      if (!secondaryToken) throw new Error('Second Admin Live Preview did not retain its token.')
      expect(secondaryToken).toBeTruthy()
      expect(secondaryToken).not.toBe(previewToken)
      await expect(
        previewFrame.getByRole('heading', {
          name: autosaveTitles.at(-1),
          exact: true,
        }),
      ).toBeVisible()

      await payload.update({
        collection: 'roles',
        data: { permissions: [] },
        id: role.id,
        locale: 'en',
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, (status) => {
        expect([401, 403, 404]).toContain(status)
      })
      await payload.update({
        collection: 'roles',
        data: { permissions: [{ key: 'news.manage' }] },
        id: role.id,
        locale: 'en',
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 307)

      await payload.update({
        collection: 'roles',
        data: { isActive: false },
        id: role.id,
        locale: 'en',
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 401)
      await payload.update({
        collection: 'roles',
        data: { isActive: true },
        id: role.id,
        locale: 'en',
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 307)

      await payload.update({
        collection: 'users',
        context: { allowUnauthenticatedBootstrap: true },
        data: { collegeScope: otherCollege.id },
        id: user.id,
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, (status) => {
        expect([401, 403, 404]).toContain(status)
      })
      await payload.update({
        collection: 'users',
        context: { allowUnauthenticatedBootstrap: true },
        data: { collegeScope: college.id },
        id: user.id,
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 307)

      await payload.update({
        collection: 'users',
        context: { allowUnauthenticatedBootstrap: true },
        data: { isActive: false },
        id: user.id,
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 401)
      await payload.update({
        collection: 'users',
        context: { allowUnauthenticatedBootstrap: true },
        data: { isActive: true },
        id: user.id,
        overrideAccess: true,
      })
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 307)

      const exitPage = await coordinatorContext.newPage()
      await exitPage.goto(
        `${BASE_URL}/next/exit-preview?previewSession=${encodeURIComponent(secondaryToken)}`,
      )
      await expect(exitPage).toHaveURL(`${BASE_URL}/`)
      await exitPage.close()
      await expectPreviewEntryStatus(coordinatorContext, secondaryToken, 401)
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 307)

      const logoutResult = await page.evaluate(async () => {
        const response = await fetch('/api/users/logout', {
          credentials: 'include',
          method: 'POST',
        })
        return { body: await response.text(), ok: response.ok }
      })
      expect(logoutResult.ok, logoutResult.body).toBe(true)
      await expectPreviewEntryStatus(coordinatorContext, previewToken, 401)
    } finally {
      await secondaryAdminPage?.close()
      await coordinatorContext?.close()
      for (const id of created.news) {
        await payload.delete({
          collection: 'news',
          context: FIXTURE_CONTEXT,
          id,
          overrideAccess: true,
        })
      }
      if (created.user != null) {
        await payload.delete({
          collection: 'users',
          context: { allowUnauthenticatedBootstrap: true },
          id: created.user,
          overrideAccess: true,
        })
      }
      if (created.role != null) {
        await payload.delete({ collection: 'roles', id: created.role, overrideAccess: true })
      }
      if (created.college != null) {
        await payload.delete({
          collection: 'colleges',
          context: FIXTURE_CONTEXT,
          id: created.college,
          overrideAccess: true,
        })
      }
      if (created.otherCollege != null) {
        await payload.delete({
          collection: 'colleges',
          context: FIXTURE_CONTEXT,
          id: created.otherCollege,
          overrideAccess: true,
        })
      }
    }
  })

  test('unpublishes a public document after autosave through REST and the real Admin control', async ({
    browser,
  }) => {
    const suffix = `${Date.now()}`
    const createdNews: Array<number | string> = []
    const publicContext = await browser.newContext()
    const publicPage = await publicContext.newPage()

    const createPublishedWithAutosave = async (kind: 'admin' | 'rest') => {
      const slug = `preview-unpublish-${kind}-${suffix}`
      const publishedTitle = `Published ${kind} ${suffix}`
      const draftTitle = `Draft ${kind} ${suffix}`
      const news = await payload.create({
        collection: 'news',
        context: FIXTURE_CONTEXT,
        data: {
          _status: 'published',
          slug,
          summary: `Unpublish ${kind}`,
          title: publishedTitle,
        },
        locale: 'ar',
        overrideAccess: true,
      })
      createdNews.push(news.id)

      await publicPage.goto(`${BASE_URL}/news/${slug}`)
      await expect(publicPage.getByRole('heading', { name: publishedTitle, exact: true })).toBeVisible()

      await payload.update({
        autosave: true,
        collection: 'news',
        context: FIXTURE_CONTEXT,
        data: { _status: 'draft', title: draftTitle },
        draft: true,
        id: news.id,
        locale: 'ar',
        overrideAccess: true,
      })

      await publicPage.reload()
      await expect(publicPage.getByRole('heading', { name: publishedTitle, exact: true })).toBeVisible()
      await expect(publicPage.getByRole('heading', { name: draftTitle, exact: true })).toHaveCount(0)
      return { draftTitle, id: news.id, publishedTitle, slug }
    }

    try {
      const restFixture = await createPublishedWithAutosave('rest')
      const restResult = await adminPage.evaluate(async (id) => {
        const response = await fetch(`/api/news/${id}?depth=0&locale=ar`, {
          body: JSON.stringify({ _status: 'draft' }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
        return { body: await response.text(), status: response.status }
      }, restFixture.id)
      expect(restResult.status, restResult.body).toBe(200)
      const restPublicResponse = await publicPage.goto(`${BASE_URL}/news/${restFixture.slug}`)
      expect([200, 404]).toContain(restPublicResponse?.status())
      await expect(
        publicPage.getByRole('heading', { name: restFixture.publishedTitle, exact: true }),
      ).toHaveCount(0)
      await expect(
        publicPage.getByRole('heading', { name: restFixture.draftTitle, exact: true }),
      ).toHaveCount(0)

      const adminFixture = await createPublishedWithAutosave('admin')
      await adminPage.goto(`${BASE_URL}/admin/collections/news/${adminFixture.id}?locale=ar`)
      await expect(adminPage.locator('#field-title:visible').first()).toHaveValue(
        adminFixture.draftTitle,
      )
      await adminPage.locator('.doc-controls__popup').getByRole('button').first().click()
      await adminPage.locator('#action-unpublish').click()
      const unpublishResponse = adminPage.waitForResponse((response) => {
        const url = new URL(response.url())
        return (
          response.request().method() === 'PATCH' &&
          url.pathname === `/api/news/${adminFixture.id}` &&
          url.searchParams.get('unpublishAllLocales') === 'true'
        )
      })
      await adminPage.locator('#confirm-action').click()
      const response = await unpublishResponse
      expect(new URL(response.url()).origin).toBe(BASE_URL)
      expect(response.ok(), await response.text()).toBe(true)
      const adminPublicResponse = await publicPage.goto(`${BASE_URL}/news/${adminFixture.slug}`)
      expect([200, 404]).toContain(adminPublicResponse?.status())
      await expect(
        publicPage.getByRole('heading', { name: adminFixture.publishedTitle, exact: true }),
      ).toHaveCount(0)
      await expect(
        publicPage.getByRole('heading', { name: adminFixture.draftTitle, exact: true }),
      ).toHaveCount(0)
    } finally {
      await publicContext.close()
      for (const id of createdNews) {
        await payload
          .delete({
            collection: 'news',
            context: FIXTURE_CONTEXT,
            id,
            overrideAccess: true,
          })
          .catch(() => undefined)
      }
    }
  })
})
