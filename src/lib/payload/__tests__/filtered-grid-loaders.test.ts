import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

describe('filtered grid public loaders', () => {
  beforeEach(() => {
    find.mockReset()
    find.mockResolvedValue({ docs: [] })
  })

  it('filters projects by supported project status', async () => {
    const { getPublicProjects } = await import('../get-public-projects')

    await getPublicProjects({ limit: 4, locale: 'en', projectStatus: 'planned' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'projects',
      limit: 4,
      locale: 'en',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { projectStatus: { equals: 'planned' } },
        ],
      },
    }))
  })

  it('filters offers by category IDs in the database query before applying limit', async () => {
    const { getPublicOffers } = await import('../get-public-offers')

    await getPublicOffers({ categoryIds: [4, '5'], limit: 2, locale: 'ar' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'offers',
      limit: 2,
      locale: 'ar',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { category: { in: [4, '5'] } },
        ],
      },
    }))
  })

  it('filters research publications by category IDs instead of category names', async () => {
    const { getPublicResearchArticles } = await import('../get-public-research')

    await getPublicResearchArticles({ categoryIds: [11, 12], limit: 3, locale: 'en' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'research-publications',
      limit: 3,
      locale: 'en',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { category: { in: [11, 12] } },
        ],
      },
    }))
  })

  it('does not add a category predicate for empty category ID lists', async () => {
    const { getPublicOffers } = await import('../get-public-offers')
    const { getPublicResearchArticles } = await import('../get-public-research')

    await getPublicOffers({ categoryIds: [], limit: 2 })
    await getPublicResearchArticles({ categoryIds: [], limit: 2 })

    expect(find).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { _status: { equals: 'published' } },
    }))
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { _status: { equals: 'published' } },
    }))
  })

  it('filters campus-life items by the collection kind', async () => {
    const { getPublicCampusLife } = await import('../get-public-campus-life')

    await getPublicCampusLife({ kind: 'life', limit: 5, locale: 'ar' })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'campus-life',
      limit: 5,
      locale: 'ar',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { kind: { equals: 'life' } },
        ],
      },
    }))
  })
})
