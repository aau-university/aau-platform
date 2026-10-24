import { describe, expect, it, vi } from 'vitest'

import { partnerFixtures, teamMemberFixtures } from '../fixtures/content'
import type { SeedOperations } from '../lib/local-api'
import { richText } from '../lib/rich-text'
import type { SeedStageContext } from '../lib/types'
import {
  contentResetOnlyValues,
  marketingContentStage,
  teamMembersStage,
} from '../stages/content'
import { createLocalizedIfMissing } from '../stages/helpers'

function contextWith(operations: Partial<SeedOperations>): SeedStageContext {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('localized content reset', () => {
  it('preserves editor-owned ordinary content with zero writes by default', async () => {
    const existing = { id: 17, slug: 'editor-owned' }
    const create = vi.fn()
    const update = vi.fn()
    const operations = {
      create,
      find: vi.fn().mockResolvedValue({ docs: [existing], totalDocs: 1 }),
      update,
    } as unknown as SeedOperations

    const result = await createLocalizedIfMissing({
      arabic: { name: 'محرر', slug: 'editor-owned' },
      collection: 'team-members',
      english: { name: 'Editor', slug: 'editor-owned' },
      operations,
      slug: 'editor-owned',
    })

    expect(result).toMatchObject({ created: false, skipped: true, updated: false })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('uses one all-locales pre-read and grafts keyed row IDs during explicit reset', async () => {
    const snapshot = {
      id: 4,
      slug: 'campus-reset',
      title: { ar: 'الحرم القديم', en: 'Old campus' },
      content: { ar: richText('قديم', 'ar'), en: richText('Old', 'en') },
      highlights: [{ highlight: { ar: 'قديم', en: 'Old' }, id: 'highlight-1' }],
      stats: [
        { id: 'stat-1', label: { ar: 'واحد', en: 'One' }, value: 1 },
        { id: 'stat-2', label: { ar: 'اثنان', en: 'Two' }, value: 2 },
      ],
    }
    const calls: string[] = []
    const find = vi.fn()
    const findAllLocales = vi.fn(async () => {
      calls.push('find:all')
      return { docs: [snapshot], totalDocs: 1 }
    })
    const update = vi.fn(async ({ data, locale }) => {
      calls.push(`update:${locale}`)
      if (locale === 'ar') {
        return {
          ...data,
          id: 4,
          highlights: [{ ...data.highlights[0], id: 'highlight-1' }],
          stats: data.stats.map((row: { id?: string; value: number }) => ({
            ...row,
            id: row.id ?? `stat-${row.value}`,
          })),
        }
      }
      return { ...data, id: 4 }
    })
    const operations = { find, findAllLocales, update } as unknown as SeedOperations

    await createLocalizedIfMissing({
      arabic: {
        _status: 'published',
        content: richText('عربي', 'ar'),
        highlights: [{ highlight: 'جديد' }],
        slug: 'campus-reset',
        stats: [
          { label: 'اثنان', value: 2 },
          { label: 'ثلاثة', value: 3 },
        ],
        title: 'الحرم',
      },
      collection: 'campus-life',
      english: {
        _status: 'published',
        content: richText('English', 'en'),
        highlights: [{ highlight: 'New' }],
        slug: 'campus-reset',
        stats: [
          { label: 'Two', value: 2 },
          { label: 'Three', value: 3 },
        ],
        title: 'Campus',
      },
      operations,
      reset: true,
      rowIdSchema: { highlights: {}, stats: { keyField: 'value' } },
      slug: 'campus-reset',
    })

    expect(calls).toEqual(['find:all', 'update:ar', 'update:en'])
    expect(findAllLocales).toHaveBeenCalledOnce()
    expect(find).not.toHaveBeenCalled()
    expect(update.mock.calls[0]?.[0].data.stats).toEqual([
      expect.objectContaining({ id: 'stat-2', value: 2 }),
      expect.not.objectContaining({ id: expect.anything(), value: 3 }),
    ])
    expect(update.mock.calls[1]?.[0].data.stats).toEqual([
      expect.objectContaining({ id: 'stat-2', label: 'Two', value: 2 }),
      expect.objectContaining({ id: 'stat-3', label: 'Three', value: 3 }),
    ])
  })

  it('rejects a corrupt one-locale reset snapshot before writes', async () => {
    const update = vi.fn()
    const operations = {
      find: vi.fn(),
      findAllLocales: vi.fn().mockResolvedValue({
        docs: [{ id: 4, name: { ar: 'محرر' }, slug: 'editor-owned' }],
        totalDocs: 1,
      }),
      update,
    } as unknown as SeedOperations

    await expect(
      createLocalizedIfMissing({
        arabic: { name: 'محرر', slug: 'editor-owned' },
        collection: 'team-members',
        english: { name: 'Editor', slug: 'editor-owned' },
        operations,
        reset: true,
        slug: 'editor-owned',
      }),
    ).rejects.toThrow('missing localized value')
    expect(operations.findAllLocales).toHaveBeenCalledOnce()
    expect(operations.find).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('applies reset-only clear values to both locale patch writes', async () => {
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))
    const operations = {
      find: vi.fn(),
      findAllLocales: vi.fn().mockResolvedValue({
        docs: [
          {
            _status: 'published',
            id: 44,
            sidebarNote: { ar: 'بيانات قديمة', en: 'Stale data' },
            slug: 'campus-reset-clears',
            stats: [{ id: 'stale-stat', label: { ar: 'رقم مختلق', en: 'Fabricated' }, value: 999 }],
            title: { ar: 'الحرم', en: 'Campus' },
          },
        ],
        totalDocs: 1,
      }),
      update,
    } as unknown as SeedOperations

    await createLocalizedIfMissing({
      arabic: { _status: 'published', slug: 'campus-reset-clears', title: 'الحرم' },
      collection: 'campus-life',
      english: { _status: 'published', slug: 'campus-reset-clears', title: 'Campus' },
      operations,
      reset: true,
      resetOnly: contentResetOnlyValues['campus-life'],
      slug: 'campus-reset-clears',
    })

    expect(update).toHaveBeenCalledTimes(2)
    expect(update.mock.calls[0]?.[0].data).toMatchObject({ sidebarNote: null, stats: [] })
    expect(update.mock.calls[1]?.[0].data).toMatchObject({ sidebarNote: null, stats: [] })
  })

  it('applies every scalar reset-only clear to both locale patch writes', async () => {
    for (const [collection, slug, resetOnly] of [
      ['events', 'event-clear', contentResetOnlyValues.events],
      ['blog-posts', 'blog-clear', contentResetOnlyValues['blog-posts']],
      ['offers', 'offer-clear', contentResetOnlyValues.offers],
    ] as const) {
      const update = vi.fn(async ({ data, id }) => ({ ...data, id }))
      const operations = {
        find: vi.fn(),
        findAllLocales: vi.fn().mockResolvedValue({
          docs: [{ id: slug, slug, title: { ar: 'عربي', en: 'English' } }],
          totalDocs: 1,
        }),
        update,
      } as unknown as SeedOperations

      await createLocalizedIfMissing({
        arabic: { slug, title: 'عربي' },
        collection,
        english: { slug, title: 'English' },
        operations,
        reset: true,
        resetOnly,
        slug,
      } as never)

      expect(update).toHaveBeenCalledTimes(2)
      expect(update.mock.calls[0]?.[0].data).toMatchObject(resetOnly)
      expect(update.mock.calls[1]?.[0].data).toMatchObject(resetOnly)
    }
  })

  it('restores all team-member optional fields, including absent media and contact values', async () => {
    const findAllLocales = vi.fn(async ({ where }) => {
      const slug = where?.slug?.equals
      const fixture = teamMemberFixtures.find((candidate) => candidate.slug === slug)
      if (!fixture) return { docs: [], totalDocs: 0 }
      return {
        docs: [
          {
            ...fixture.shared,
            bio: {
              ar: richText(fixture.ar.bio, 'ar'),
              en: richText(fixture.en.bio, 'en'),
            },
            group: { ar: fixture.ar.group, en: fixture.en.group },
            id: `team-${fixture.slug}`,
            jobTitle: { ar: fixture.ar.jobTitle, en: fixture.en.jobTitle },
            name: { ar: fixture.ar.name, en: fixture.en.name },
            slug: fixture.slug,
          },
        ],
        totalDocs: 1,
      }
    })
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))
    const context = contextWith({ findAllLocales, update } as unknown as SeedOperations)
    context.state.resetTarget = 'team-members'

    await teamMembersStage.run(context)

    const lastFixtureWrites = update.mock.calls.filter(
      ([args]) => args.id === 'team-dr-sara-ahmed-team',
    )
    expect(lastFixtureWrites).toHaveLength(2)
    for (const [args] of lastFixtureWrites) {
      expect(args.data).toMatchObject({ email: null, image: null, phone: null })
    }
  })

  it('does not read or create unrelated offer fixtures during a partner reset', async () => {
    const find = vi.fn()
    const create = vi.fn()
    const findAllLocales = vi.fn(async ({ where }) => {
      const slug = where?.slug?.equals
      const fixture = partnerFixtures.find((candidate) => candidate.slug === slug)
      if (!fixture) return { docs: [], totalDocs: 0 }
      return {
        docs: [
          {
            ...fixture.shared,
            description: { ar: fixture.ar.description, en: fixture.en.description },
            id: `partner-${fixture.slug}`,
            name: { ar: fixture.ar.name, en: fixture.en.name },
            slug: fixture.slug,
          },
        ],
        totalDocs: 1,
      }
    })
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))
    const context = contextWith({ create, find, findAllLocales, update } as unknown as SeedOperations)
    context.state.resetTarget = 'partners'

    const result = await marketingContentStage.run(context)

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: partnerFixtures.length })
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(partnerFixtures.length * 2)
    expect(update.mock.calls.every(([args]) => args.data.logo === null)).toBe(true)
  })

  it('rejects a malformed ordinary snapshot root ID before writes', async () => {
    const update = vi.fn()
    const operations = {
      find: vi.fn(),
      findAllLocales: vi.fn().mockResolvedValue({
        docs: [{ id: null, name: { ar: 'محرر', en: 'Editor' }, slug: 'editor-owned' }],
        totalDocs: 1,
      }),
      update,
    } as unknown as SeedOperations

    await expect(
      createLocalizedIfMissing({
        arabic: { name: 'محرر', slug: 'editor-owned' },
        collection: 'team-members',
        english: { name: 'Editor', slug: 'editor-owned' },
        operations,
        reset: true,
        slug: 'editor-owned',
      }),
    ).rejects.toThrow('invalid root document ID')
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects duplicate ordinary snapshot root IDs before writes', async () => {
    const update = vi.fn()
    const duplicate = { id: 7, name: { ar: 'محرر', en: 'Editor' }, slug: 'editor-owned' }
    const operations = {
      find: vi.fn(),
      findAllLocales: vi.fn().mockResolvedValue({ docs: [duplicate, duplicate], totalDocs: 2 }),
      update,
    } as unknown as SeedOperations

    await expect(
      createLocalizedIfMissing({
        arabic: { name: 'محرر', slug: 'editor-owned' },
        collection: 'team-members',
        english: { name: 'Editor', slug: 'editor-owned' },
        operations,
        reset: true,
        slug: 'editor-owned',
      }),
    ).rejects.toThrow('duplicate root document ID')
    expect(update).not.toHaveBeenCalled()
  })
})
