import { describe, expect, it, vi } from 'vitest'

import type {
  AcademicDepartment,
  Category,
  College,
  FacultyMember,
  StudyPlan,
} from '@/payload-types'

import { departmentFixtures } from '../fixtures/departments'
import type { SeedOperations } from '../lib/local-api'
import { richText } from '../lib/rich-text'
import type { SeedStageContext } from '../lib/types'
import { createLocalizedIfMissing } from '../stages/helpers'
import { departmentHeadsStage } from '../stages/department-heads'
import { departmentsStage } from '../stages/departments'

function contextWith(operations: Partial<SeedOperations>) {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('academic stages', () => {
  it('fails instead of skipping a missing required dependency', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 })

    await expect(
      departmentsStage.run(contextWith({ find } as Partial<SeedOperations>)),
    ).rejects.toThrow('Missing required colleges dependency')
  })

  it('skips an existing ordinary record without create or update', async () => {
    const existing = {
      createdAt: '',
      id: 44,
      kind: 'news',
      name: 'Editor owned',
      slug: 'editor-owned',
      updatedAt: '',
    } satisfies Category
    const create = vi.fn()
    const update = vi.fn()
    const operations = {
      create,
      find: vi.fn().mockResolvedValue({ docs: [existing], totalDocs: 1 }),
      update,
    } as unknown as SeedOperations

    const result = await createLocalizedIfMissing({
      arabic: { kind: 'news', name: 'محرر', slug: 'editor-owned' },
      collection: 'categories',
      english: { kind: 'news', name: 'Editor', slug: 'editor-owned' },
      operations,
      slug: 'editor-owned',
    })

    expect(result).toEqual({ created: false, doc: existing, skipped: true, updated: false })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('resumes department-head patches when both persisted locales prove canonical ownership', async () => {
    const update = vi.fn().mockResolvedValue({ id: 1 })
    const operations = departmentHeadOperations({ update })

    const result = await departmentHeadsStage.run(contextWith(operations))

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 5 })
    expect(update).toHaveBeenCalledTimes(5)
    expect(update).toHaveBeenCalledWith({
      collection: 'academic-departments',
      data: { headOfDepartment: 201 },
      id: 101,
    })
  })

  it('preserves an editor-owned same-slug department with an empty head', async () => {
    const update = vi.fn()
    const operations = departmentHeadOperations({
      overrideDepartment: (fixture, locale, department) =>
        fixture.slug === 'dept-medicine-general' && locale === 'en'
          ? { ...department, description: richText('Editor-owned description', 'en') }
          : department,
      update,
    })

    const result = await departmentHeadsStage.run(contextWith(operations))

    expect(result).toEqual({ conflict: 1, created: 0, skipped: 0, updated: 4 })
    expect(update).toHaveBeenCalledTimes(4)
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ id: 101 }))
  })

  it('grafts the Arabic course row IDs into the English study-plan update', async () => {
    const persisted = {
      academicProgram: 1,
      courses: [
        { code: 'CS101', id: 'course-1', name: 'برمجة' },
        { code: 'CS102', id: 'course-2', name: 'بيانات' },
      ],
      createdAt: '',
      id: 11,
      name: 'خطة',
      slug: 'plan-test',
      updatedAt: '',
    } satisfies StudyPlan
    const create = vi.fn().mockResolvedValue(persisted)
    const update = vi.fn().mockResolvedValue({ id: 11 })
    const operations = {
      create,
      find: vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
      update,
    } as unknown as SeedOperations

    await createLocalizedIfMissing({
      arabic: {
        academicProgram: 1,
        college: 2,
        courses: [
          { code: 'CS101', name: 'برمجة', semester: '1' },
          { code: 'CS102', name: 'بيانات', semester: '2' },
        ],
        _status: 'published',
        name: 'خطة',
        slug: 'plan-test',
      },
      collection: 'study-plans',
      english: {
        academicProgram: 1,
        college: 2,
        courses: [
          { code: 'CS101', name: 'Programming', semester: '1' },
          { code: 'CS102', name: 'Data', semester: '2' },
        ],
        _status: 'published',
        name: 'Plan',
        slug: 'plan-test',
      },
      operations,
      rowIdSchema: { courses: { keyField: 'code' } },
      slug: 'plan-test',
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courses: [
            expect.objectContaining({ code: 'CS101', id: 'course-1', name: 'Programming' }),
            expect.objectContaining({ code: 'CS102', id: 'course-2', name: 'Data' }),
          ],
        }),
        locale: 'en',
      }),
    )
  })

  it('grafts IDs for all five faculty arrays and makes zero writes when the slug exists', async () => {
    const persisted = {
      college: 1,
      courses: [{ code: 'CS301', id: 'course-1', name: 'ذكاء' }],
      createdAt: '',
      education: [{ degree: 'دكتوراه', id: 'education-1' }],
      experience: [{ id: 'experience-1', position: 'أستاذ' }],
      fullName: 'د. اختبار',
      id: 12,
      publications: [{ id: 'publication-1', title: 'بحث' }],
      skills: [{ id: 'skill-1', name: 'تعلم آلي' }],
      slug: 'dr-test',
      updatedAt: '',
    } satisfies FacultyMember
    const create = vi.fn().mockResolvedValue(persisted)
    const update = vi.fn().mockResolvedValue({ id: 12 })
    const find = vi
      .fn()
      .mockResolvedValueOnce({ docs: [], totalDocs: 0 })
      .mockResolvedValueOnce({ docs: [persisted], totalDocs: 1 })
    const operations = { create, find, update } as unknown as SeedOperations
    const args = {
      arabic: {
        college: 1,
        courses: [{ code: 'CS301', name: 'ذكاء' }],
        education: [{ degree: 'دكتوراه' }],
        experience: [{ position: 'أستاذ' }],
        fullName: 'د. اختبار',
        publications: [{ title: 'بحث' }],
        skills: [{ name: 'تعلم آلي' }],
        slug: 'dr-test',
      },
      collection: 'faculty-members',
      english: {
        college: 1,
        courses: [{ code: 'CS301', name: 'Artificial Intelligence' }],
        education: [{ degree: 'PhD' }],
        experience: [{ position: 'Professor' }],
        fullName: 'Dr Test',
        publications: [{ title: 'Paper' }],
        skills: [{ name: 'Machine Learning' }],
        slug: 'dr-test',
      },
      operations,
      rowIdSchema: {
        courses: { keyField: 'code' },
        education: {},
        experience: {},
        publications: {},
        skills: {},
      },
      slug: 'dr-test',
    } satisfies Parameters<typeof createLocalizedIfMissing<'faculty-members'>>[0]

    const first = await createLocalizedIfMissing(args)
    const second = await createLocalizedIfMissing(args)

    expect(first).toMatchObject({ created: true, updated: true })
    expect(second).toMatchObject({ created: false, skipped: true, updated: false })
    expect(create).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledOnce()
    const english = update.mock.calls[0]?.[0].data
    expect(english.education[0].id).toBe('education-1')
    expect(english.experience[0].id).toBe('experience-1')
    expect(english.publications[0].id).toBe('publication-1')
    expect(english.courses[0].id).toBe('course-1')
    expect(english.skills[0].id).toBe('skill-1')
  })
})

function departmentHeadOperations({
  overrideDepartment,
  update,
}: {
  overrideDepartment?: (
    fixture: (typeof departmentFixtures)[number],
    locale: 'ar' | 'en',
    department: ReturnType<typeof canonicalDepartment>,
  ) => ReturnType<typeof canonicalDepartment>
  update: ReturnType<typeof vi.fn>
}): Partial<SeedOperations> {
  const collegeIds = new Map<string, number>()
  for (const { collegeSlug } of departmentFixtures) {
    if (!collegeIds.has(collegeSlug)) collegeIds.set(collegeSlug, collegeIds.size + 1)
  }
  const find = vi.fn(
    async (args: {
      collection: string
      locale?: 'ar' | 'en'
      where?: { slug?: { equals?: string } }
    }) => {
      const slug = args.where?.slug?.equals
      if (!slug) return { docs: [], totalDocs: 0 }
      if (args.collection === 'colleges') {
        const id = collegeIds.get(slug)
        return {
          docs: id
            ? [
                {
                  createdAt: '',
                  id,
                  name: slug,
                  slug,
                  updatedAt: '',
                } satisfies College,
              ]
            : [],
          totalDocs: id ? 1 : 0,
        }
      }
      const fixture = departmentFixtures.find((candidate) => candidate.slug === slug)
      if (args.collection === 'academic-departments' && fixture) {
        const locale = args.locale ?? 'ar'
        const college = collegeIds.get(fixture.collegeSlug)
        if (!college) throw new Error(`Missing test college: ${fixture.collegeSlug}`)
        const department = canonicalDepartment(fixture, locale, college)
        return {
          docs: [overrideDepartment?.(fixture, locale, department) ?? department],
          totalDocs: 1,
        }
      }
      const facultyIndex = departmentFixtures.findIndex(
        ({ headFacultySlug }) => headFacultySlug === slug,
      )
      if (args.collection === 'faculty-members' && facultyIndex >= 0) {
        return {
          docs: [
            {
              college: 1,
              createdAt: '',
              fullName: slug,
              id: facultyIndex + 201,
              slug,
              updatedAt: '',
            } satisfies FacultyMember,
          ],
          totalDocs: 1,
        }
      }
      return { docs: [], totalDocs: 0 }
    },
  )
  return { find, update } as unknown as Partial<SeedOperations>
}

function canonicalDepartment(
  fixture: (typeof departmentFixtures)[number],
  locale: 'ar' | 'en',
  college: number,
) {
  return {
    college,
    createdAt: '',
    description: richText(fixture.description[locale], locale),
    headOfDepartment: null,
    id: departmentFixtures.findIndex(({ slug }) => slug === fixture.slug) + 101,
    _status: 'published',
    name: fixture.name[locale],
    slug: fixture.slug,
    updatedAt: '',
  } satisfies AcademicDepartment
}
