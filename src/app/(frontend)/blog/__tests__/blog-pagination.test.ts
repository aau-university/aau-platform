import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPublicBlogPostsPaged = vi.fn()

vi.mock('@/lib/payload/get-public-blog-posts', () => ({
  getPublicBlogPostsPaged,
}))

vi.mock('@/components/pages/blog', () => ({
  BlogHero: () => null,
  BlogListSection: () => null,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))

describe('/blog pagination', () => {
  beforeEach(() => {
    getPublicBlogPostsPaged.mockReset()
  })

  it('makes page 2 reachable and passes Payload page metadata to the list', async () => {
    getPublicBlogPostsPaged.mockResolvedValue({
      items: [{ id: 'page-2-post' }],
      totalDocs: 42,
      totalPages: 5,
      hasNextPage: true,
      page: 2,
    })

    const { BlogListBody } = await import('../page')
    const result = (await BlogListBody({ locale: 'en', page: 2 })) as ReactElement<{
      posts: Array<{ id: string }>
      totalPages: number
      currentPage: number
      locale: string
    }>

    expect(getPublicBlogPostsPaged).toHaveBeenCalledWith({
      locale: 'en',
      limit: 9,
      page: 2,
    })
    expect(result.props).toMatchObject({
      posts: [{ id: 'page-2-post' }],
      totalPages: 5,
      currentPage: 2,
      locale: 'en',
    })
  })
})
