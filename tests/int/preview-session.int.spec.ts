import { createClient } from 'redis'
import { afterAll, describe, expect, it, vi } from 'vitest'

import {
  createOrReusePreviewSession,
  destroyPreviewSession,
  destroyPreviewSessionsForUser,
  disconnectPreviewSessionRedis,
  PreviewSessionUnavailableError,
  resolvePreviewSession,
} from '@/lib/payload/preview-session'

const logger = { error: vi.fn() }
const payload = { logger } as never

describe.sequential('Redis Preview sessions', () => {
  afterAll(async () => {
    await disconnectPreviewSessionRedis()
  })

  it('reuses one opaque token across five Autosaves and isolates documents, purposes, and locales', async () => {
    const create = (overrides: Partial<Parameters<typeof createOrReusePreviewSession>[0]> = {}) =>
      createOrReusePreviewSession({
        authSessionId: 'login-session-1',
        collection: 'pages',
        documentId: 1,
        locale: 'ar',
        payload,
        purpose: 'live-preview',
        userId: 7,
        ...overrides,
      })

    const autosaveTokens = await Promise.all(Array.from({ length: 5 }, () => create()))
    expect(new Set(autosaveTokens).size).toBe(1)
    expect(autosaveTokens[0]).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const [otherDocument, otherPurpose, otherLocale, otherLogin] = await Promise.all([
      create({ documentId: 2 }),
      create({ purpose: 'preview' }),
      create({ locale: 'en' }),
      create({ authSessionId: 'login-session-2' }),
    ])
    expect(new Set([autosaveTokens[0], otherDocument, otherPurpose, otherLocale, otherLogin]).size).toBe(5)

    await expect(resolvePreviewSession({ payload, token: autosaveTokens[0]! })).resolves.toMatchObject({
      collection: 'pages',
      documentId: '1',
      locale: 'ar',
      purpose: 'live-preview',
      userId: '7',
    })
  })

  it('stores a TTL and destroy revokes only the selected document session', async () => {
    const tokenA = await createOrReusePreviewSession({
      authSessionId: 'login-session-1', collection: 'news', documentId: 10, payload, purpose: 'preview', userId: 7,
    })
    const tokenB = await createOrReusePreviewSession({
      authSessionId: 'login-session-1', collection: 'news', documentId: 11, payload, purpose: 'preview', userId: 7,
    })

    const inspector = createClient({ url: process.env.REDIS_URL })
    await inspector.connect()
    const ttl = await inspector.ttl(`aau:preview:session:${tokenA}`)
    await inspector.quit()
    expect(ttl).toBeGreaterThan(0)

    await destroyPreviewSession({ payload, token: tokenA })
    await expect(resolvePreviewSession({ payload, token: tokenA })).resolves.toBeNull()
    await expect(resolvePreviewSession({ payload, token: tokenB })).resolves.toMatchObject({
      documentId: '11',
    })
  })

  it('revokes every session for one user without affecting another user', async () => {
    const [firstDocument, secondDocument, otherUser] = await Promise.all([
      createOrReusePreviewSession({
        authSessionId: 'login-session-1', collection: 'pages', documentId: 21, payload, purpose: 'preview', userId: 17,
      }),
      createOrReusePreviewSession({
        authSessionId: 'login-session-1', collection: 'news', documentId: 22, payload, purpose: 'live-preview', userId: 17,
      }),
      createOrReusePreviewSession({
        authSessionId: 'login-session-2', collection: 'pages', documentId: 21, payload, purpose: 'preview', userId: 18,
      }),
    ])

    await expect(destroyPreviewSessionsForUser({ payload, userId: 17 })).resolves.toBe(2)
    await expect(resolvePreviewSession({ payload, token: firstDocument })).resolves.toBeNull()
    await expect(resolvePreviewSession({ payload, token: secondDocument })).resolves.toBeNull()
    await expect(resolvePreviewSession({ payload, token: otherUser })).resolves.toMatchObject({
      userId: '18',
    })
  })

  it('fails closed on Redis outage without logging the token', async () => {
    const originalURL = process.env.REDIS_URL
    await disconnectPreviewSessionRedis()
    process.env.REDIS_URL = 'redis://127.0.0.1:1'
    const token = 'A'.repeat(43)

    await expect(resolvePreviewSession({ payload, token })).rejects.toBeInstanceOf(
      PreviewSessionUnavailableError,
    )
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(token)

    process.env.REDIS_URL = originalURL
    await disconnectPreviewSessionRedis()
  })
})
