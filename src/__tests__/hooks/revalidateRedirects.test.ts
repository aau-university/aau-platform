/**
 * Tests for `revalidateRedirectsAfterChange` / `revalidateRedirectsAfterDelete`
 * (PR-016) — the cache-busting hooks for the Payload `redirects` plugin's
 * internal `redirects` collection.
 *
 * Both hooks immediately expire the same tag registered by the public
 * `getCachedRedirects` loader, so the next request cannot serve a stale route.
 *
 * `next/cache` is mocked so the tests don't require a running Next.js
 * runtime. (Next.js 16's `revalidateTag` throws when called outside a
 * request scope; mocking also dodges that.)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

import {
  revalidateRedirectsAfterChange,
  revalidateRedirectsAfterDelete,
} from '@/hooks/revalidateRedirects'

describe('revalidateRedirects', () => {
  beforeEach(() => {
    revalidateTagMock.mockClear()
  })

  it('logs cache infrastructure failures without rolling back an editor write', async () => {
    const logger = { error: vi.fn() }
    revalidateTagMock.mockImplementationOnce(() => {
      throw new Error('cache unavailable')
    })

    await expect(
      (revalidateRedirectsAfterChange as unknown as (a: unknown) => Promise<unknown>)({
        doc: { id: 1 },
        req: { payload: { logger } },
      }),
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ cacheTag: 'payload:redirects', operation: 'revalidate-redirects' }),
    )
  })

  it('immediately expires the redirects cache after a change', async () => {
    await (revalidateRedirectsAfterChange as unknown as (a: unknown) => Promise<unknown>)({
      doc: { id: 1, from: '/old', to: { type: 'custom', url: '/new' } },
      req: { payload: { logger: { info: vi.fn() } } },
    })

    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateTagMock).toHaveBeenCalledWith('payload:redirects', { expire: 0 })
  })

  it('immediately expires the redirects cache after a delete', async () => {
    await (revalidateRedirectsAfterDelete as unknown as (a: unknown) => Promise<unknown>)({
      doc: { id: 1, from: '/old', to: { type: 'custom', url: '/new' } },
      req: { payload: { logger: { info: vi.fn() } } },
    })

    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    expect(revalidateTagMock).toHaveBeenCalledWith('payload:redirects', { expire: 0 })
  })

  it('does not call Next cache APIs for fixture and bootstrap operations', async () => {
    await (revalidateRedirectsAfterChange as unknown as (a: unknown) => Promise<unknown>)({
      doc: { id: 1, from: '/old', to: { type: 'custom', url: '/new' } },
      req: { context: { disableRevalidate: true }, payload: { logger: { info: vi.fn() } } },
    })

    expect(revalidateTagMock).not.toHaveBeenCalled()
  })
})
