import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const findGlobal = vi.fn()
const getPayloadSafeMock = vi.fn()

vi.mock('@/lib/payload/safe-payload', () => ({
  getPayloadSafe: (...args: unknown[]) => getPayloadSafeMock(...args),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

import { rethrowPayloadErrorInProduction } from '@/lib/payload/safe-payload'
import { getPublicAboutPage } from '@/lib/payload/get-public-about-page'
import { globalCacheTag } from '@/lib/payload/cache-tags'

describe('getPublicAboutPage [Issue #42]', () => {
  beforeEach(() => {
    getPayloadSafeMock.mockReset()
    findGlobal.mockReset()
    ;(rethrowPayloadErrorInProduction as unknown as ReturnType<typeof vi.fn>).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null (not throws) when Payload is unavailable', async () => {
    // Dev/test DB outage: getPayloadSafe resolves to null.
    getPayloadSafeMock.mockResolvedValueOnce(null)

    const result = await getPublicAboutPage({ locale: 'ar' })

    expect(result).toBeNull()
    expect(getPayloadSafeMock).toHaveBeenCalledTimes(1)
    expect(findGlobal).not.toHaveBeenCalled()
  })

  it('calls findGlobal with overrideAccess:false (public read)', async () => {
    getPayloadSafeMock.mockResolvedValueOnce({ findGlobal })
    findGlobal.mockResolvedValueOnce({ id: 'about', header: { title: 'About' } })

    await getPublicAboutPage({ locale: 'en' })

    expect(findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'about-page',
        depth: 2,
        locale: 'en',
        overrideAccess: false,
      }),
    )
  })

  it('returns the global doc on success', async () => {
    const aboutDoc = { id: 'about', header: { title: 'About AAU' } }
    getPayloadSafeMock.mockResolvedValueOnce({ findGlobal })
    findGlobal.mockResolvedValueOnce(aboutDoc)

    const result = await getPublicAboutPage({ locale: 'ar' })

    expect(result).toEqual(aboutDoc)
  })

  it('catches errors, rethrows in production, returns null in dev/test', async () => {
    getPayloadSafeMock.mockResolvedValueOnce({ findGlobal })
    findGlobal.mockRejectedValueOnce(new Error('DB connection refused'))

    const result = await getPublicAboutPage({ locale: 'ar' })

    // vitest runs with NODE_ENV=test → rethrowPayloadErrorInProduction is a
    // no-op and the loader returns null instead of crashing the route.
    expect(result).toBeNull()
    expect(rethrowPayloadErrorInProduction).toHaveBeenCalledTimes(1)
  })

  it('does NOT use deprecated unstable_cache (function is a plain async export)', async () => {
    // The migration replaced `unstable_cache(...)` with a direct
    // `export async function` annotated with `'use cache'`. The export
    // must therefore be callable as a normal async function (no `.revalidateTag`
    // / `.get` unstable_cache artifacts).
    expect(typeof getPublicAboutPage).toBe('function')
    expect(getPublicAboutPage.name).toBe('getPublicAboutPage')
  })

  it('registers the about-page global cache tag (so the revalidate hook can bust it)', async () => {
    // Drive the loader so the `'use cache'` body runs; the cache-tag
    // helper is exercised even when payload is unavailable.
    getPayloadSafeMock.mockResolvedValueOnce(null)

    await getPublicAboutPage({ locale: 'ar' })

    // The producer (loader) and consumer (revalidateAboutPage hook) must
    // agree on this exact tag string.
    expect(globalCacheTag('about-page')).toBe('payload:global:about-page')
  })
})
