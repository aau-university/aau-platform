import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const count = vi.fn()

vi.mock('../safe-payload', () => ({
  // `getCollegeBySlug` issues three `payload.count` calls (programs, faculty,
  // departments) after the initial `find`. Provide a default count result so
  // the loader does not throw on the mock returning `undefined`.
  getPayloadSafe: vi.fn(async () => ({ find, count })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

describe('Phase 1.5 Sprint 3 public collection loaders', () => {
  beforeEach(() => {
    find.mockReset()
    count.mockReset()
    count.mockResolvedValue({ totalDocs: 0 })
  })

  it('gets one published college by slug with public access enforced', async () => {
    find.mockResolvedValueOnce({
      docs: [
        {
          id: 7,
          slug: 'engineering',
          name: 'Engineering',
          description: 'About engineering',
          admissionRequirements: 'Apply online',
        },
      ],
    })

    const { getCollegeBySlug } = await import('../get-public-colleges')
    const college = await getCollegeBySlug('engineering', { locale: 'en' })

    expect(college).toMatchObject({
      id: '7',
      slug: 'engineering',
      name: 'Engineering',
      admissionRequirements: 'Apply online',
    })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'colleges',
        overrideAccess: false,
        locale: 'en',
        limit: 1,
        where: {
          and: [{ slug: { equals: 'engineering' } }, { _status: { equals: 'published' } }],
        },
      }),
    )
  })

  // College-scoped loaders now use relationship-path where clauses
  // (`'college.slug'` + `'college._status'`) — one query per loader instead
  // of the legacy resolve-slug-then-filter chain.
  const collegeScope = [{ 'college.slug': { equals: 'engineering' } }]
  const publishedCollegeChild = {
    and: [{ _status: { equals: 'published' } }, { 'college._status': { equals: 'published' } }],
  }

  it('gets published programs for a college slug in a single scoped query', async () => {
    find.mockResolvedValueOnce({
      docs: [
        {
          id: 22,
          slug: 'computer-engineering',
          name: 'Computer Engineering',
          description: 'Program body',
          whyProgram: 'Strong labs',
          applicationSteps: 'Submit documents',
          highSchoolType: 'Scientific',
          department: 3,
        },
      ],
    })

    const { getCollegePrograms } = await import('../get-public-colleges')
    const programs = await getCollegePrograms('engineering', { locale: 'en' })

    expect(programs).toEqual([
      expect.objectContaining({
        id: '22',
        slug: 'computer-engineering',
        name: 'Computer Engineering',
        whyProgram: 'Strong labs',
        applicationSteps: 'Submit documents',
        highSchoolType: 'Scientific',
        departmentId: '3',
      }),
    ])
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'academic-programs',
        overrideAccess: false,
        where: {
          and: [...collegeScope, publishedCollegeChild],
        },
      }),
    )
  })

  it('gets published faculty for a college slug in a single scoped query', async () => {
    find.mockResolvedValueOnce({
      docs: [
        {
          id: 31,
          slug: 'dr-samira',
          fullName: 'Dr. Samira',
          academicTitle: 'Professor',
          biography: 'Bio',
        },
      ],
    })

    const { getCollegeFaculty } = await import('../get-public-colleges')
    const faculty = await getCollegeFaculty('engineering', { locale: 'en' })

    expect(faculty).toEqual([
      expect.objectContaining({
        id: '31',
        slug: 'dr-samira',
        fullName: 'Dr. Samira',
      }),
    ])
    expect(find).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'faculty-members',
        overrideAccess: false,
        where: {
          and: [...collegeScope, publishedCollegeChild],
        },
      }),
    )
  })

  it('gets published college news and events without leaking unpublished content', async () => {
    find
      .mockResolvedValueOnce({
        docs: [{ id: 41, slug: 'news-one', title: 'News', summary: 'Summary' }],
      })
      .mockResolvedValueOnce({
        docs: [{ id: 42, slug: 'event-one', title: 'Event', description: 'Desc' }],
      })

    const { getCollegeNews, getCollegeEvents } = await import('../get-public-colleges')
    await expect(getCollegeNews('engineering', { locale: 'en' })).resolves.toHaveLength(1)
    await expect(getCollegeEvents('engineering', { locale: 'en' })).resolves.toHaveLength(1)

    expect(find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'news',
        overrideAccess: false,
        where: {
          and: [...collegeScope, publishedCollegeChild],
        },
      }),
    )
    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'events',
        overrideAccess: false,
        where: {
          and: [...collegeScope, publishedCollegeChild],
        },
      }),
    )
  })

  it('returns safe empty results when Payload queries fail', async () => {
    find.mockRejectedValueOnce(new Error('db unavailable'))
    const { getCollegePrograms } = await import('../get-public-colleges')
    await expect(getCollegePrograms('engineering')).resolves.toEqual([])
  })
})
