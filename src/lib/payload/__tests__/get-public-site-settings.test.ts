import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/payload/safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => null),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

import { getPublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import { getPayloadSafe } from '@/lib/payload/safe-payload'

function payloadWithGlobal(doc: Record<string, unknown>) {
  return { findGlobal: vi.fn(async () => doc) }
}

describe('getPublicSiteSettings logo mapping', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps a resolved logo upload to the public shape and queries at depth 1', async () => {
    const payload = payloadWithGlobal({
      siteName: 'AAU',
      logo: {
        id: 7,
        url: '/api/media/file/logo.svg',
        alt: 'University logo',
        width: 512,
        height: 512,
        mimeType: 'image/svg+xml',
      },
      socialLinks: [],
    })
    vi.mocked(getPayloadSafe).mockResolvedValue(payload as never)

    const settings = await getPublicSiteSettings('en')

    expect(settings.logo).toEqual({
      url: '/api/media/file/logo.svg',
      alt: 'University logo',
      width: 512,
      height: 512,
      mimeType: 'image/svg+xml',
    })
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'site-settings', depth: 1 }),
    )
  })

  it('omits the logo for an unpopulated relation or a document without a url', async () => {
    for (const logo of [7, null, undefined, { id: 7, url: '' }]) {
      vi.mocked(getPayloadSafe).mockResolvedValue(
        payloadWithGlobal({ siteName: 'AAU', logo, socialLinks: [] }) as never,
      )
      const settings = await getPublicSiteSettings('en')
      expect(settings.logo).toBeUndefined()
    }
  })
})

describe('getPublicSiteSettings (no payload available)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the static fallback brand identity when payload is unavailable', async () => {
    const settings = await getPublicSiteSettings()
    expect(settings.siteName).toBe('جامعة الجيل الجديد')
    expect(settings.tagline).toBe('لأجيال واعدة')
    expect(settings.socialLinks).toEqual([])
  })

  it('returns the English fallback when requested', async () => {
    const settings = await getPublicSiteSettings('en')
    expect(settings.siteName).toBe('AJ JEEL ALJADEED UNIVERSITY')
    expect(settings.tagline).toBe('FOR PROMISING GENERATIONS')
  })
})
