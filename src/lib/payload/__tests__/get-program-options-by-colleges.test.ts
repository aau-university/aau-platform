import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

describe('getProgramOptionsByColleges (admission/email-request N+1 fix)', () => {
  beforeEach(() => {
    find.mockReset()
  })

  it('fetches options for many colleges in ONE `college in [ids]` query', async () => {
    find.mockResolvedValueOnce({
      docs: [
        { id: 11, slug: 'software', name: 'Software Engineering', college: 1 },
        { id: 12, slug: 'civil', name: 'Civil Engineering', college: 1 },
        { id: 21, slug: 'nursing', name: 'Nursing', college: 2 },
      ],
    })

    const { getProgramOptionsByColleges } = await import('../get-public-programs')
    const grouped = await getProgramOptionsByColleges([1, 2, 3], 'en')

    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'academic-programs',
        overrideAccess: false,
        depth: 0,
        where: {
          and: [
            { college: { in: [1, 2, 3] } },
            {
              and: [
                { _status: { equals: 'published' } },
                { 'college._status': { equals: 'published' } },
              ],
            },
          ],
        },
      }),
    )
    expect(grouped).toEqual({
      '1': [
        { id: 11, slug: 'software', name: 'Software Engineering' },
        { id: 12, slug: 'civil', name: 'Civil Engineering' },
      ],
      '2': [{ id: 21, slug: 'nursing', name: 'Nursing' }],
    })
  })

  it('handles populated college objects and skips invalid ids without querying for empty input', async () => {
    find.mockResolvedValueOnce({
      docs: [{ id: 31, slug: 'law', name: 'Law', college: { id: 4 } }],
    })

    const { getProgramOptionsByColleges } = await import('../get-public-programs')
    const grouped = await getProgramOptionsByColleges(['4', 'not-a-number'], 'ar')
    expect(grouped['4']).toEqual([{ id: 31, slug: 'law', name: 'Law' }])

    find.mockClear()
    await expect(getProgramOptionsByColleges([], 'ar')).resolves.toEqual({})
    expect(find).not.toHaveBeenCalled()
  })

  it('returns an empty record when the query fails (safe fallback)', async () => {
    find.mockRejectedValueOnce(new Error('db unavailable'))
    const { getProgramOptionsByColleges } = await import('../get-public-programs')
    await expect(getProgramOptionsByColleges([1])).resolves.toEqual({})
  })
})
