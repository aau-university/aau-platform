import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { CampusLife } from '@/collections/CampusLife'
import { Categories } from '@/collections/Categories'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { Projects } from '@/collections/Projects'
import { StudyPlans } from '@/collections/StudyPlans'
import { categoryFixtures } from '@/seed/fixtures/categories'
import {
  campusLifeFixtures,
  offerFixtures,
  projectFixtures,
  researchPublicationFixtures,
} from '@/seed/fixtures/content'

describe('academic schema contracts used by canonical fixtures', () => {
  it('keeps study-plan semesters as string select values 1 through 8', () => {
    const courses = namedField(StudyPlans.fields, 'courses')
    if (courses.type !== 'array') throw new Error('StudyPlans.courses must be an array field.')
    const semester = namedField(courses.fields, 'semester')
    if (semester.type !== 'select') throw new Error('StudyPlans.courses.semester must be select.')

    expect(semester.options.map((option) => (typeof option === 'string' ? option : option.value))).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8',
    ])
  })

  it('keeps mandatory academic dependencies and the deferred head relationship', () => {
    expect(namedField(FacultyMembers.fields, 'college')).toMatchObject({
      relationTo: 'colleges',
      required: true,
      type: 'relationship',
    })
    expect(namedField(AcademicDepartments.fields, 'college')).toMatchObject({
      relationTo: 'colleges',
      required: true,
      type: 'relationship',
    })
    expect(namedField(AcademicDepartments.fields, 'headOfDepartment')).toMatchObject({
      relationTo: 'faculty-members',
      type: 'relationship',
    })
    // Both now carry Payload's draft workflow. They previously gated public
    // visibility on a hand-rolled `isActive` checkbox with no version history,
    // no preview — so a study plan being revised for the next academic year,
    // or a faculty profile mid-update, had to be either fully public or fully
    // hidden.
    for (const collection of [StudyPlans, FacultyMembers]) {
      const versions = collection.versions
      expect(typeof versions, `${collection.slug} versions`).toBe('object')
      expect((versions as { drafts?: unknown }).drafts, `${collection.slug} drafts`).toBeTruthy()
    }
    // `namedField` throws on a missing field, so absence is asserted directly.
    for (const collection of [StudyPlans, FacultyMembers]) {
      const names = collection.fields.map((field) => ('name' in field ? field.name : undefined))
      expect(names, `${collection.slug} still declares isActive`).not.toContain('isActive')
    }
  })

  it('keeps A-06 filter values compatible with canonical seed taxonomy', () => {
    const categoryKinds = selectValues(namedField(Categories.fields, 'kind'))
    expect(categoryKinds).toEqual(['blog', 'faq', 'offer', 'news', 'event', 'project'])

    const kindByCategorySlug = new Map(categoryFixtures.map(({ kind, slug }) => [slug, kind]))
    expect(offerFixtures.every(({ categorySlug }) => kindByCategorySlug.get(categorySlug) === 'offer')).toBe(true)
    expect(
      researchPublicationFixtures.every(
        ({ categorySlug }) => kindByCategorySlug.get(categorySlug) === 'project',
      ),
    ).toBe(true)

    const campusKinds = new Set(selectValues(namedField(CampusLife.fields, 'kind')))
    expect(campusLifeFixtures.every(({ kind }) => campusKinds.has(kind))).toBe(true)

    const projectStatuses = new Set(selectValues(namedField(Projects.fields, 'projectStatus')))
    expect(projectFixtures.every(({ shared }) => projectStatuses.has(shared.projectStatus))).toBe(true)
  })
})

function namedField(fields: Field[], name: string): Field & { name: string } {
  const field = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!field || !('name' in field)) throw new Error(`Missing schema field: ${name}`)
  return field
}

function selectValues(field: Field & { name: string }): string[] {
  if (field.type !== 'select') throw new Error(`${field.name} must be a select field.`)
  return field.options.map((option) => typeof option === 'string' ? option : String(option.value))
}
