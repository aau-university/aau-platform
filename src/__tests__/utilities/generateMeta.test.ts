import { describe, expect, it } from 'vitest'

import { generateMeta } from '@/utilities/generateMeta'
import { asPreviewMetadata } from '@/utilities/previewMetadata'

/**
 * Smoke test for {@link generateMeta}. Asserts the produced `Metadata`
 * object carries the doc's unsuffixed meta title and the SEO
 * description. Comprehensive SEO-paths coverage lives in PR-012 route tests.
 */
describe('generateMeta()', () => {
  it('produces a Metadata object with title from doc.meta.title', () => {
    const meta = generateMeta({
      collectionSlug: 'pages',
      doc: {
        slug: 'about',
        title: 'About Fallback',
        meta: {
          title: 'About AAU',
          description: 'Learn about the university.',
          image: undefined,
        },
      },
    })

    expect(meta.title).toBe('About AAU')
    expect(meta.description).toBe('Learn about the university.')
    expect(meta.openGraph?.title).toBe('About AAU')
  })

  it('does not advertise a canonical or Open Graph URL for a missing document', () => {
    const meta = generateMeta({
      collectionSlug: 'pages',
      doc: null,
    })

    expect(meta.alternates?.canonical).toBeUndefined()
    expect(meta.openGraph?.url).toBeUndefined()
  })

  it('uses a trusted explicit route before a global slug fallback', () => {
    const meta = generateMeta({
      doc: {
        path: '/about',
        title: 'About',
      },
      globalSlug: 'about-page',
    })

    expect(meta.alternates?.canonical).toMatch(/\/about$/)
    expect(meta.openGraph?.url).toMatch(/\/about$/)
    expect(meta.alternates?.canonical).not.toMatch(/\/about-page$/)
  })

  it('propagates image, canonical URL, Open Graph URL, and locale', () => {
    const meta = generateMeta({
      collectionSlug: 'news',
      locale: 'ar',
      doc: {
        slug: 'announcement',
        title: 'Announcement',
        meta: {
          title: 'Custom title',
          description: 'Custom description',
          image: { url: '/media/share.jpg' } as never,
        },
      },
    })

    expect(meta.alternates?.canonical).toMatch(/\/news\/announcement$/)
    expect(meta.openGraph?.url).toMatch(/\/news\/announcement$/)
    expect(meta.openGraph?.locale).toBe('ar')
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: expect.stringMatching(/\/media\/share\.jpg$/) }),
    ])
  })

  it('removes public URLs and prevents indexing in Draft Preview', () => {
    const preview = asPreviewMetadata(generateMeta({
      collectionSlug: 'pages',
      doc: { slug: 'about', title: 'About' },
    }), true)

    expect(preview.alternates?.canonical).toBeUndefined()
    expect(preview.openGraph?.url).toBeUndefined()
    expect(preview.robots).toMatchObject({ index: false, follow: false })
  })
})
