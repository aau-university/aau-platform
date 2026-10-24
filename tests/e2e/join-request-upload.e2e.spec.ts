/**
 * The public admission (join-request) upload, over real HTTP against the built
 * standalone server on the local-disk storage profile.
 *
 * This is the acceptance shape an operator retests by hand: POST a real
 * multipart admission form with the three documents and expect 200 with the
 * application and its files stored. It returned 500 for every submission while
 * the handler sent the cloud-storage plugin's `prefix` field on a profile that
 * has no such field, so the assertion that matters here is the status code plus
 * the documents actually being there afterwards.
 *
 * The integration suite covers the transactional rollback; this covers the
 * route, its validation and its serialization.
 */
import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { createMinimalPDF } from '../helpers/minimalPdf'
import {
  deleteJoinRequestFixture,
  deletePrivateMediaFixture,
  E2E_BASE_URL,
  findJoinRequestByFullName,
  type JoinRequestUpload,
  type PayloadID,
} from '../helpers/payloadLocalFixtures'

/** A 1x1 red JPEG — real enough for sharp to generate the configured sizes. */
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

test.describe('public admission upload', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  const fullName = `E2E Applicant ${randomUUID()}`
  let joinRequestID: PayloadID | undefined
  const mediaIDs: PayloadID[] = []

  test.afterAll(async () => {
    // The join request is removed first: it holds the upload relationships.
    if (joinRequestID !== undefined) await deleteJoinRequestFixture(joinRequestID)
    for (const id of mediaIDs) await deletePrivateMediaFixture(id)
  })

  test('accepts a complete multipart submission and stores its documents', async ({ request }) => {
    const pdf = createMinimalPDF()
    const photo = Buffer.from(JPEG_BASE64, 'base64')

    const response = await request.post(`${E2E_BASE_URL}/api/public/join-request`, {
      multipart: {
        _hp: '',
        email: `applicant-${randomUUID()}@example.com`,
        fullName,
        phone: '+967771234567',
        highSchoolDocument: {
          name: 'school.pdf',
          mimeType: 'application/pdf',
          buffer: pdf,
        },
        idDocument: { name: 'id.pdf', mimeType: 'application/pdf', buffer: pdf },
        personalPhoto: { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo },
      },
    })

    // The whole regression in one assertion: this was 500 with
    // `{"ok":false,"code":"server_error"}`.
    expect(response.status(), await response.text()).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    const saved = await findJoinRequestByFullName(fullName)
    expect(saved).toBeDefined()
    joinRequestID = saved!.id

    // Every upload relationship resolved to a stored private-media document
    // whose filename carries the submission key, which is what the local
    // compensating cleanup matches on.
    const submissionKey = saved!.submissionKey ?? ''
    expect(submissionKey).toMatch(/^join-[0-9a-f-]{36}$/i)

    for (const field of ['highSchoolDocument', 'idDocument', 'personalPhoto'] as const) {
      const upload = saved![field]
      expect(upload, `${field} was not stored`).toBeTruthy()
      expect(typeof upload, `${field} did not resolve to a document`).toBe('object')
      const media = upload as JoinRequestUpload
      mediaIDs.push(media.id)
      expect(media.filename ?? '').toContain(submissionKey)
    }
  })

  test('rejects a submission whose bytes do not match the declared type', async ({ request }) => {
    // The upload allowlist is content-checked, not extension-checked. A
    // rejection here must be a clean 400, not the 500 the prefix bug produced
    // for everything.
    //
    // All three documents are sent and only idDocument is corrupted. Omitting
    // the other two — as this test used to — makes the route reject the
    // submission for a MISSING REQUIRED UPLOAD, which returns the same 400 and
    // the same `validation_failed` code without ever inspecting a single byte.
    // The test would then have passed while proving nothing about content
    // checking at all.
    const pdf = createMinimalPDF()
    const photo = Buffer.from(JPEG_BASE64, 'base64')

    const response = await request.post(`${E2E_BASE_URL}/api/public/join-request`, {
      multipart: {
        _hp: '',
        email: `applicant-${randomUUID()}@example.com`,
        fullName: `E2E Rejected ${randomUUID()}`,
        phone: '+967771234567',
        highSchoolDocument: { name: 'school.pdf', mimeType: 'application/pdf', buffer: pdf },
        idDocument: {
          name: 'not-really.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('<svg onload="alert(1)"/>'),
        },
        personalPhoto: { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo },
      },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({ ok: false, code: 'validation_failed' })
  })
})
