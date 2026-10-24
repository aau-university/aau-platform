import { describe, expect, it, vi } from 'vitest'

import { deriveStudyPlanCollege } from '../integrity'

function hookArgs(overrides: Record<string, unknown> = {}) {
  const findByID = vi.fn().mockResolvedValue({ college: 7, id: 11 })

  return {
    args: {
      data: { academicProgram: 11 },
      operation: 'create' as const,
      originalDoc: undefined,
      req: { payload: { findByID } },
      ...overrides,
    },
    findByID,
  }
}

describe('StudyPlans program-college integrity', () => {
  it('derives college from a raw academic-program ID on create', async () => {
    const { args, findByID } = hookArgs()

    await expect(deriveStudyPlanCollege(args as never)).resolves.toMatchObject({
      academicProgram: 11,
      college: 7,
    })
    expect(findByID).toHaveBeenCalledWith({
      collection: 'academic-programs',
      depth: 0,
      id: 11,
      req: args.req,
    })
  })

  it('normalizes populated relationship shapes', async () => {
    const { args } = hookArgs({
      data: { academicProgram: { id: 11 }, college: { id: 7 } },
    })

    await expect(deriveStudyPlanCollege(args as never)).resolves.toMatchObject({
      college: 7,
    })
  })

  it('uses the original academic program for a college-only update', async () => {
    const { args } = hookArgs({
      data: { name: 'Updated' },
      operation: 'update',
      originalDoc: { academicProgram: { id: 11 }, college: { id: 7 } },
    })

    await expect(deriveStudyPlanCollege(args as never)).resolves.toMatchObject({
      college: 7,
      name: 'Updated',
    })
  })

  it('derives college when Payload materializes an omitted relationship as null', async () => {
    const { args } = hookArgs({ data: { academicProgram: 11, college: null } })

    await expect(deriveStudyPlanCollege(args as never)).resolves.toMatchObject({
      academicProgram: 11,
      college: 7,
    })
  })

  it.each([8, { id: 8 }])('rejects an explicitly conflicting college (%j)', async (college) => {
    const { args } = hookArgs({ data: { academicProgram: 11, college } })

    await expect(deriveStudyPlanCollege(args as never)).rejects.toMatchObject({
      status: 400,
    })
  })
})
