import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const count = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find, count })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

/**
 * Issue #45 — `getPublicColleges` and `getPublicCollegesList` previously issued
 * one `payload.count` query per college per collection (N+1: 8 colleges × 2
 * collections = 16 round-trips). They now issue a single `payload.find` per
 * related collection with `where: { college: { in: collegeIds } }` and group
 * the returned docs client-side (2 round-trips total).
 *
 * These tests assert:
 *  1. The loaders call `find` (not `count`) for the related collections.
 *  2. The `find` call uses `college: { in: [...] }` (batch), not
 *     `college: { equals: <singleId> }` (per-college).
 *  3. The per-college counts are correctly derived from the batched docs.
 */
describe('Issue #45 — batched college counts (N+1 elimination)', () => {
  beforeEach(() => {
    find.mockReset()
    count.mockReset()
  })

  it('getPublicColleges batches program + faculty counts into 2 find calls', async () => {
    // Colleges query → 2 colleges.
    // Programs query → 3 docs: 2 for college 1, 1 for college 2.
    // Faculty query → 2 docs: 1 for college 1, 1 for college 2.
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'colleges') {
        return {
          docs: [
            { id: 1, slug: 'eng', name: 'Engineering', description: '', image: null },
            { id: 2, slug: 'sci', name: 'Science', description: '', image: null },
          ],
        }
      }
      if (args.collection === 'academic-programs') {
        return {
          docs: [
            { id: 101, college: 1 },
            { id: 102, college: 1 },
            { id: 103, college: 2 },
          ],
        }
      }
      if (args.collection === 'faculty-members') {
        return {
          docs: [
            { id: 201, college: 1 },
            { id: 202, college: 2 },
          ],
        }
      }
      return { docs: [] }
    })

    const { getPublicColleges } = await import('../get-public-colleges')
    const result = await getPublicColleges({ limit: 8, locale: 'en' })

    // No per-college `count` queries should be issued.
    expect(count).not.toHaveBeenCalled()

    // The programs find must use `college: { in: [...] }` (batch), not
    // `college: { equals: <singleId> }` (per-college N+1).
    const programsCall = find.mock.calls.find(
      (c) => c[0].collection === 'academic-programs',
    )
    expect(programsCall).toBeDefined()
    expect(programsCall![0].where.and[0].college).toEqual({
      in: expect.arrayContaining([1, 2]),
    })

    const facultyCall = find.mock.calls.find(
      (c) => c[0].collection === 'faculty-members',
    )
    expect(facultyCall).toBeDefined()
    expect(facultyCall![0].where.and[0].college).toEqual({
      in: expect.arrayContaining([1, 2]),
    })

    // Per-college counts derived from the batched docs.
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          slug: 'eng',
          programsCount: 2,
          facultyCount: 1,
        }),
        expect.objectContaining({
          id: '2',
          slug: 'sci',
          programsCount: 1,
          facultyCount: 1,
        }),
      ]),
    )
  })

  it('getPublicCollegesList batches counts and never calls payload.count', async () => {
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'colleges') {
        return {
          docs: [
            { id: 10, slug: 'biz', name: 'Business', description: '', image: null },
          ],
        }
      }
      if (args.collection === 'academic-programs') {
        return { docs: [{ id: 301, college: 10 }, { id: 302, college: 10 }] }
      }
      if (args.collection === 'faculty-members') {
        return { docs: [{ id: 401, college: 10 }] }
      }
      return { docs: [] }
    })

    const { getPublicCollegesList } = await import('../get-public-colleges')
    const result = await getPublicCollegesList({ locale: 'en', limit: 50 })

    expect(count).not.toHaveBeenCalled()

    // The batched find must scope by `college: { in: [...] }`.
    const programsCall = find.mock.calls.find(
      (c) => c[0].collection === 'academic-programs',
    )
    expect(programsCall![0].where.and[0].college).toEqual({ in: [10] })
    expect(programsCall![0]).toEqual(
      expect.objectContaining({ limit: 0, depth: 0 }),
    )

    // Counts attached to the raw College doc.
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 10,
        slug: 'biz',
        programsCount: 2,
        facultyCount: 1,
      }),
    )
  })

  it('handles populated college relationship objects in batched docs', async () => {
    // With depth > 0 the `college` field on programs/faculty would be a
    // populated object. buildCollegeCounts uses depth: 0 so this shouldn't
    // happen at runtime, but the helper must still tolerate the object shape
    // (defensive — matches extractRelationId's contract).
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'colleges') {
        return { docs: [{ id: 5, slug: 'law', name: 'Law', description: '', image: null }] }
      }
      if (args.collection === 'academic-programs') {
        return { docs: [{ id: 501, college: { id: 5, name: 'Law' } }] }
      }
      if (args.collection === 'faculty-members') {
        return { docs: [{ id: 502, college: { id: 5, name: 'Law' } }] }
      }
      return { docs: [] }
    })

    const { getPublicColleges } = await import('../get-public-colleges')
    const result = await getPublicColleges({ limit: 4, locale: 'en' })

    expect(result).toEqual([
      expect.objectContaining({ id: '5', programsCount: 1, facultyCount: 1 }),
    ])
  })

  it('returns zero counts when no programs or faculty exist', async () => {
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'colleges') {
        return { docs: [{ id: 7, slug: 'med', name: 'Medicine', description: '', image: null }] }
      }
      return { docs: [] }
    })

    const { getPublicColleges } = await import('../get-public-colleges')
    const result = await getPublicColleges({ limit: 4, locale: 'en' })

    expect(count).not.toHaveBeenCalled()
    expect(result).toEqual([
      expect.objectContaining({ id: '7', programsCount: 0, facultyCount: 0 }),
    ])
  })
})
