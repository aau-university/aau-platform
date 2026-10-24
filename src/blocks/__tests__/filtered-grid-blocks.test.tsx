import { beforeEach, describe, expect, it, vi } from 'vitest'

const loaders = vi.hoisted(() => ({
  campusLife: vi.fn(async () => []),
  offers: vi.fn(async () => []),
  projects: vi.fn(async () => []),
  research: vi.fn(async () => []),
}))

vi.mock('@/lib/payload/get-public-campus-life', () => ({
  getPublicCampusLife: loaders.campusLife,
}))
vi.mock('@/lib/payload/get-public-offers', () => ({
  getPublicOffers: loaders.offers,
}))
vi.mock('@/lib/payload/get-public-projects', () => ({
  getPublicProjects: loaders.projects,
}))
vi.mock('@/lib/payload/get-public-research', () => ({
  getPublicResearchArticles: loaders.research,
}))

vi.mock('@/components/sections/CampusLifeGrid', () => ({ CampusLifeGridSection: () => null }))
vi.mock('@/components/sections/OffersGrid', () => ({ OffersGridSection: () => null }))
vi.mock('@/components/sections/ProjectsGrid', () => ({ ProjectsGridSection: () => null }))
vi.mock('@/components/sections/ResearchGrid', () => ({ ResearchGridSection: () => null }))

import { CampusLifeGridBlock_Server } from '@/blocks/CampusLifeGridBlock/Component'
import { OffersGridBlock_Server } from '@/blocks/OffersGridBlock/Component'
import { ProjectsGridBlock_Server } from '@/blocks/ProjectsGridBlock/Component'
import { ResearchGridBlock_Server } from '@/blocks/ResearchGridBlock/Component'

describe('filtered grid block loader boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the project status and English locale to the projects loader', async () => {
    await ProjectsGridBlock_Server({
      blockType: 'projectsGrid',
      maxItems: 4,
      statusFilter: 'completed',
      locale: 'en',
    })

    expect(loaders.projects).toHaveBeenCalledWith({
      limit: 4,
      locale: 'en',
      projectStatus: 'completed',
    })
  })

  it('normalizes raw, populated, and multiple offer categories before the cached loader', async () => {
    await OffersGridBlock_Server({
      blockType: 'offersGrid',
      maxItems: 3,
      categoryFilter: [4, { id: 5 }, { id: '6' }, null, { name: 'ignored' }],
      locale: 'ar',
    } as unknown as Parameters<typeof OffersGridBlock_Server>[0])

    expect(loaders.offers).toHaveBeenCalledWith({
      categoryIds: [4, 5, '6'],
      limit: 3,
      locale: 'ar',
    })
  })

  it('passes an empty offer category list without leaking relationship objects', async () => {
    await OffersGridBlock_Server({
      blockType: 'offersGrid',
      categoryFilter: null,
      locale: 'en',
    } as Parameters<typeof OffersGridBlock_Server>[0])

    expect(loaders.offers).toHaveBeenCalledWith({
      categoryIds: [],
      limit: 6,
      locale: 'en',
    })
  })

  it('normalizes research category IDs and preserves the requested locale', async () => {
    await ResearchGridBlock_Server({
      blockType: 'researchGrid',
      maxItems: 2,
      categoryFilter: [{ id: 11 }, 12],
      locale: 'en',
    } as Parameters<typeof ResearchGridBlock_Server>[0])

    expect(loaders.research).toHaveBeenCalledWith({
      categoryIds: [11, 12],
      limit: 2,
      locale: 'en',
    })
  })

  it('passes the campus-life kind to the loader in Arabic', async () => {
    await CampusLifeGridBlock_Server({
      blockType: 'campusLifeGrid',
      kindFilter: 'activity',
      locale: 'ar',
    } as unknown as Parameters<typeof CampusLifeGridBlock_Server>[0])

    expect(loaders.campusLife).toHaveBeenCalledWith({
      kind: 'activity',
      limit: 6,
      locale: 'ar',
    })
  })
})
