/**
 * The public admission (join-request) upload, against a real PostgreSQL and the
 * real Payload configuration on the LOCAL-DISK storage profile (S3_ENABLED is
 * false here, exactly as on the deployed staging and production hosts).
 *
 * This is the layer the unit tests cannot reach. `submitJoinRequest` was
 * sending the cloud-storage plugin's `prefix` field on every private-media
 * create; under the local profile that field does not exist, Payload rejected
 * the path, and every public submission returned HTTP 500 while its transaction
 * correctly rolled everything back. A mocked `payload.create` accepts any data
 * object, so only a real config catches it — which is why the mocked suite
 * stayed green through the whole regression.
 *
 * Covered here:
 *   1. the real storage profile is read correctly off the live config;
 *   2. a successful local-profile submission writes the documents AND the bytes;
 *   3. a failure inside the transaction leaves no join-request, no
 *      private-media and no orphaned file on disk.
 */
import { randomUUID } from 'node:crypto'
import { readdir } from 'node:fs/promises'

import type { Payload } from 'payload'
import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  submitJoinRequest,
  type JoinRequestSubmissionDependencies,
} from '@/app/api/public/join-request/submission'
import { cleanupJoinRequestStorage } from '@/lib/storage/join-request-storage'
import { createMinimalPDF } from '../helpers/minimalPdf'
import { resolvePrivateMediaStorage } from '@/lib/storage/private-media-storage'
import { uploadStaticDir } from '@/lib/storage/upload-static-dir'

// Real artifacts: Payload parses the PDF and hands the photo to sharp for the
// configured image sizes, so a byte string with the right magic number is not
// enough to exercise the upload path.
const PDF_BYTES = createMinimalPDF()
let JPEG_BYTES: Buffer

function fileFrom(name: string, type: string, bytes: Buffer): File {
  // The handler only uses `name`, `size`, `type` and `arrayBuffer()`.
  return {
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    name,
    size: bytes.byteLength,
    type,
  } as File
}

function submissionKeyFor(): string {
  return `join-${randomUUID()}`
}

const applicant = {
  email: 'applicant@example.com',
  fullName: 'Applicant Name',
  phone: '+967771234567',
}

let payload: Payload
let privateUploadsDir: string
const createdJoinRequests: Array<number | string> = []
const createdMedia: Array<number | string> = []

async function privateUploadsFor(submissionKey: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(privateUploadsDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  return entries.filter((entry) => entry.startsWith(`${submissionKey}-`)).sort()
}

beforeAll(async () => {
  const sharp = (await import('sharp')).default
  JPEG_BYTES = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 12, g: 34, b: 56 } },
  })
    .jpeg()
    .toBuffer()
  payload = await getPayload({ config })
  privateUploadsDir = uploadStaticDir('private')
})

afterAll(async () => {
  for (const id of createdJoinRequests) {
    await payload.delete({ collection: 'join-requests', id, overrideAccess: true }).catch(() => {})
  }
  for (const id of createdMedia) {
    await payload.delete({ collection: 'private-media', id, overrideAccess: true }).catch(() => {})
  }
})

describe('public join-request upload on the local-disk profile', () => {
  it('reads the local profile off the live private-media config', () => {
    expect(resolvePrivateMediaStorage(payload)).toEqual({
      mode: 'local',
      supportsPrefix: false,
    })
  })

  it('rejects an upload that carries the cloud-storage prefix anyway', async () => {
    // The regression itself, reproduced against the real config: this is what
    // the handler used to do on EVERY submission, and it fails here and in no
    // mocked test — which is why it reached a deployed environment.
    //
    // Payload's own uniqueness probe is where it breaks. `generateFileData`
    // calls `docWithFilenameExists`, which queries `{ filename, prefix }`; with
    // no `prefix` field on the collection the query path cannot be resolved.
    // Both halves are asserted because Payload re-wraps the cause: the query
    // layer carries the real reason, and the create surfaces as a 500.
    await expect(
      payload.db.findOne({
        collection: 'private-media',
        where: { filename: { equals: 'anything.pdf' }, prefix: { equals: 'join-probe' } },
      } as never),
    ).rejects.toThrow(/prefix/i)

    await expect(
      payload.create({
        collection: 'private-media',
        data: { alt: 'prefix probe', prefix: 'join-probe' } as never,
        file: {
          data: PDF_BYTES,
          mimetype: 'application/pdf',
          name: `prefix-probe-${randomUUID()}.pdf`,
          size: PDF_BYTES.byteLength,
        },
        overrideAccess: true,
      }),
    ).rejects.toMatchObject({ name: 'FileUploadError' })
  })

  it('commits the documents and writes the bytes for a valid submission', async () => {
    const submissionKey = submissionKeyFor()

    const result = await submitJoinRequest(
      payload,
      {
        data: applicant,
        files: {
          highSchoolDocument: fileFrom('school.pdf', 'application/pdf', PDF_BYTES),
          idDocument: fileFrom('id.pdf', 'application/pdf', PDF_BYTES),
          personalPhoto: fileFrom('photo.jpg', 'image/jpeg', JPEG_BYTES),
        },
        ip: '127.0.0.1',
        userAgent: 'vitest-int',
      },
      depsWithKey(submissionKey),
    )

    expect(result).toEqual({ submissionKey })

    const saved = await payload.find({
      collection: 'join-requests',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { submissionKey: { equals: submissionKey } } as never,
    })
    expect(saved.docs).toHaveLength(1)
    const doc = saved.docs[0]!
    createdJoinRequests.push(doc.id)
    for (const field of ['highSchoolDocument', 'idDocument', 'personalPhoto'] as const) {
      expect(doc[field]).toBeTruthy()
      createdMedia.push(doc[field] as number)
    }

    // The bytes really landed on the local disk, under filenames the
    // compensating cleanup can find again.
    const files = await privateUploadsFor(submissionKey)
    expect(files.length).toBeGreaterThanOrEqual(3)
    expect(files.some((name) => name.endsWith('-idDocument.pdf'))).toBe(true)
    expect(files.some((name) => name.endsWith('-personalPhoto.jpg'))).toBe(true)
  })

  it('leaves no document and no file behind when the transaction fails', async () => {
    // A real in-transaction failure, not an injected one: the submission key is
    // unique, so the join-requests insert is rejected by PostgreSQL AFTER all
    // three private-media uploads have already written their bytes. That is
    // precisely the state the compensating cleanup exists for.
    const submissionKey = submissionKeyFor()
    const collision = await payload.create({
      collection: 'join-requests',
      data: {
        email: applicant.email,
        fullName: 'Existing Holder',
        phone: applicant.phone,
        status: 'pending',
        submissionKey,
      } as never,
      overrideAccess: true,
    })
    createdJoinRequests.push(collision.id)

    await expect(
      submitJoinRequest(
        payload,
        {
          data: applicant,
          files: {
            idDocument: fileFrom('id.pdf', 'application/pdf', PDF_BYTES),
            personalPhoto: fileFrom('photo.jpg', 'image/jpeg', JPEG_BYTES),
          },
          ip: '127.0.0.1',
          userAgent: 'vitest-int',
        },
        depsWithKey(submissionKey),
      ),
    ).rejects.toBeTruthy()

    // Exactly the pre-existing holder — the rolled-back attempt added nothing.
    const remaining = await payload.find({
      collection: 'join-requests',
      depth: 0,
      overrideAccess: true,
      where: { submissionKey: { equals: submissionKey } } as never,
    })
    expect(remaining.docs).toHaveLength(1)
    expect(remaining.docs[0]!.id).toBe(collision.id)

    // No orphaned private-media rows...
    const media = await payload.find({
      collection: 'private-media',
      depth: 0,
      overrideAccess: true,
      where: { filename: { like: submissionKey } } as never,
    })
    expect(media.docs).toHaveLength(0)

    // ...and no orphaned bytes, including every generated image size.
    expect(await privateUploadsFor(submissionKey)).toEqual([])
  })
})

/**
 * The production dependencies, with only the submission key pinned so the test
 * can address the documents and files it creates. The transaction, the rollback
 * and the compensating cleanup are all the real ones.
 */
function depsWithKey(submissionKey: string): JoinRequestSubmissionDependencies {
  return {
    cleanupStorage: cleanupJoinRequestStorage,
    commitTransaction,
    createLocalReq,
    generateSubmissionKey: () => submissionKey,
    initTransaction,
    killTransaction,
  }
}
