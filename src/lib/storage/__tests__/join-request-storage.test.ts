import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { describe, expect, it, vi } from 'vitest'

import {
  cleanupJoinRequestLocalFiles,
  cleanupJoinRequestS3Objects,
  cleanupJoinRequestStorage,
} from '../join-request-storage'

const submissionKey = 'join-123e4567-e89b-12d3-a456-426614174000'

describe('join-request storage cleanup', () => {
  it('deletes only path-contained local files carrying the submission basename', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'join-request-'))
    const root = path.join(parent, 'private')
    await mkdir(root)
    await Promise.all([
      writeFile(path.join(root, `${submissionKey}-id-card.pdf`), 'private'),
      writeFile(path.join(root, `${submissionKey}-photo-300x300.jpg`), 'private'),
      writeFile(path.join(root, 'another-submission.pdf'), 'keep'),
      writeFile(path.join(parent, `${submissionKey}-outside.pdf`), 'keep'),
    ])

    await cleanupJoinRequestLocalFiles({ root, submissionKey })

    expect(await readdir(root)).toEqual(['another-submission.pdf'])
    expect(await readdir(parent)).toContain(`${submissionKey}-outside.pdf`)
  })

  it('awaits every S3 list page and deletes only keys under the submission prefix', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Contents: [
          { Key: `${submissionKey}/id.pdf` },
          { Key: `${submissionKey}/photo.jpg` },
          { Key: `private-media/${submissionKey}/wrong-prefix.pdf` },
        ],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Contents: [{ Key: `${submissionKey}/photo-300x300.jpg` }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({})

    await cleanupJoinRequestS3Objects({
      bucket: 'private-bucket',
      client: { send } as never,
      submissionKey,
    })

    expect(send).toHaveBeenCalledTimes(4)
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command)
    expect(send.mock.calls[0]?.[0].input).toEqual({
      Bucket: 'private-bucket',
      ContinuationToken: undefined,
      Prefix: `${submissionKey}/`,
    })
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(DeleteObjectsCommand)
    expect(send.mock.calls[1]?.[0].input).toEqual({
      Bucket: 'private-bucket',
      Delete: {
        Objects: [
          { Key: `${submissionKey}/id.pdf` },
          { Key: `${submissionKey}/photo.jpg` },
        ],
        Quiet: true,
      },
    })
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(ListObjectsV2Command)
    expect(send.mock.calls[2]?.[0].input).toEqual({
      Bucket: 'private-bucket',
      ContinuationToken: 'page-2',
      Prefix: `${submissionKey}/`,
    })
    expect(send.mock.calls[3]?.[0]).toBeInstanceOf(DeleteObjectsCommand)
    expect(send.mock.calls[3]?.[0].input).toEqual({
      Bucket: 'private-bucket',
      Delete: {
        Objects: [{ Key: `${submissionKey}/photo-300x300.jpg` }],
        Quiet: true,
      },
    })
  })
  // ── Mode dispatch ─────────────────────────────────────────────────────
  // The mode must come from the same authority that decided where the bytes
  // were written (resolvePrivateMediaStorage). If the two ever disagreed, the
  // compensating cleanup would sweep a place nothing was written to and leave
  // an applicant's ID document behind after a failed submission.

  it('sweeps the local uploads tree when the caller resolved the local profile', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'join-request-mode-'))
    const uploads = path.join(root, 'private')
    await mkdir(uploads)
    await writeFile(path.join(uploads, `${submissionKey}-id.pdf`), 'private')

    // S3_ENABLED says otherwise on purpose: the explicit mode wins, because it
    // is the one the write path actually used.
    vi.stubEnv('S3_ENABLED', 'true')
    vi.stubEnv('PAYLOAD_UPLOADS_DIR', root)
    try {
      await cleanupJoinRequestStorage(submissionKey, 'local')
    } finally {
      vi.unstubAllEnvs()
    }

    expect(await readdir(uploads)).toEqual([])
  })

  it('refuses a remote sweep without S3 configuration rather than silently doing nothing', async () => {
    vi.stubEnv('S3_ENABLED', 'false')
    vi.stubEnv('S3_ENDPOINT', '')
    try {
      // A remote-profile submission whose cleanup cannot reach the bucket must
      // surface, not report success: submission.ts logs it and keeps the
      // original error, and the leaked objects are then discoverable.
      await expect(cleanupJoinRequestStorage(submissionKey, 'remote')).rejects.toThrow(
        /S3_ENDPOINT/,
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('falls back to S3_ENABLED for callers that have no Payload instance', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'join-request-default-'))
    const uploads = path.join(root, 'private')
    await mkdir(uploads)
    await writeFile(path.join(uploads, `${submissionKey}-id.pdf`), 'private')

    vi.stubEnv('S3_ENABLED', 'false')
    vi.stubEnv('PAYLOAD_UPLOADS_DIR', root)
    try {
      await cleanupJoinRequestStorage(submissionKey)
    } finally {
      vi.unstubAllEnvs()
    }

    expect(await readdir(uploads)).toEqual([])
  })
})
