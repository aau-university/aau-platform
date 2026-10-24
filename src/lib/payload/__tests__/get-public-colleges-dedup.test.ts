import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const count = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find, count })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

/**
 * Issue #43 — `getPublicColleges` (homepage view-model → `HomeFallbackCollege[]`)
 * and `getPublicCollegesList` (route-bound raw docs → `College[]`) previously
 * each duplicated the `payload.find({ collection: 'colleges', depth: 1,
 * overrideAccess: false, ... })` call. They now share a single `findColleges`
 * helper.
 *
 * These tests assert the dedup contract: the colleges `find` call issued by
 * both loaders shares the same `depth: 1` + `overrideAccess: false` shape,
 * differing only in `where`/`limit`/`sort` (the caller-specific inputs).
 */
describe('Issue #43 — shared findColleges helper (dedup)', () => {
  beforeEach(() => {
    find.mockReset()
    count.mockReset()
    count.mockResolvedValue({ totalDocs: 0 })
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'colleges') {
        return { docs: [{ id: 1, slug: 'c1', name: 'C1', description: '', image: null }] }
      }
      return { docs: [] }
    })
  })

  it('getPublicColleges fetches colleges with depth:1 + overrideAccess:false', async () => {
    const { getPublicColleges } = await import('../get-public-colleges')
    await getPublicColleges({ limit: 4, locale: 'en' })

    const collegesCall = find.mock.calls.find((c) => c[0].collection === 'colleges')
    expect(collegesCall).toBeDefined()
    expect(collegesCall![0]).toEqual(
      expect.objectContaining({
        collection: 'colleges',
        depth: 1,
        overrideAccess: false,
        locale: 'en',
      }),
    )
  })

  it('getPublicCollegesList fetches colleges with the same depth:1 + overrideAccess:false shape', async () => {
    const { getPublicCollegesList } = await import('../get-public-colleges')
    await getPublicCollegesList({ locale: 'en', limit: 50 })

    const collegesCall = find.mock.calls.find((c) => c[0].collection === 'colleges')
    expect(collegesCall).toBeDefined()
    expect(collegesCall![0]).toEqual(
      expect.objectContaining({
        collection: 'colleges',
        depth: 1,
        overrideAccess: false,
        locale: 'en',
      }),
    )
  })

  it('getPublicCollegesList passes sort:name (route-bound alphabetical), getPublicColleges does not', async () => {
    // The two loaders differ in sort: the list page sorts alphabetically at
    // the DB layer, while the homepage block sorts manually in JS (to honour
    // the editor's selectedColleges order). Both flow through findColleges.
    const { getPublicCollegesList } = await import('../get-public-colleges')
    await getPublicCollegesList({ locale: 'en', limit: 50 })
    const listCall = find.mock.calls.find((c) => c[0].collection === 'colleges')
    expect(listCall![0].sort).toBe('name')

    find.mockClear()
    const { getPublicColleges } = await import('../get-public-colleges')
    await getPublicColleges({ limit: 4, locale: 'en' })
    const gridCall = find.mock.calls.find((c) => c[0].collection === 'colleges')
    expect(gridCall![0].sort).toBeUndefined()
  })

  it('findCollegeBySlug (used by getCollegeBySlug) also routes through the shared helper', async () => {
    const { getCollegeBySlug } = await import('../get-public-colleges')
    await getCollegeBySlug('engineering', { locale: 'en' })

    const collegesCall = find.mock.calls.find(
      (c) =>
        c[0].collection === 'colleges' &&
        c[0].where?.and?.[0]?.slug?.equals === 'engineering',
    )
    expect(collegesCall).toBeDefined()
    expect(collegesCall![0]).toEqual(
      expect.objectContaining({
        collection: 'colleges',
        depth: 1,
        overrideAccess: false,
        limit: 1,
      }),
    )
  })
})
