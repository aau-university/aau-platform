import { isDeepStrictEqual } from 'node:util'

import type { AcademicDepartment } from '@/payload-types'

import type { SeedOperations } from '../lib/local-api'
import { departmentFixtures } from '../fixtures/departments'
import { richText, type SeedLocale } from '../lib/rich-text'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { relationshipId, requireBySlug, wasCreated } from './helpers'

export const departmentHeadsStage: SeedStage = {
  name: 'department-heads',
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    for (const fixture of departmentFixtures) {
      const department = await requireBySlug(
        operations,
        'academic-departments',
        fixture.slug,
      )
      const faculty = await requireBySlug(operations, 'faculty-members', fixture.headFacultySlug)
      const currentHead = relationshipId(department.headOfDepartment)
      if (currentHead === faculty.id) {
        counts.skipped += 1
        continue
      }
      if (department.headOfDepartment != null) {
        counts.conflict += 1
        continue
      }

      const owned =
        wasCreated(state, 'academic-departments', department.id) ||
        (await isCanonicalDepartment(operations, department, fixture))
      if (!owned) {
        counts.conflict += 1
        continue
      }
      await operations.update({
        collection: 'academic-departments',
        data: { headOfDepartment: faculty.id },
        id: department.id,
      })
      counts.updated += 1
    }
    return counts
  },
}

async function isCanonicalDepartment(
  operations: SeedOperations,
  arabic: AcademicDepartment,
  fixture: (typeof departmentFixtures)[number],
): Promise<boolean> {
  const college = await requireBySlug(operations, 'colleges', fixture.collegeSlug)
  const englishResult = await operations.find({
    collection: 'academic-departments',
    depth: 0,
    limit: 1,
    locale: 'en',
    where: { slug: { equals: fixture.slug } },
  })
  const english = englishResult.docs[0]
  return (
    english !== undefined &&
    matchesCanonicalLocale(arabic, fixture, college.id, 'ar') &&
    matchesCanonicalLocale(english, fixture, college.id, 'en')
  )
}

function matchesCanonicalLocale(
  department: AcademicDepartment,
  fixture: (typeof departmentFixtures)[number],
  collegeId: number | string,
  locale: SeedLocale,
): boolean {
  return (
    department.slug === fixture.slug &&
    department.name === fixture.name[locale] &&
    isDeepStrictEqual(department.description, richText(fixture.description[locale], locale)) &&
    relationshipId(department.college) === collegeId &&
    department._status === fixture._status
  )
}
