import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

/**
 * Issue #44 — `getPublicNews` (homepage, ≤8, fallback → `HomeFallbackNewsItem[]`)
 * and `getPublicNewsList` (paginated → `{ items, totalPages }`) previously each
 * duplicated the `payload.find({ collection: 'news', where: PUBLISHED_WHERE,
 * sort: '-publishedAt', depth: 1, overrideAccess: false, ... })` call.
 *
 * They now share a `findPublishedNewsDocs` helper. These tests assert:
 *  1. Both loaders issue the same shape of `find` call (shared fetch).
 *  2. `getPublicNews` applies the ≤8 limit clamp + fallback.
 *  3. `getPublicNewsList` passes `page` + returns `totalPages`.
 *  4. `getPublicNews` returns fallback when Payload returns 0 docs.
 *  5. `getPublicNewsList` returns `{ items: [], totalPages: 0 }` on error.
 */
describe('Issue #44 — shared findPublishedNewsDocs helper (dedup)', () => {
  beforeEach(() => {
    find.mockReset()
  })

  it('getPublicNews and getPublicNewsList share the same fetch shape', async () => {
    find.mockResolvedValue({ docs: [], totalPages: 0 })

    const { getPublicNews, getPublicNewsList } = await import('../get-public-news')

    await getPublicNews({ limit: 4, locale: 'en' })
    await getPublicNewsList({ limit: 9, page: 1, locale: 'en' })

    const calls = find.mock.calls.filter((c) => c[0].collection === 'news')
    expect(calls).toHaveLength(2)

    // Both calls share the same where/sort/depth/overrideAccess/locale.
    for (const call of calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          collection: 'news',
          where: { _status: { equals: 'published' } },
          sort: '-publishedAt',
          depth: 1,
          overrideAccess: false,
          locale: 'en',
        }),
      )
    }
  })

  it('getPublicNews clamps limit to 8 and maps to HomeFallbackNewsItem', async () => {
    find.mockResolvedValue({
      docs: [
        {
          id: 1,
          slug: 'n1',
          title: 'News 1',
          summary: { root: {} },
          publishedAt: '2026-01-01',
        },
      ],
      totalPages: 1,
    })

    const { getPublicNews } = await import('../get-public-news')
    const result = await getPublicNews({ limit: 100, locale: 'en' })

    // Limit clamped to 8.
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'news', limit: 8 }),
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: '1',
        slug: 'n1',
        title: 'News 1',
        publishDate: '2026-01-01',
      }),
    ])
  })

  it('getPublicNews returns an empty list when 0 docs returned (no fake fallback)', async () => {
    find.mockResolvedValue({ docs: [], totalPages: 0 })

    const { getPublicNews } = await import('../get-public-news')
    const result = await getPublicNews({ limit: 3, locale: 'ar' })

    // The invented fallback news items were removed — an empty CMS renders
    // no news section instead of fabricated headlines.
    expect(result).toEqual([])
  })

  it('getPublicNewsList passes page + returns totalPages', async () => {
    find.mockResolvedValue({
      docs: [{ id: 5, slug: 'n5', title: 'News 5', summary: {}, publishedAt: '2026-02-01' }],
      totalPages: 4,
    })

    const { getPublicNewsList } = await import('../get-public-news')
    const result = await getPublicNewsList({ limit: 9, page: 2, locale: 'en' })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'news', limit: 9, page: 2 }),
    )
    expect(result).toEqual({
      items: [expect.objectContaining({ id: '5', slug: 'n5' })],
      totalPages: 4,
    })
  })

  it('getPublicNewsList returns empty envelope on error (no fallback)', async () => {
    find.mockRejectedValue(new Error('db down'))

    const { getPublicNewsList } = await import('../get-public-news')
    const result = await getPublicNewsList({ locale: 'en' })

    expect(result).toEqual({ items: [], totalPages: 0 })
  })

  it('getPublicNews does not pass page (homepage is a flat list, not paginated)', async () => {
    find.mockResolvedValue({ docs: [], totalPages: 0 })

    const { getPublicNews } = await import('../get-public-news')
    await getPublicNews({ limit: 4, locale: 'en' })

    const call = find.mock.calls.find((c) => c[0].collection === 'news')
    expect(call![0].page).toBeUndefined()
  })
})
