import { randomUUID } from 'node:crypto'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  NotFound,
  type Payload,
  type PayloadRequest,
} from 'payload'

import { relationshipId } from '@/access'
import type { JoinRequestInput } from '@/lib/forms/join-request-schema'
import { cleanupJoinRequestStorage } from '@/lib/storage/join-request-storage'
import {
  resolvePrivateMediaStorage,
  type PrivateMediaStorageMode,
} from '@/lib/storage/private-media-storage'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_UPLOAD_BYTES = 32 * 1024 * 1024
const FILE_FIELDS = ['highSchoolDocument', 'idDocument', 'personalPhoto'] as const

type FileField = (typeof FILE_FIELDS)[number]
type SubmissionFiles = Partial<Record<FileField, File>> & Record<string, File | undefined>

interface PreparedFile {
  buffer: Buffer
  field: FileField
  mimeType: string
  name: string
}

export class JoinRequestValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JoinRequestValidationError'
  }
}

export interface JoinRequestSubmissionDependencies {
  cleanupStorage: (submissionKey: string, mode: PrivateMediaStorageMode) => Promise<void>
  commitTransaction: (req: PayloadRequest) => Promise<void>
  createLocalReq: typeof createLocalReq
  generateSubmissionKey: () => string
  initTransaction: (req: PayloadRequest) => Promise<boolean>
  killTransaction: (req: PayloadRequest) => Promise<void>
}

interface SubmitJoinRequestArgs {
  data: JoinRequestInput
  files: SubmissionFiles
  ip: string
  userAgent: string
}

const defaultDependencies: JoinRequestSubmissionDependencies = {
  cleanupStorage: cleanupJoinRequestStorage,
  commitTransaction,
  createLocalReq,
  generateSubmissionKey: () => `join-${randomUUID()}`,
  initTransaction,
  killTransaction,
}

/**
 * Uploads are restricted to passive formats whose bytes we can verify against
 * the declared MIME type. Client metadata is never trusted on its own: the
 * declared type must be allowlisted AND the buffer must carry that format's
 * signature, and only the verified canonical type/extension is persisted.
 * Active formats (SVG in particular) are rejected — a stored SVG served with
 * its own MIME type executes scripts when opened as a document.
 */
const ALLOWED_UPLOADS: ReadonlyMap<
  string,
  { extension: string; matches: (buffer: Buffer) => boolean }
> = new Map([
  [
    'application/pdf',
    { extension: '.pdf', matches: (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  ],
  [
    'image/jpeg',
    { extension: '.jpg', matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ],
  [
    'image/png',
    {
      extension: '.png',
      matches: (b: Buffer) =>
        b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    },
  ],
  [
    'image/webp',
    {
      extension: '.webp',
      matches: (b: Buffer) =>
        b.subarray(0, 4).toString('latin1') === 'RIFF' &&
        b.subarray(8, 12).toString('latin1') === 'WEBP',
    },
  ],
])

function fileExtension(mimeType: string): string {
  const allowed = ALLOWED_UPLOADS.get(mimeType)
  if (!allowed) {
    throw new JoinRequestValidationError('Unsupported upload type.')
  }
  return allowed.extension
}

function verifyFileSignature(mimeType: string, buffer: Buffer): void {
  const allowed = ALLOWED_UPLOADS.get(mimeType)
  if (!allowed || !allowed.matches(buffer)) {
    throw new JoinRequestValidationError('Upload contents do not match the declared type.')
  }
}

async function prepareFiles(
  files: SubmissionFiles,
  submissionKey: string,
): Promise<PreparedFile[]> {
  const knownFields = new Set<string>(FILE_FIELDS)
  const entries = Object.entries(files).filter((entry): entry is [string, File] => Boolean(entry[1]))
  let declaredTotal = 0

  for (const [field, file] of entries) {
    if (!knownFields.has(field)) {
      throw new JoinRequestValidationError('Unknown upload field.')
    }
    if (!file.name || !Number.isSafeInteger(file.size) || file.size <= 0) {
      throw new JoinRequestValidationError('Invalid upload.')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new JoinRequestValidationError('Upload exceeds the file size limit.')
    }
    fileExtension(file.type)
    declaredTotal += file.size
  }

  if (declaredTotal > MAX_TOTAL_UPLOAD_BYTES) {
    throw new JoinRequestValidationError('Uploads exceed the total size limit.')
  }

  const prepared = await Promise.all(
    entries.map(async ([field, file]) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      if (buffer.byteLength !== file.size || buffer.byteLength > MAX_FILE_BYTES) {
        throw new JoinRequestValidationError('Invalid upload size.')
      }
      verifyFileSignature(file.type, buffer)
      return {
        buffer,
        field: field as FileField,
        mimeType: file.type,
        name: `${submissionKey}-${field}${fileExtension(file.type)}`,
      }
    }),
  )

  const actualTotal = prepared.reduce((total, file) => total + file.buffer.byteLength, 0)
  if (actualTotal > MAX_TOTAL_UPLOAD_BYTES) {
    throw new JoinRequestValidationError('Uploads exceed the total size limit.')
  }
  return prepared
}

async function mapPayloadNotFound<T>(lookup: () => Promise<T>, message: string): Promise<T> {
  try {
    return await lookup()
  } catch (error) {
    if (error instanceof NotFound) throw new JoinRequestValidationError(message)
    throw error
  }
}

async function resolveProgramCollege(
  payload: Payload,
  data: JoinRequestInput,
  req: PayloadRequest,
) {
  if (data.desiredProgram !== undefined) {
    const program = await mapPayloadNotFound(
      () =>
        payload.findByID({
          collection: 'academic-programs',
          depth: 0,
          id: data.desiredProgram!,
          overrideAccess: true,
          req,
        }),
      'The selected academic program is unavailable.',
    )
    const collegeId = relationshipId(program.college)
    if (program._status !== 'published' || collegeId === undefined) {
      throw new JoinRequestValidationError('The selected academic program is unavailable.')
    }
    if (
      data.desiredCollege !== undefined &&
      String(data.desiredCollege) !== String(collegeId)
    ) {
      throw new JoinRequestValidationError('The selected program does not belong to the college.')
    }

    const college = await mapPayloadNotFound(
      () =>
        payload.findByID({
          collection: 'colleges',
          depth: 0,
          id: collegeId,
          overrideAccess: true,
          req,
        }),
      'The selected college is unavailable.',
    )
    if (college._status !== 'published') {
      throw new JoinRequestValidationError('The selected college is unavailable.')
    }
    return { desiredCollege: collegeId, desiredProgram: program.id }
  }

  if (data.desiredCollege !== undefined) {
    const college = await mapPayloadNotFound(
      () =>
        payload.findByID({
          collection: 'colleges',
          depth: 0,
          id: data.desiredCollege!,
          overrideAccess: true,
          req,
        }),
      'The selected college is unavailable.',
    )
    if (college._status !== 'published') {
      throw new JoinRequestValidationError('The selected college is unavailable.')
    }
    return { desiredCollege: college.id, desiredProgram: undefined }
  }

  return { desiredCollege: undefined, desiredProgram: undefined }
}

async function logCleanupFailure(payload: Payload, submissionKey: string, error: unknown) {
  payload.logger.error({
    err: error,
    message: 'Join-request storage cleanup failed.',
    submissionKey,
  })
}

export async function submitJoinRequest(
  payload: Payload,
  { data, files, ip, userAgent }: SubmitJoinRequestArgs,
  dependencies: JoinRequestSubmissionDependencies = defaultDependencies,
): Promise<{ submissionKey: string }> {
  // Resolved BEFORE the first byte is written, and used for both halves of the
  // write/compensate pair: what we send to `payload.create` and where cleanup
  // looks if the submission fails. One reading, so the two cannot disagree.
  const storage = resolvePrivateMediaStorage(payload)
  const submissionKey = dependencies.generateSubmissionKey()
  const preparedFiles = await prepareFiles(files, submissionKey)
  const req = await dependencies.createLocalReq({ context: { submissionKey } }, payload)
  let commitAttempted = false

  try {
    const started = await dependencies.initTransaction(req)
    if (!started) throw new Error('Could not start join-request transaction.')

    // Resolved inside the transaction on the same request so the saved
    // relationships come from the state the join request commits against,
    // not a pre-transaction read that a concurrent deactivation or
    // reassignment could invalidate.
    const relationships = await resolveProgramCollege(payload, data, req)

    const uploaded: Partial<Record<FileField, string | number>> = {}
    for (const file of preparedFiles) {
      // `prefix` is the cloud-storage plugin's own field, and it exists only
      // while that plugin is active. Under an S3-backed profile it is what
      // isolates this submission's objects under `<submissionKey>/`, so the
      // compensating cleanup can delete them by prefix without touching any
      // other document's media. Under the local-disk profile the field does
      // not exist at all and sending it makes Payload reject the create with
      // `Cannot find field for path at prefix` — which is why this is driven
      // by the live collection schema rather than by a second reading of
      // S3_ENABLED. Local isolation comes from the filename instead: every
      // file (and every generated image size) is named `<submissionKey>-...`.
      const privateMediaData: Record<string, unknown> = {
        alt: `${file.field} - ${data.fullName}`,
      }
      if (storage.supportsPrefix) {
        privateMediaData.prefix = submissionKey
      }
      const media = await payload.create({
        collection: 'private-media',
        data: privateMediaData,
        file: {
          data: file.buffer,
          mimetype: file.mimeType,
          name: file.name,
          size: file.buffer.byteLength,
        },
        overrideAccess: true,
        req,
      })
      uploaded[file.field] = media.id
    }

    await payload.create({
      collection: 'join-requests',
      data: {
        dateOfBirth: data.dateOfBirth || undefined,
        desiredCollege: relationships.desiredCollege,
        desiredProgram: relationships.desiredProgram,
        email: data.email,
        fullName: data.fullName,
        gender: data.gender,
        highSchoolDocument: uploaded.highSchoolDocument,
        highSchoolGpa: data.highSchoolGpa,
        highSchoolType: data.highSchoolType || undefined,
        idDocument: uploaded.idDocument,
        nationalId: data.nationalId || undefined,
        notes: `submitted-by-ip=${ip}\nuser-agent=${userAgent}${
          data.educationStatus ? `\neducationStatus=${data.educationStatus}` : ''
        }`,
        personalPhoto: uploaded.personalPhoto,
        phone: data.phone,
        status: 'pending',
        submissionKey,
      } as never,
      overrideAccess: true,
      req,
    })

    commitAttempted = true
    await dependencies.commitTransaction(req)
    return { submissionKey }
  } catch (error) {
    // A rollback failure must not replace the original error or abort the
    // reconciliation/compensation path below.
    try {
      await dependencies.killTransaction(req)
    } catch (rollbackError) {
      payload.logger.error({
        err: rollbackError,
        message: 'Join-request transaction rollback failed.',
        submissionKey,
      })
    }

    if (commitAttempted) {
      // The commit outcome is ambiguous (e.g. the connection dropped while
      // acknowledging). Deleting storage for a join request that actually
      // committed is worse than retaining orphaned files, so cleanup only
      // proceeds after repeated reads agree the row is absent.
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await payload.find({
            collection: 'join-requests',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            where: { submissionKey: { equals: submissionKey } } as never,
          })
          if (result.docs.length > 0) return { submissionKey }
        } catch (reconciliationError) {
          payload.logger.error({
            err: reconciliationError,
            message: 'Join-request commit outcome could not be reconciled; storage was retained.',
            submissionKey,
          })
          throw error
        }
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
      }
    }

    try {
      await dependencies.cleanupStorage(submissionKey, storage.mode)
    } catch (cleanupError) {
      await logCleanupFailure(payload, submissionKey, cleanupError)
    }
    throw error
  }
}
