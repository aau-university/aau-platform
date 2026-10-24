import { describe, expect, it, vi } from 'vitest'

import { navigationMenuFixtures, pageFixtures } from '../fixtures/cms'
import type { SeedOperations } from '../lib/local-api'
import type { SeedRunState, SeedStageContext } from '../lib/types'
import { navigationAndPagesStage, validateNavigationRows } from '../stages/navigation-and-pages'

function state(resetTarget?: SeedRunState['resetTarget']): SeedRunState {
  return { created: new Map(), initializeGlobals: false, ...(resetTarget ? { resetTarget } : {}) }
}

function context(operations: Partial<SeedOperations>, seedState = state()): SeedStageContext {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: seedState,
  } as unknown as SeedStageContext
}

function withRowIds(data: Record<string, unknown>, prefix: string) {
  const result = structuredClone(data)
  if (Array.isArray(result.items)) {
    result.items = result.items.map((item, index) => ({
      ...item,
      id: `${prefix}-item-${index}`,
      children: Array.isArray(item.children)
        ? item.children.map((child: Record<string, unknown>, childIndex: number) => ({
            ...child,
            id: `${prefix}-item-${index}-child-${childIndex}`,
          }))
        : [],
    }))
  }
  if (Array.isArray(result.layout)) {
    result.layout = result.layout.map((block, index) => ({
      ...block,
      id: `${prefix}-block-${index}`,
    }))
  }
  return result
}

describe('navigation-and-pages stage', () => {
  it('creates Arabic first and grafts every generated menu/block ID into English', async () => {
    let id = 0
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 })
    const create = vi.fn(async ({ collection, data }) => ({
      ...withRowIds(data, `${collection}-${++id}`),
      id,
    }))
    const update = vi.fn(async ({ data, id: rootId }) => ({ ...data, id: rootId }))

    const result = await navigationAndPagesStage.run(
      context({ create, find, update } as unknown as SeedOperations),
    )

    expect(result).toEqual({ conflict: 0, created: 2, skipped: 0, updated: 2 })
    expect(create.mock.calls.map(([args]) => [args.collection, args.locale])).toEqual([
      ['navigation-menus', 'ar'],
      ['pages', 'ar'],
    ])
    expect(update.mock.calls.every(([args]) => args.locale === 'en')).toBe(true)
    for (const [index, fixture] of navigationMenuFixtures.entries()) {
      const data = update.mock.calls[index]?.[0].data
      expect(data).not.toHaveProperty('slug')
      expect(data.key).toBe(fixture.key)
      expect(data.items.map((row: Record<string, unknown>) => row.id)).toEqual(
        create.mock.results[index]?.value.then
          ? fixture.arabic.items.map((_, rowIndex) => `navigation-menus-${index + 1}-item-${rowIndex}`)
          : [],
      )
      for (const [rowIndex, item] of data.items.entries()) {
        expect(item.children.map((child: Record<string, unknown>) => child.id)).toEqual(
          fixture.arabic.items[rowIndex]?.children?.map(
            (_, childIndex) => `navigation-menus-${index + 1}-item-${rowIndex}-child-${childIndex}`,
          ) ?? [],
        )
      }
    }
    const pageData = update.mock.calls[1]?.[0].data
    expect(pageData.slug).toBe('home')
    expect(pageData.layout.map((block: Record<string, unknown>) => block.id)).toEqual(
      pageFixtures[0].arabic.layout.map((_, index) => `pages-2-block-${index}`),
    )
  })

  it('treats existing canonical identities as editor-owned skips with zero writes', async () => {
    const find = vi.fn(async ({ collection, where }) => ({
      docs: [{ id: collection === 'pages' ? 3 : where.key.equals === 'main' ? 1 : 2, ...whereValue(where) }],
      totalDocs: 1,
    }))
    const create = vi.fn()
    const update = vi.fn()

    const result = await navigationAndPagesStage.run(
      context({ create, find, update } as unknown as SeedOperations),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 2, updated: 0 })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('pre-reads and resets only navigation while preserving matched nested IDs', async () => {
    const snapshots = navigationMenuFixtures.map((fixture, index) => ({
      ...withRowIds(fixture.arabic, `menu-${index}`),
      id: index + 1,
    }))
    const findAllLocales = vi.fn(async ({ where }) => ({
      docs: [snapshots.find((snapshot) => Reflect.get(snapshot, 'key') === where.key.equals)],
      totalDocs: 1,
    }))
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))
    const find = vi.fn()

    const result = await navigationAndPagesStage.run(
      context({ find, findAllLocales, update } as unknown as SeedOperations, state('navigation-menus')),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 1 })
    expect(findAllLocales).toHaveBeenCalledOnce()
    expect(find).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(2)
    expect(update.mock.calls.every(([args]) => args.collection === 'navigation-menus')).toBe(true)
    expect(update.mock.calls[0]?.[0].data.items[0].id).toBe('menu-0-item-0')
    expect(update.mock.calls[1]?.[0].data.items[0].id).toBe('menu-0-item-0')
  })

  it('aborts a non-empty page topology mismatch before any write', async () => {
    const findAllLocales = vi.fn().mockResolvedValue({
      docs: [{ id: 7, layout: [{ blockType: 'newsGrid', id: 'wrong-block' }], slug: 'home' }],
      totalDocs: 1,
    })
    const update = vi.fn()

    await expect(
      navigationAndPagesStage.run(
        context({ findAllLocales, update } as unknown as SeedOperations, state('pages')),
      ),
    ).rejects.toThrow('unkeyed row counts differ')
    expect(update).not.toHaveBeenCalled()
  })

  it('clears every optional page field while retaining published status and block IDs', async () => {
    const fixture = pageFixtures[0]
    const snapshot = { ...withRowIds(fixture.arabic, 'home'), id: 8 }
    const findAllLocales = vi.fn().mockResolvedValue({ docs: [snapshot], totalDocs: 1 })
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))

    await navigationAndPagesStage.run(
      context({ findAllLocales, update } as unknown as SeedOperations, state('pages')),
    )

    expect(update).toHaveBeenCalledTimes(2)
    for (const [args] of update.mock.calls) {
      expect(args.data).toMatchObject({
        _status: 'published',
        author: null,
        content: null,
        displayOrder: null,
        heroImage: null,
        meta: { description: null, image: null, title: null },
        populatedAuthors: [],
        publishedAt: null,
      })
      expect(args.data.hero).toEqual({ links: [], media: null, richText: null, type: 'lowImpact' })
      expect(args.data.layout.map((block: Record<string, unknown>) => block.id)).toEqual(
        fixture.arabic.layout.map((_, index) => `home-block-${index}`),
      )
      expect(
        args.data.layout.find(
          (block: Record<string, unknown>) => block.blockType === 'collegesGrid',
        )?.selectedColleges,
      ).toEqual([])
    }
  })

  it('rejects duplicate root IDs before reset writes', async () => {
    const fixture = navigationMenuFixtures[0]
    const duplicate = { ...withRowIds(fixture.arabic, 'duplicate'), id: 1 }
    const findAllLocales = vi.fn().mockResolvedValue({ docs: [duplicate, duplicate], totalDocs: 2 })
    const update = vi.fn()

    await expect(
      navigationAndPagesStage.run(
        context({ findAllLocales, update } as unknown as SeedOperations, state('navigation-menus')),
      ),
    ).rejects.toThrow('duplicate root document ID')
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects duplicate or missing item and child URL keys before writes', () => {
    const first = structuredClone(navigationMenuFixtures[0].arabic.items[0])
    const second = structuredClone(navigationMenuFixtures[0].arabic.items[1])
    second.url = first.url
    expect(() => validateNavigationRows([first, second], 'test.items')).toThrow(
      'Duplicate navigation URL',
    )

    const parent = structuredClone(navigationMenuFixtures[0].arabic.items[2])
    if (!parent.children?.[1]) throw new Error('Fixture must contain two child rows.')
    parent.children[1].url = parent.children[0]?.url ?? ''
    expect(() => validateNavigationRows([parent], 'test.items')).toThrow(
      'Duplicate navigation URL',
    )

    const missing = { ...structuredClone(first), url: '' }
    expect(() => validateNavigationRows([missing], 'test.items')).toThrow(
      'Missing navigation URL',
    )
  })
})

function whereValue(where: Record<string, { equals: string }>): Record<string, string> {
  const [field, condition] = Object.entries(where)[0] as [string, { equals: string }]
  return { [field]: condition.equals }
}
