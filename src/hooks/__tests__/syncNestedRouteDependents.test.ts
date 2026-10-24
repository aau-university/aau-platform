import { beforeEach, describe, expect, it, vi } from 'vitest'

const { syncManagedRedirects } = vi.hoisted(() => ({
  syncManagedRedirects: vi.fn(),
}))

vi.mock('@/hooks/managedRedirectLifecycle', () => ({ syncManagedRedirects }))

import {
  captureNestedRouteDependentsBeforeDelete,
  syncCollegeRouteDependents,
  syncProgramRouteDependents,
} from '@/hooks/syncNestedRouteDependents'

const find = vi.fn()

function request() {
  return { context: {}, payload: { find } }
}

describe('syncCollegeRouteDependents', () => {
  beforeEach(() => {
    find.mockReset()
    syncManagedRedirects.mockReset()
  })

  it('updates Program and Study Plan redirects after a College slug rename', async () => {
    find
      .mockResolvedValueOnce({ docs: [{ id: 9, slug: 'software' }] })
      .mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    const paths = await syncCollegeRouteDependents({
      collegeId: 3,
      currentCollegePath: '/colleges/engineering',
      isPublic: true,
      previousCollegePath: '/colleges/old-engineering',
      req: request() as never,
    })

    expect(syncManagedRedirects).toHaveBeenNthCalledWith(1, expect.objectContaining({
      collection: 'academic-programs',
      currentPath: '/colleges/engineering/programs/software',
      previousPath: '/colleges/old-engineering/programs/software',
      routeKey: 'detail',
    }))
    expect(syncManagedRedirects).toHaveBeenNthCalledWith(2, expect.objectContaining({
      collection: 'study-plans',
      currentPath: '/colleges/engineering/programs/software/study-plan',
      documentId: 11,
      previousPath: '/colleges/old-engineering/programs/software/study-plan',
      routeKey: 'detail',
    }))
    expect(paths).toEqual(expect.arrayContaining([
      '/colleges/old-engineering/programs/software',
      '/colleges/engineering/programs/software',
      '/colleges/old-engineering/programs/software/study-plan',
      '/colleges/engineering/programs/software/study-plan',
    ]))
  })

  it('disables descendant authority when a College becomes non-public', async () => {
    find
      .mockResolvedValueOnce({ docs: [{ id: 9, slug: 'software' }] })
      .mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    await syncCollegeRouteDependents({
      collegeId: 3,
      currentCollegePath: null,
      isPublic: false,
      previousCollegePath: '/colleges/engineering',
      req: request() as never,
    })

    expect(syncManagedRedirects).toHaveBeenCalledTimes(2)
    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      currentPath: null,
      isPublic: false,
      previousPath: '/colleges/engineering/programs/software',
    }))
    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      currentPath: null,
      isPublic: false,
      previousPath: '/colleges/engineering/programs/software/study-plan',
    }))
  })

  it('uses dependents captured before a College delete after foreign keys are cleared', async () => {
    const req = request()
    find
      .mockResolvedValueOnce({ docs: [{ id: 9, slug: 'software' }] })
      .mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    await captureNestedRouteDependentsBeforeDelete({
      collection: { slug: 'colleges' },
      context: req.context,
      id: 3,
      req: req as never,
    } as never)
    find.mockClear()

    await syncCollegeRouteDependents({
      collegeId: 3,
      currentCollegePath: null,
      isPublic: false,
      previousCollegePath: '/colleges/engineering',
      req: req as never,
    })

    expect(find).not.toHaveBeenCalled()
    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'academic-programs',
      documentId: 9,
      isPublic: false,
    }))
    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'study-plans',
      documentId: 11,
      isPublic: false,
    }))
  })

  it('avoids descendant database reads when the public College route did not change', async () => {
    const paths = await syncCollegeRouteDependents({
      collegeId: 3,
      currentCollegePath: '/colleges/engineering',
      isPublic: true,
      previousCollegePath: '/colleges/engineering',
      req: request() as never,
    })

    expect(paths).toEqual([])
    expect(find).not.toHaveBeenCalled()
    expect(syncManagedRedirects).not.toHaveBeenCalled()
  })
})

describe('syncProgramRouteDependents', () => {
  beforeEach(() => {
    find.mockReset()
    syncManagedRedirects.mockReset()
  })

  it('keeps Study Plan redirect ownership on the Study Plan after a Program rename', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    const paths = await syncProgramRouteDependents({
      currentProgramPath: '/colleges/engineering/programs/software',
      isPublic: true,
      previousProgramPath: '/colleges/engineering/programs/old-software',
      programId: 9,
      req: request() as never,
    })

    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'study-plans',
      currentPath: '/colleges/engineering/programs/software/study-plan',
      documentId: 11,
      previousPath: '/colleges/engineering/programs/old-software/study-plan',
      routeKey: 'detail',
    }))
    expect(paths).toEqual(expect.arrayContaining([
      '/colleges/engineering/programs/old-software/study-plan',
      '/colleges/engineering/programs/software/study-plan',
    ]))
  })

  it('disables the Study Plan-owned redirect when its Program becomes non-public', async () => {
    find.mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    await syncProgramRouteDependents({
      currentProgramPath: null,
      isPublic: false,
      previousProgramPath: '/colleges/engineering/programs/software',
      programId: 9,
      req: request() as never,
    })

    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'study-plans',
      currentPath: null,
      documentId: 11,
      isPublic: false,
      previousPath: '/colleges/engineering/programs/software/study-plan',
    }))
  })

  it('uses Study Plans captured before a Program delete after its relationship is cleared', async () => {
    const req = request()
    find.mockResolvedValueOnce({ docs: [{ id: 11, academicProgram: 9 }] })

    await captureNestedRouteDependentsBeforeDelete({
      collection: { slug: 'academic-programs' },
      context: req.context,
      id: 9,
      req: req as never,
    } as never)
    find.mockClear()

    await syncProgramRouteDependents({
      currentProgramPath: null,
      isPublic: false,
      previousProgramPath: '/colleges/engineering/programs/software',
      programId: 9,
      req: req as never,
    })

    expect(find).not.toHaveBeenCalled()
    expect(syncManagedRedirects).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'study-plans',
      documentId: 11,
      isPublic: false,
    }))
  })

  it('does not query plans when the public Program route did not change', async () => {
    const paths = await syncProgramRouteDependents({
      currentProgramPath: '/colleges/engineering/programs/software',
      isPublic: true,
      previousProgramPath: '/colleges/engineering/programs/software',
      programId: 9,
      req: request() as never,
    })

    expect(paths).toEqual([])
    expect(find).not.toHaveBeenCalled()
    expect(syncManagedRedirects).not.toHaveBeenCalled()
  })
})
