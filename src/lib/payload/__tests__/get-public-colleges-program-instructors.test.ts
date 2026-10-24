import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()

vi.mock('@/lib/payload/safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

import { getProgramKeyInstructors } from '@/lib/payload/get-public-colleges'

describe('getProgramKeyInstructors [Issue #40]', () => {
  beforeEach(() => {
    find.mockReset()
  })

  it('uses `equals` (not `contains`) with a numeric program id', async () => {
    find.mockResolvedValueOnce({ docs: [] })

    await getProgramKeyInstructors('42', { locale: 'ar' })

    expect(find).toHaveBeenCalledTimes(1)
    const call = find.mock.calls[0][0] as {
      collection: string
      where: { and: Array<Record<string, Record<string, unknown>>> }
    }
    expect(call.collection).toBe('faculty-members')
    // The `program` relationship filter must use `equals` with a NUMBER,
    // never `contains` (which would substring-match IDs 142, 420, 1042…).
    const programClause = call.where.and.find((c) => 'program' in c)
    expect(programClause).toBeDefined()
    expect(programClause!.program).toEqual({ equals: 42 })
    expect(programClause!.program).not.toHaveProperty('contains')
    // Sanity: the coerced value is a real number, not a string.
    expect(typeof (programClause!.program as { equals: unknown }).equals).toBe('number')
  })

  it('coerces string ids like "42" to the number 42 before querying', async () => {
    find.mockResolvedValueOnce({ docs: [] })

    await getProgramKeyInstructors('42', { locale: 'ar' })

    const call = find.mock.calls[0][0] as { where: { and: Array<Record<string, Record<string, unknown>>> } }
    const programClause = call.where.and.find((c) => 'program' in c)!
    expect((programClause.program as { equals: unknown }).equals).toBe(42)
  })

  it('returns [] without querying when programId is non-numeric (slug leak guard)', async () => {
    // A slug like 'information-technology' must not be passed to `equals`
    // (Payload would coerce to NaN) nor to `contains` (substring match).
    const result = await getProgramKeyInstructors('information-technology', {
      locale: 'ar',
    })

    expect(result).toEqual([])
    expect(find).not.toHaveBeenCalled()
  })

  it('returns [] without querying when programId is empty / NaN', async () => {
    await expect(getProgramKeyInstructors('', { locale: 'ar' })).resolves.toEqual([])
    expect(find).not.toHaveBeenCalled()

    await expect(getProgramKeyInstructors('not-a-number', { locale: 'ar' })).resolves.toEqual([])
    expect(find).not.toHaveBeenCalled()
  })

  it('does NOT match sibling ids that share a substring (regression for #40)', async () => {
    // The legacy `contains: "42"` bug returned faculty from programs 142,
    // 420, 1042 etc. With `equals: 42`, only program 42 should match.
    find.mockResolvedValueOnce({ docs: [] })

    await getProgramKeyInstructors('42', { locale: 'ar' })

    const call = find.mock.calls[0][0] as { where: { and: Array<Record<string, Record<string, unknown>>> } }
    const programClause = call.where.and.find((c) => 'program' in c)!
    // Ensure the operator is `equals` — `contains` is what caused the leak.
    expect(Object.keys(programClause.program)).toEqual(['equals'])
  })
})
