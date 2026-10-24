import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const getDraftPreviewDocument = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

vi.mock('../get-draft-preview-document', () => ({
  getDraftPreviewDocument,
}))

const publishedCollegeChild = {
  and: [{ _status: { equals: 'published' } }, { 'college._status': { equals: 'published' } }],
}

const publishedStudyPlan = {
  and: [
    { _status: { equals: 'published' } },
    { 'academicProgram._status': { equals: 'published' } },
    { 'academicProgram.college._status': { equals: 'published' } },
  ],
}

describe('academic public loaders enforce parent publication', () => {
  beforeEach(() => {
    find.mockReset()
    find.mockResolvedValue({ docs: [] })
    getDraftPreviewDocument.mockReset()
  })

  it('requires a published college for global program grids and options', async () => {
    const { getProgramOptionsByColleges, getPublicPrograms } =
      await import('../get-public-programs')

    await getPublicPrograms({ locale: 'en' })
    await getProgramOptionsByColleges([7], 'en')

    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'academic-programs',
        overrideAccess: false,
        where: publishedCollegeChild,
      }),
    )
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'academic-programs',
        overrideAccess: false,
        where: {
          and: [{ college: { in: [7] } }, publishedCollegeChild],
        },
      }),
    )
  })

  it('requires a published college for faculty lists and details', async () => {
    const { getPublicFacultyBySlug, getPublicFacultyList } = await import('../get-public-faculty')

    await getPublicFacultyList({ locale: 'en' })
    await getPublicFacultyBySlug('dr-example', { locale: 'en' })

    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'faculty-members',
        overrideAccess: false,
        where: { and: [publishedCollegeChild] },
      }),
    )
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'faculty-members',
        overrideAccess: false,
        where: {
          and: [{ slug: { equals: 'dr-example' } }, publishedCollegeChild],
        },
      }),
    )
  })

  it('requires the selected program and its college to be published', async () => {
    const { getPublicFacultyList } = await import('../get-public-faculty')

    await getPublicFacultyList({
      locale: 'en',
      programSlug: 'draft-program',
    })

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'faculty-members',
        overrideAccess: false,
        where: {
          and: [
            publishedCollegeChild,
            { 'program.slug': { equals: 'draft-program' } },
            { 'program._status': { equals: 'published' } },
            { 'program.college._status': { equals: 'published' } },
          ],
        },
      }),
    )
  })

  it('requires the complete college/program chain for study plans', async () => {
    const { getProgramStudyPlan, getPublicStudyPlans } = await import('../get-public-study-plans')

    await getPublicStudyPlans({ locale: 'en' })
    await getProgramStudyPlan(12, { locale: 'en' })

    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'study-plans',
        overrideAccess: false,
        where: publishedStudyPlan,
      }),
    )
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'study-plans',
        overrideAccess: false,
        where: {
          and: [{ academicProgram: { equals: 12 } }, publishedStudyPlan],
        },
      }),
    )
  })

  it('drops parent publication filters only for authenticated draft reads', async () => {
    const { getPublicFacultyBySlug } = await import('../get-public-faculty')
    const user = { id: 9 } as never

    await getPublicFacultyBySlug('draft-member', {
      documentId: 101,
      draft: true,
      locale: 'en',
      user,
    })

    expect(getDraftPreviewDocument).toHaveBeenCalledWith({
      collection: 'faculty-members',
      documentId: 101,
      locale: 'en',
      user,
    })
    expect(find).not.toHaveBeenCalled()
  })
})
