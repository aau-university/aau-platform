import { randomInt } from 'node:crypto'

import type { Payload } from 'payload'

import { validateE2EEnvironment } from './e2eSafety'

export const E2E_BASE_URL = 'http://localhost:3000'

export type PayloadID = number

const MIN_FIXTURE_ID = 1_500_000_000
const MAX_FIXTURE_ID = 2_000_000_000
const FIXTURE_CONTEXT = { disableRevalidate: true } as const

type PrivateMediaFixture = {
  id: PayloadID
  filename?: string | null
  url?: string | null
}

let scratchPayload: Promise<Payload> | undefined

export function randomPayloadIDBase(reservedIDs: number): number {
  if (!Number.isSafeInteger(reservedIDs) || reservedIDs < 1) {
    throw new Error('reservedIDs must be a positive integer.')
  }
  return randomInt(MIN_FIXTURE_ID, MAX_FIXTURE_ID - reservedIDs + 1)
}

async function getScratchPayload(): Promise<Payload> {
  validateE2EEnvironment(process.env)
  scratchPayload ??= Promise.all([import('payload'), import('../../src/payload.config.js')]).then(
    ([{ getPayload }, { default: config }]) => getPayload({ config }),
  )
  return scratchPayload
}

export async function createPrivateMediaFixture(options: {
  id: number
  alt: string
  file: { name: string; mimeType: string; buffer: Buffer }
}): Promise<PrivateMediaFixture> {
  const payload = await getScratchPayload()
  return payload.create({
    collection: 'private-media',
    context: FIXTURE_CONTEXT,
    data: { id: options.id, alt: options.alt },
    file: {
      data: options.file.buffer,
      mimetype: options.file.mimeType,
      name: options.file.name,
      size: options.file.buffer.byteLength,
    },
    locale: 'ar',
    overrideAccess: true,
  })
}

export async function deletePrivateMediaFixture(id: PayloadID): Promise<void> {
  const payload = await getScratchPayload()
  await payload.delete({
    collection: 'private-media',
    context: FIXTURE_CONTEXT,
    id,
    overrideAccess: true,
  })
}

export async function createBlogPostFixture(options: {
  id: number
  title: string
  slug: string
  excerpt: string
  publishedAt: string
}): Promise<{ id: PayloadID }> {
  const payload = await getScratchPayload()
  return payload.create({
    collection: 'blog-posts',
    context: FIXTURE_CONTEXT,
    data: { ...options, _status: 'published' },
    locale: 'ar',
    overrideAccess: true,
  })
}

export async function updateBlogPostFixture(
  id: PayloadID,
  data: { title: string; excerpt: string },
): Promise<void> {
  const payload = await getScratchPayload()
  await payload.update({
    collection: 'blog-posts',
    context: FIXTURE_CONTEXT,
    id,
    data: { ...data, _status: 'published' },
    locale: 'en',
    overrideAccess: true,
  })
}

export async function deleteBlogPostFixture(id: PayloadID): Promise<void> {
  const payload = await getScratchPayload()
  await payload.delete({
    collection: 'blog-posts',
    context: FIXTURE_CONTEXT,
    id,
    overrideAccess: true,
  })
}

export async function createStudentAffairsDocumentFixture(options: {
  id: number
  title: string
  file: PayloadID
  displayOrder: number
}): Promise<{ id: PayloadID }> {
  const payload = await getScratchPayload()
  return payload.create({
    collection: 'student-affairs-documents',
    context: FIXTURE_CONTEXT,
    data: { ...options, fileComingSoon: false, _status: 'published' },
    locale: 'ar',
    overrideAccess: true,
  })
}

export async function updateStudentAffairsDocumentFixture(
  id: PayloadID,
  title: string,
): Promise<void> {
  const payload = await getScratchPayload()
  await payload.update({
    collection: 'student-affairs-documents',
    context: FIXTURE_CONTEXT,
    id,
    data: { title, _status: 'published' },
    locale: 'en',
    overrideAccess: true,
  })
}

export async function deleteStudentAffairsDocumentFixture(id: PayloadID): Promise<void> {
  const payload = await getScratchPayload()
  await payload.delete({
    collection: 'student-affairs-documents',
    context: FIXTURE_CONTEXT,
    id,
    overrideAccess: true,
  })
}

/**
 * Join-request helpers for the public admission-upload E2E.
 *
 * The public endpoint deliberately does NOT return the submission key, so the
 * submitted document is located by the run-unique `fullName` the test posted.
 * `depth: 1` resolves the three upload relationships so the test can assert on
 * the stored filenames and clean the private media up afterwards.
 */
export type JoinRequestUpload = { id: PayloadID; filename?: null | string }

export async function findJoinRequestByFullName(fullName: string): Promise<
  | undefined
  | {
      id: PayloadID
      highSchoolDocument?: JoinRequestUpload | null | number
      idDocument?: JoinRequestUpload | null | number
      personalPhoto?: JoinRequestUpload | null | number
      submissionKey?: null | string
    }
> {
  const payload = await getScratchPayload()
  const result = await payload.find({
    collection: 'join-requests',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: { fullName: { equals: fullName } },
  })
  return result.docs[0]
}

export async function deleteJoinRequestFixture(id: PayloadID): Promise<void> {
  const payload = await getScratchPayload()
  await payload.delete({
    collection: 'join-requests',
    context: FIXTURE_CONTEXT,
    id,
    overrideAccess: true,
  })
}
