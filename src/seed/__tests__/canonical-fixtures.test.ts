import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { collegeFixtures } from '../fixtures/colleges'
import { departmentFixtures } from '../fixtures/departments'
import { facultyFixtures } from '../fixtures/faculty'
import { programFixtures } from '../fixtures/programs'
import { studyPlanFixtures } from '../fixtures/study-plans'
import { optionalUserFixtures } from '../fixtures/users'
import { defaultSeedStages } from '../stages'

const seedRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('canonical seed contracts', () => {
  it('registers the approved stages in exact dependency order', () => {
    expect(defaultSeedStages.map((stage) => stage.name)).toEqual([
      'roles',
      'bootstrap-admin',
      'categories-and-colleges',
      'optional-users',
      'departments',
      'programs',
      'study-plans-and-faculty',
      'department-heads',
      'team-members',
      'editorial-content',
      'services-content',
      'marketing-content',
      'keyless-content',
      'navigation-and-pages',
      'globals',
    ])
  })

  it('types every study-plan semester as a supported string', () => {
    const semesters = studyPlanFixtures.flatMap((fixture) =>
      fixture.courses.map((course) => course.semester),
    )

    expect(semesters.length).toBeGreaterThan(0)
    expect(semesters.every((semester) => typeof semester === 'string')).toBe(true)
    const allowed = new Set(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(semesters.every((semester) => allowed.has(semester))).toBe(true)
  })

  it('matches the exact bilingual descriptions from the legacy department fixtures', () => {
    expect(departmentFixtures.map(({ description, slug }) => ({ description, slug }))).toEqual([
      {
        description: {
          ar: 'قسم الطب البشري يقدم برنامجاً متكاملاً لإعداد الأطباء',
          en: 'The Department of Human Medicine offers an integrated program to prepare physicians',
        },
        slug: 'dept-medicine-general',
      },
      {
        description: {
          ar: 'قسم متخصص في طب الأسنان',
          en: 'A specialized department in dentistry',
        },
        slug: 'dept-dentistry',
      },
      {
        description: {
          ar: 'قسم الصيدلة يعد الخريجين للعمل في مختلف مجالات الصيدلة',
          en: 'The Pharmacy Department prepares graduates for various pharmacy fields',
        },
        slug: 'dept-pharmacy',
      },
      {
        description: {
          ar: 'قسم شامل في تقنية المعلومات والأنظمة',
          en: 'A comprehensive department in information technology and systems',
        },
        slug: 'dept-information-technology',
      },
      {
        description: {
          ar: 'قسم يؤهل الطلاب لإدارة المؤسسات بكفاءة',
          en: 'A department that prepares students to manage organizations effectively',
        },
        slug: 'dept-business-administration',
      },
    ])
  })

  it('retains every persisted bilingual field represented by the legacy college fixtures', () => {
    const localizedFields = [
      'description',
      'vision',
      'mission',
      'goals',
      'values',
      'strategy',
      'quality',
      'admissionRequirements',
      'deanName',
      'name',
    ] as const

    expect(collegeFixtures).toHaveLength(4)
    for (const fixture of collegeFixtures) {
      for (const field of localizedFields) {
        expect(fixture[field].ar, `${fixture.slug}.${field}.ar`).not.toBe('')
        expect(fixture[field].en, `${fixture.slug}.${field}.en`).not.toBe('')
      }
      expect(fixture.icon).not.toBe('')
      expect(fixture._status).toBe('published')
    }
  })

  it('retains every persisted bilingual field represented by the legacy program fixtures', () => {
    const localizedFields = [
      'name',
      'description',
      'objectives',
      'careerProspects',
      'applicationSteps',
      'whyProgram',
      'highSchoolType',
      'duration',
    ] as const

    expect(programFixtures).toHaveLength(5)
    for (const fixture of programFixtures) {
      for (const field of localizedFields) {
        const value = fixture[field]
        if (Array.isArray(value.ar)) {
          expect(value.ar.length, `${fixture.slug}.${field}.ar`).toBeGreaterThan(0)
          expect(value.en.length, `${fixture.slug}.${field}.en`).toBeGreaterThan(0)
        } else {
          expect(value.ar, `${fixture.slug}.${field}.ar`).not.toBe('')
          expect(value.en, `${fixture.slug}.${field}.en`).not.toBe('')
        }
      }
      expect(fixture._status).toBe('published')
    }
  })

  it('retains every persisted faculty row and the full legacy biography text', () => {
    expect(facultyFixtures).toHaveLength(6)
    expect(
      facultyFixtures.map(({ courses, education, experience, publications, skills }) => ({
        courses: courses.length,
        education: education.length,
        experience: experience.length,
        publications: publications.length,
        skills: skills.length,
      })),
    ).toEqual([
      { courses: 1, education: 2, experience: 2, publications: 1, skills: 3 },
      { courses: 1, education: 1, experience: 1, publications: 0, skills: 3 },
      { courses: 2, education: 1, experience: 1, publications: 1, skills: 3 },
      { courses: 1, education: 1, experience: 1, publications: 0, skills: 3 },
      { courses: 1, education: 1, experience: 1, publications: 0, skills: 3 },
      { courses: 1, education: 1, experience: 1, publications: 0, skills: 3 },
    ])
    expect(facultyFixtures[0]?.biography).toEqual({
      ar: 'أستاذ دكتور في الطب البشري متخصص في الأمراض الباطنية. حاصل على الدكتوراه من جامعة القاهرة.',
      en: 'Professor of Human Medicine specialized in internal medicine. PhD from Cairo University.',
    })
    expect(facultyFixtures[0]?.experience[1]).toEqual({
      organization: { ar: 'جامعة صنعاء', en: "Sana'a University" },
      period: { ar: '2010 - 2015', en: '2010 - 2015' },
      position: { ar: 'أستاذ مساعد', en: 'Assistant Professor' },
    })
  })

  it('uses distinct credential environment variables and an explicit coordinator scope variable', () => {
    const emailEnvs = optionalUserFixtures.map(({ emailEnv }) => emailEnv)
    const passwordEnvs = optionalUserFixtures.map(({ passwordEnv }) => passwordEnv)
    const coordinator = optionalUserFixtures.find(({ roleSlug }) => roleSlug === 'coordinator')

    expect(new Set(emailEnvs).size).toBe(optionalUserFixtures.length)
    expect(new Set(passwordEnvs).size).toBe(optionalUserFixtures.length)
    expect(
      coordinator && 'collegeSlugEnv' in coordinator ? coordinator.collegeSlugEnv : undefined,
    ).toBe('SEED_COORDINATOR_COLLEGE_SLUG')
  })

  it('contains no committed password values or numeric semester fixtures in canonical source', () => {
    const source = [
      readFileSync(join(seedRoot, 'fixtures', 'users.ts'), 'utf8'),
      readFileSync(join(seedRoot, 'fixtures', 'study-plans.ts'), 'utf8'),
      readFileSync(join(seedRoot, 'stages', 'bootstrap-admin.ts'), 'utf8'),
      readFileSync(join(seedRoot, 'stages', 'optional-users.ts'), 'utf8'),
    ].join('\n')

    expect(source).not.toMatch(/password\s*:\s*['"`][^'"`]+['"`]/i)
    expect(source).not.toMatch(/semester\s*:\s*[1-8](?:\D|$)/)
    expect(source).not.toContain('Record<string, unknown>')
    expect(source).not.toContain('as never')
  })
})
