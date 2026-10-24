import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/payload-types'
import {
  contentReadContext,
  type ContentReadContext,
} from '../content-read-context'

const { find } = vi.hoisted(() => ({ find: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('../safe-payload', () => ({
  getPayloadSafe: async () => ({ find }),
  rethrowPayloadErrorInProduction: (error: unknown) => {
    throw error
  },
}))
vi.mock('../cache-tags', () => ({
  applyPublicCacheTags: vi.fn(),
  collectionCacheTag: (collection: string) => `collection:${collection}`,
}))

import { getPublicAnnouncements } from '../get-public-announcements'
import { getPublicBlogPosts } from '../get-public-blog-posts'
import { getPublicCampusLife } from '../get-public-campus-life'
import { getPublicCenters } from '../get-public-centers'
import { getPublicColleges } from '../get-public-colleges'
import { getPublicEvents } from '../get-public-events'
import { getPublicFacultyList } from '../get-public-faculty'
import { getPublicFAQs } from '../get-public-faqs'
import { getPublicNews } from '../get-public-news'
import { getPublicOffers } from '../get-public-offers'
import { getPublicPrograms } from '../get-public-programs'
import { getPublicProjects } from '../get-public-projects'
import { getPublicResearchArticles } from '../get-public-research'
import { getPublicStudyPlans } from '../get-public-study-plans'

const user = { id: 17, isActive: true, roleIsActive: true } as User

type Loader = (readContext?: ContentReadContext) => Promise<unknown>

const loaders: ReadonlyArray<readonly [string, Loader]> = [
  ['announcements', (readContext) => getPublicAnnouncements({ readContext })],
  ['blog posts', (readContext) => getPublicBlogPosts({ readContext })],
  ['campus life', (readContext) => getPublicCampusLife({ readContext })],
  ['centers', (readContext) => getPublicCenters({ readContext })],
  ['colleges', (readContext) => getPublicColleges({ readContext })],
  ['events', (readContext) => getPublicEvents({ readContext })],
  ['faculty', (readContext) => getPublicFacultyList({ readContext })],
  ['faqs', (readContext) => getPublicFAQs({ readContext })],
  ['news', (readContext) => getPublicNews({ readContext })],
  ['offers', (readContext) => getPublicOffers({ readContext })],
  ['programs', (readContext) => getPublicPrograms({ readContext })],
  ['projects', (readContext) => getPublicProjects({ readContext })],
  ['research', (readContext) => getPublicResearchArticles({ readContext })],
  ['study plans', (readContext) => getPublicStudyPlans({ readContext })],
] as const

describe('content read isolation for data-fetching blocks', () => {
  beforeEach(() => {
    find.mockReset()
    find.mockResolvedValue({ docs: [], totalPages: 0 })
  })

  it.each(loaders)('%s uses an uncached, access-controlled draft query', async (_name, load) => {
    await load({ draft: true, user })

    expect(find).toHaveBeenCalled()
    const query = find.mock.calls[0]?.[0] as Record<string, unknown>
    expect(query).toMatchObject({ draft: true, overrideAccess: false, user })
    expect(JSON.stringify(query.where ?? {})).not.toContain('_status')
  })

  it.each(loaders)('%s keeps the public query published-only and anonymous', async (_name, load) => {
    await load()

    expect(find).toHaveBeenCalled()
    const query = find.mock.calls[0]?.[0] as Record<string, unknown>
    expect(query.overrideAccess).toBe(false)
    expect(query).not.toHaveProperty('user')
    expect(JSON.stringify(query.where ?? {})).toContain('_status')
  })

  it('fails closed when a draft read has no authenticated user', () => {
    expect(() => contentReadContext(true, null)).toThrow(
      'Draft content reads require an authenticated user',
    )
  })

  it('does not retain a user in the public read context', () => {
    expect(contentReadContext(false, user)).toEqual({ draft: false })
  })
})
