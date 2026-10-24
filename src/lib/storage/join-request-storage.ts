import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'

import type { PrivateMediaStorageMode } from './private-media-storage'
import { uploadStaticDir } from './upload-static-dir'

const SUBMISSION_KEY_PATTERN = /^join-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertSubmissionKey(submissionKey: string): void {
  if (!SUBMISSION_KEY_PATTERN.test(submissionKey)) {
    throw new Error('Invalid join-request submission key.')
  }
}

export async function cleanupJoinRequestLocalFiles({
  root = uploadStaticDir('private'),
  submissionKey,
}: {
  root?: string
  submissionKey: string
}): Promise<void> {
  assertSubmissionKey(submissionKey)
  const resolvedRoot = path.resolve(root)
  let entries

  try {
    entries = await readdir(resolvedRoot, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  const basenamePrefix = `${submissionKey}-`
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(basenamePrefix)) continue

    const candidate = path.resolve(resolvedRoot, entry.name)
    const relative = path.relative(resolvedRoot, candidate)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) continue

    await rm(candidate, { force: true })
  }
}

export async function cleanupJoinRequestS3Objects({
  bucket,
  client,
  submissionKey,
}: {
  bucket: string
  client: S3Client
  submissionKey: string
}): Promise<void> {
  assertSubmissionKey(submissionKey)
  const prefix = `${submissionKey}/`
  let continuationToken: string | undefined

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }),
    )
    const keys = (page.Contents ?? [])
      .map(({ Key }) => Key)
      .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))

    if (keys.length > 0) {
      const deletion = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      )
      if (deletion.Errors?.length) {
        throw new Error('S3 failed to delete one or more join-request objects.')
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    if (page.IsTruncated && !continuationToken) {
      throw new Error('S3 returned a truncated join-request cleanup page without a token.')
    }
  } while (continuationToken)
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} must be set before cleaning join-request storage.`)
  return value
}

/**
 * Remove every artifact a failed submission may have written.
 *
 * `mode` decides WHERE to look and must come from the same authority that
 * decided where the bytes were written — see `resolvePrivateMediaStorage`.
 * Callers that have a Payload instance pass the resolved mode; the
 * environment-derived default exists only for callers that do not (a cron or
 * an operator script), and it reproduces the previous behaviour exactly.
 */
export async function cleanupJoinRequestStorage(
  submissionKey: string,
  mode: PrivateMediaStorageMode = process.env.S3_ENABLED === 'true' ? 'remote' : 'local',
): Promise<void> {
  if (mode === 'local') {
    await cleanupJoinRequestLocalFiles({ submissionKey })
    return
  }

  const config: S3ClientConfig = {
    endpoint: requiredEnvironment('S3_ENDPOINT'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: requiredEnvironment('S3_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvironment('S3_SECRET_ACCESS_KEY'),
    },
  }

  await cleanupJoinRequestS3Objects({
    bucket: requiredEnvironment('S3_BUCKET'),
    client: new S3Client(config),
    submissionKey,
  })
}
