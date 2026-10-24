import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GlobalAfterChangeHook } from 'payload'

const revalidateTagMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

import { revalidateAboutPage } from '@/globals/AboutPage/hooks/revalidate'
import { globalCacheTag } from '@/lib/payload/cache-tag-names'

// Minimal stub satisfying the GlobalAfterChangeHook args shape. We only
// exercise the `revalidateTag` call, so an empty object is enough; cast
// through `Pick` to avoid `any` while keeping the test readable.
const stubGlobalArgs = { doc: {}, previousDoc: {}, req: {} } as unknown as Parameters<
  GlobalAfterChangeHook
>[0]

describe('revalidateAboutPage [Issue #41]', () => {
  afterEach(() => {
    revalidateTagMock.mockReset()
  })

  it('revalidates the tag the loader actually caches against', async () => {
    await revalidateAboutPage(stubGlobalArgs)

    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
    const [tag] = revalidateTagMock.mock.calls[0]
    // The loader uses `globalCacheTag('about-page')`, so the hook MUST
    // revalidate the SAME string — otherwise edits to the AboutPage global
    // are invisible on the public site (the original bug).
    expect(tag).toBe(globalCacheTag('about-page'))
    expect(tag).toBe('payload:global:about-page')
  })

  it('does NOT revalidate the legacy bare `global:about-page` string', async () => {
    await revalidateAboutPage(stubGlobalArgs)

    const [tag] = revalidateTagMock.mock.calls[0]
    expect(tag).not.toBe('global:about-page')
  })
})
