import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { createMinimalPDF } from '../helpers/minimalPdf'
import {
  createPrivateMediaFixture,
  createStudentAffairsDocumentFixture,
  deleteStudentAffairsDocumentFixture,
  deletePrivateMediaFixture,
  E2E_BASE_URL,
  type PayloadID,
  randomPayloadIDBase,
  updateStudentAffairsDocumentFixture,
} from '../helpers/payloadLocalFixtures'

test.describe('Student Affairs public document download', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  const runPrefix = `e2e-student-affairs-${randomUUID()}`
  const fixtureIDBase = randomPayloadIDBase(2)
  const titles = {
    ar: `${runPrefix}-ar`,
    en: `${runPrefix}-en`,
  }
  let parentID: PayloadID | undefined
  let mediaID: PayloadID | undefined
  let privateMediaURL = ''
  let temporaryDirectory = ''

  test.beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'aau-e2e-'))
    const pdfPath = path.join(temporaryDirectory, `${runPrefix}.pdf`)
    await writeFile(pdfPath, createMinimalPDF())

    const media = await createPrivateMediaFixture({
      id: fixtureIDBase,
      alt: runPrefix,
      file: {
        name: `${runPrefix}.pdf`,
        mimeType: 'application/pdf',
        buffer: await readFile(pdfPath),
      },
    })
    mediaID = media.id
    privateMediaURL =
      media.url ||
      `/api/private-media/file/${encodeURIComponent(media.filename || `${runPrefix}.pdf`)}`

    const parent = await createStudentAffairsDocumentFixture({
      id: fixtureIDBase + 1,
      title: titles.ar,
      file: mediaID,
      displayOrder: -2_000_000_000,
    })
    parentID = parent.id
    await updateStudentAffairsDocumentFixture(parent.id, titles.en)
  })

  test.afterAll(async () => {
    const cleanupErrors: unknown[] = []
    if (parentID !== undefined) {
      try {
        await deleteStudentAffairsDocumentFixture(parentID)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (mediaID !== undefined) {
      try {
        await deletePrivateMediaFixture(mediaID)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, 'Student Affairs E2E cleanup failed.')
    }
  })

  for (const locale of ['ar', 'en'] as const) {
    test(`downloads the parent-scoped PDF from the ${locale} admission page`, async ({
      context,
      page,
    }) => {
      await context.addCookies([
        { name: 'aau_lang', value: locale, domain: 'localhost', path: '/' },
      ])
      await page.goto(`${E2E_BASE_URL}/admission`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)

      const link = page.getByRole('link', { name: titles[locale], exact: true })
      const endpoint = `/api/public/student-affairs-documents/${parentID}/download`
      await expect(link).toHaveAttribute('href', endpoint)
      await expect(link).not.toHaveAttribute('href', /private-media/)

      const endpointResponse = await page.request.get(`${E2E_BASE_URL}${endpoint}`)
      expect(endpointResponse.status()).toBe(200)
      expect(endpointResponse.headers()['content-type']).toContain('application/pdf')
      expect(endpointResponse.headers()['content-disposition']).toContain('attachment;')
      const responseBody = await endpointResponse.body()
      expect(responseBody.subarray(0, 8).toString()).toContain('%PDF-1.4')
      expect(responseBody.subarray(-6).toString()).toBe('%%EOF\n')

      const downloadPromise = page.waitForEvent('download')
      await link.click()
      const download = await downloadPromise
      expect(await download.failure()).toBeNull()
      expect(download.suggestedFilename()).toBe('student-affairs-document.pdf')
    })
  }

  test('rejects direct anonymous access to the private-media file', async ({ page }) => {
    const response = await page.request.get(new URL(privateMediaURL, E2E_BASE_URL).toString())
    expect(response.status()).toBe(403)
  })
})
