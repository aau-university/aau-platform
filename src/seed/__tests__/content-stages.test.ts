import { describe, expect, it, vi } from 'vitest'

import {
  admissionRequirementFixtures,
  blogPostFixtures,
  newsFixtures,
  sliderFixtures,
  studentAffairsDocumentFixtures,
} from '../fixtures/content'
import type { SeedOperations } from '../lib/local-api'
import type { SeedStageContext } from '../lib/types'
import { editorialContentStage, keylessContentStage } from '../stages/content'

function contextWith(operations: Partial<SeedOperations>): SeedStageContext {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('content seed stages', () => {
  it('writes canonical empty populatedAuthors arrays for News and Blog creates and updates', async () => {
    let nextId = 1
    const find = vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'categories' || collection === 'colleges'
        ? { docs: [{ id: nextId++ }], totalDocs: 1 }
        : { docs: [], totalDocs: 0 },
    )
    const create = vi.fn(
      async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => ({
        ...data,
        id: nextId++,
        ...(Array.isArray(data.tags)
          ? {
              tags: data.tags.map((row, index) => ({
                ...(row as Record<string, unknown>),
                id: `${collection}-tag-${index}`,
              })),
            }
          : {}),
      }),
    )
    const update = vi.fn(
      async ({
        data,
        id,
      }: {
        collection: string
        data: Record<string, unknown>
        id: number | string
      }) => ({ ...data, id }),
    )

    await editorialContentStage.run(
      contextWith({ create, find, update } as unknown as SeedOperations),
    )

    const canonicalCreates = create.mock.calls.filter(
      ([args]) => args.collection === 'news' || args.collection === 'blog-posts',
    )
    const canonicalUpdates = update.mock.calls.filter(
      ([args]) => args.collection === 'news' || args.collection === 'blog-posts',
    )
    expect(canonicalCreates).toHaveLength(newsFixtures.length + blogPostFixtures.length)
    expect(canonicalUpdates).toHaveLength(newsFixtures.length + blogPostFixtures.length)
    expect(
      [...canonicalCreates, ...canonicalUpdates].every(
        ([args]) =>
          Array.isArray(args.data.populatedAuthors) && args.data.populatedAuthors.length === 0,
      ),
    ).toBe(true)
  })

  it('creates each complete keyless fixture set only when its collection is empty', async () => {
    const nextId = new Map<string, number>()
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 })
    const create = vi.fn(async ({ collection, data }) => {
      const id = (nextId.get(collection) ?? 0) + 1
      nextId.set(collection, id)
      return { ...data, id }
    })
    const update = vi.fn(async ({ data, id }) => ({ ...data, id }))

    const result = await keylessContentStage.run(
      contextWith({ create, find, update } as unknown as SeedOperations),
    )

    const fixtureCount =
      sliderFixtures.length +
      studentAffairsDocumentFixtures.length +
      admissionRequirementFixtures.length
    expect(result).toEqual({ conflict: 0, created: fixtureCount, skipped: 0, updated: fixtureCount })
    expect(find.mock.calls.map(([args]) => args.collection)).toEqual([
      'sliders',
      'student-affairs-documents',
      'admission-requirements',
    ])
    expect(
      find.mock.calls.every(
        ([args]) =>
          args.limit === 1 &&
          args.locale === 'ar' &&
          args.pagination === undefined &&
          args.where === undefined,
      ),
    ).toBe(true)
    expect(create).toHaveBeenCalledTimes(fixtureCount)
    expect(update).toHaveBeenCalledTimes(fixtureCount)
    expect(create.mock.calls.every(([args]) => args.locale === 'ar')).toBe(true)
    expect(update.mock.calls.every(([args]) => args.locale === 'en')).toBe(true)
    for (const [collection, expectedCount] of Object.entries({
      sliders: sliderFixtures.length,
      'student-affairs-documents': studentAffairsDocumentFixtures.length,
      'admission-requirements': admissionRequirementFixtures.length,
    })) {
      expect(
        update.mock.calls
          .filter(([args]) => args.collection === collection)
          .map(([args]) => args.id),
      ).toEqual(Array.from({ length: expectedCount }, (_, index) => index + 1))
    }
  })

  it('makes zero writes and reports conflicts for partial, complete, or editor-owned keyless sets', async () => {
    const existingCounts: Record<string, number> = {
      sliders: 1,
      'student-affairs-documents': studentAffairsDocumentFixtures.length,
      'admission-requirements': admissionRequirementFixtures.length + 1,
    }
    const create = vi.fn()
    const update = vi.fn()
    const find = vi.fn(async ({ collection }: { collection: string }) => ({
      docs: [{ id: `editor-${collection}` }],
      totalDocs: existingCounts[collection],
    }))

    const result = await keylessContentStage.run(
      contextWith({ create, find, update } as unknown as SeedOperations),
    )

    expect(result).toEqual({ conflict: 3, created: 0, skipped: 0, updated: 0 })
    expect(find).toHaveBeenCalledTimes(3)
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
