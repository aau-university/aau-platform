import type { RequiredDataFromCollectionSlug } from 'payload'

import type { AcademicDepartment, AcademicProgram, College } from '@/payload-types'

import { facultyFixtures } from '../fixtures/faculty'
import { studyPlanFixtures } from '../fixtures/study-plans'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { richText } from '../lib/rich-text'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from './helpers'
import { published } from '../fixtures/content/shared'

const studyPlanRows = { courses: { keyField: 'code' } } as const
const facultyRows = {
  courses: { keyField: 'code' },
  education: {},
  experience: {},
  publications: {},
  skills: {},
} as const

export const academicContentStage: SeedStage = {
  name: 'study-plans-and-faculty',
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()

    for (const fixture of studyPlanFixtures) {
      const program = await requireBySlug(operations, 'academic-programs', fixture.programSlug)
      const college = await requireBySlug(operations, 'colleges', fixture.collegeSlug)
      const shared = {
        academicProgram: program.id,
        college: college.id,
        slug: fixture.slug,
        ...published,
      }
      const arabicCourses = fixture.courses.map(({ name, ...course }) => ({
        ...course,
        name: name.ar,
      }))
      const englishCourses = fixture.courses.map(({ name, ...course }) => ({
        ...course,
        name: name.en,
      }))
      const result = await createLocalizedIfMissing({
        arabic: {
          ...shared,
          courses: arabicCourses,
          name: fixture.name.ar,
        } satisfies RequiredDataFromCollectionSlug<'study-plans'>,
        collection: 'study-plans',
        english: {
          ...shared,
          courses: englishCourses,
          name: fixture.name.en,
        } satisfies RequiredDataFromCollectionSlug<'study-plans'>,
        operations,
        rowIdSchema: studyPlanRows,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }

    for (const fixture of facultyFixtures) {
      const college = await requireBySlug(operations, 'colleges', fixture.collegeSlug)
      const department = await requireBySlug(
        operations,
        'academic-departments',
        fixture.departmentSlug,
      )
      const programIds: AcademicProgram['id'][] = []
      for (const slug of fixture.programSlugs) {
        const program = await requireBySlug(operations, 'academic-programs', slug)
        programIds.push(program.id)
      }
      const arabic = facultyData(
        fixture,
        college.id,
        department.id,
        programIds,
        'ar',
      ) satisfies RequiredDataFromCollectionSlug<'faculty-members'>
      const english = facultyData(
        fixture,
        college.id,
        department.id,
        programIds,
        'en',
      ) satisfies RequiredDataFromCollectionSlug<'faculty-members'>
      const result = await createLocalizedIfMissing({
        arabic,
        collection: 'faculty-members',
        english,
        operations,
        rowIdSchema: facultyRows,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }
    return counts
  },
}

function facultyData(
  fixture: (typeof facultyFixtures)[number],
  college: College['id'],
  department: AcademicDepartment['id'],
  programs: AcademicProgram['id'][],
  locale: 'ar' | 'en',
) {
  return {
    academicTitle: fixture.academicTitle[locale],
    biography: richText(fixture.biography[locale], locale),
    college,
    courses: fixture.courses.map((course) => ({
      code: course.code,
      name: course.name[locale],
      semester: course.semester,
    })),
    education: fixture.education.map((education) => ({
      degree: education.degree[locale],
      institution: education.institution[locale],
      year: education.year,
    })),
    experience: fixture.experience.map((experience) => ({
      organization: experience.organization[locale],
      period: experience.period[locale],
      position: experience.position[locale],
    })),
    fullName: fixture.fullName[locale],
    department,
    email: fixture.email,
    ...published,
    officeHours: fixture.officeHours[locale],
    phone: fixture.phone,
    publications: fixture.publications.map((publication) => ({
      journal: publication.journal,
      title: publication.title[locale],
      year: publication.year,
    })),
    researchInterests: fixture.researchInterests[locale],
    program: programs,
    skills: fixture.skills.map((skill) => ({ name: skill[locale] })),
    slug: fixture.slug,
  }
}
