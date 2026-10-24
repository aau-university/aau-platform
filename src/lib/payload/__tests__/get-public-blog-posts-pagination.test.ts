import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const getPayloadSafe = vi.fn()
const rethrowPayloadErrorInProduction = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe,
  rethrowPayloadErrorInProduction,
}))

function blogPost(id: number) {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    excerpt: `Excerpt ${id}`,
    publishedAt: '2026-07-01T00:00:00.000Z',
  }
}

describe('A-03 blog pagination', () => {
  beforeEach(() => {
    find.mockReset()
    getPayloadSafe.mockReset()
    getPayloadSafe.mockResolvedValue({ find })
    rethrowPayloadErrorInProduction.mockReset()
  })

  it('queries page 2 at size 9 and copies authoritative metadata for an exact multiple', async () => {
    find.mockResolvedValue({
      docs: Array.from({ length: 9 }, (_, index) => blogPost(index + 10)),
      totalDocs: 18,
      totalPages: 2,
      hasNextPage: false,
      page: 2,
    })

    const { getPublicBlogPostsPaged } = await import('../get-public-blog-posts')
    const result = await getPublicBlogPostsPaged({ limit: 9, page: 2, locale: 'en' })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'blog-posts',
        limit: 9,
        page: 2,
        locale: 'en',
      }),
    )
    expect(result).toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({ id: '10', slug: 'post-10' }),
      ]),
      totalDocs: 18,
      totalPages: 2,
      hasNextPage: false,
      page: 2,
    })
    expect(result.items).toHaveLength(9)
  })

  it('does not infer totalPages or hasNextPage from a short page', async () => {
    find.mockResolvedValue({
      docs: [blogPost(10)],
      totalDocs: 100,
      totalPages: 12,
      hasNextPage: true,
      page: 2,
    })

    const { getPublicBlogPostsPaged } = await import('../get-public-blog-posts')
    const result = await getPublicBlogPostsPaged({ limit: 9, page: 2, locale: 'ar' })

    expect(result).toMatchObject({
      totalDocs: 100,
      totalPages: 12,
      hasNextPage: true,
      page: 2,
    })
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ar' }))
  })

  it('returns Payload empty-page metadata unchanged', async () => {
    find.mockResolvedValue({
      docs: [],
      totalDocs: 0,
      totalPages: 0,
      hasNextPage: false,
      page: 1,
    })

    const { getPublicBlogPostsPaged } = await import('../get-public-blog-posts')

    await expect(getPublicBlogPostsPaged({ locale: 'ar' })).resolves.toEqual({
      items: [],
      totalDocs: 0,
      totalPages: 0,
      hasNextPage: false,
      page: 1,
    })
  })

  it('returns an empty envelope when Payload is unavailable', async () => {
    getPayloadSafe.mockResolvedValue(null)

    const { getPublicBlogPostsPaged } = await import('../get-public-blog-posts')

    await expect(getPublicBlogPostsPaged({ page: 3, locale: 'en' })).resolves.toEqual({
      items: [],
      totalDocs: 0,
      totalPages: 0,
      hasNextPage: false,
      page: 3,
    })
  })

  it('returns an empty envelope when the paginated query fails', async () => {
    find.mockRejectedValue(new Error('db down'))

    const { getPublicBlogPostsPaged } = await import('../get-public-blog-posts')

    await expect(getPublicBlogPostsPaged({ page: 2, locale: 'en' })).resolves.toEqual({
      items: [],
      totalDocs: 0,
      totalPages: 0,
      hasNextPage: false,
      page: 2,
    })
    expect(rethrowPayloadErrorInProduction).toHaveBeenCalledOnce()
  })

  // An explicit `limit` is the caller's intent and is honoured. The old
  // behaviour silently clamped it to 8, which is why `/faq` rendered 8 of 13
  // FAQs (no pagination on that page, so 5 were unreachable) and `/team`
  // showed 8 of 24. Homepage strips are still capped at 8 by each block's own
  // `clampLimit`, which is where that policy belongs.
  it('honours an explicit limit instead of silently clamping it to the block default', async () => {
    find.mockResolvedValue({ docs: [blogPost(1)] })

    const { getPublicBlogPosts } = await import('../get-public-blog-posts')
    const result = await getPublicBlogPosts({ limit: 9, page: 2, locale: 'en' })

    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([expect.objectContaining({ id: '1', slug: 'post-1' })])
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'blog-posts',
        limit: 9,
        page: 2,
        locale: 'en',
      }),
    )
  })

  it('still falls back to the block default when no limit is given', async () => {
    find.mockResolvedValue({ docs: [blogPost(1)] })

    const { getPublicBlogPosts } = await import('../get-public-blog-posts')
    await getPublicBlogPosts({ locale: 'en' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ limit: 4 }))
  })

  it('caps a runaway explicit limit at the hard ceiling', async () => {
    find.mockResolvedValue({ docs: [blogPost(1)] })

    const { getPublicBlogPosts } = await import('../get-public-blog-posts')
    await getPublicBlogPosts({ limit: 100_000, locale: 'en' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }))
  })
})
