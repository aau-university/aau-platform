/**
 * Tests for `FacultyMembers` extracted array fields (PR-012).
 *
 * PR-012 extracts the inline `array` field definitions (`education`,
 * `experience`, `publications`, `courses`, `skills`) from `FacultyMembers/index.ts`
 * into per-name files under `arrays/`. This test asserts:
 *   1. The `FacultyMembers.fields` array still contains the expected array fields with
 *      the expected `name` + `label` + `type: 'array'`.
 *   2. Each array field's sub-fields match the expected names + types
 *      (byte-identical to the pre-PR-012 inline definitions).
 *   3. The extracted `*Array` constants re-exported from `arrays/` are
 *      referentially identical to the entries in `FacultyMembers.fields`
 *      (i.e. extraction is structural — same object reference, not a clone).
 */

import { describe, expect, it } from 'vitest'

import { FacultyMembers } from '@/collections/FacultyMembers'
import { coursesArray } from '@/collections/FacultyMembers/arrays/courses'
import { educationArray } from '@/collections/FacultyMembers/arrays/education'
import { experienceArray } from '@/collections/FacultyMembers/arrays/experience'
import { publicationsArray } from '@/collections/FacultyMembers/arrays/publications'

type NamedField = {
  name?: string
  type?: string
  label?: string
  fields?: Array<{ name?: string; type?: string; localized?: boolean; required?: boolean }>
}

function getArrayField(name: string): NamedField {
  const field = FacultyMembers.fields.find((field) => {
    return typeof field === 'object' && field !== null && 'name' in field && field.name === name
  })
  if (!field) {
    throw new Error(`Array field '${name}' not found on FacultyMembers`)
  }
  return field as NamedField
}

function subFieldNames(field: NamedField): string[] {
  return (field.fields ?? []).map((sub) => sub.name ?? '')
}

describe('FacultyMembers array fields (PR-012 extraction)', () => {
  it('exposes the expected array fields: education, experience, publications, courses, skills', () => {
    const arrayFields = FacultyMembers.fields.filter((field) => {
      return typeof field === 'object' && field !== null && 'type' in field && field.type === 'array'
    })
    const names = arrayFields.map((field) => (field as NamedField).name)
    expect(names).toEqual(['education', 'experience', 'publications', 'courses', 'skills'])
  })

  describe('education array', () => {
    it('has the expected name + label', () => {
      expect(getArrayField('education')).toMatchObject({
        name: 'education',
        type: 'array',
        label: 'Education',
      })
    })

    it('has sub-fields: degree (localized, required), institution (localized), year (text)', () => {
      const field = getArrayField('education')
      expect(subFieldNames(field)).toEqual(['degree', 'institution', 'year'])
      const [degree, institution, year] = field.fields ?? []
      expect(degree).toMatchObject({ name: 'degree', type: 'text', localized: true, required: true })
      expect(institution).toMatchObject({ name: 'institution', type: 'text', localized: true })
      expect(year).toMatchObject({ name: 'year', type: 'text' })
      expect(year?.localized).toBeFalsy()
    })
  })

  describe('experience array', () => {
    it('has the expected name + label', () => {
      expect(getArrayField('experience')).toMatchObject({
        name: 'experience',
        type: 'array',
        label: 'Experience',
      })
    })

    it('has sub-fields: position (localized, required), organization (localized), period (localized)', () => {
      const field = getArrayField('experience')
      expect(subFieldNames(field)).toEqual(['position', 'organization', 'period'])
      const [position, organization, period] = field.fields ?? []
      expect(position).toMatchObject({
        name: 'position',
        type: 'text',
        localized: true,
        required: true,
      })
      expect(organization).toMatchObject({ name: 'organization', type: 'text', localized: true })
      expect(period).toMatchObject({ name: 'period', type: 'text', localized: true })
    })
  })

  describe('publications array', () => {
    it('has the expected name + label', () => {
      expect(getArrayField('publications')).toMatchObject({
        name: 'publications',
        type: 'array',
        label: 'Publications',
      })
    })

    it('has sub-fields: title (localized, required), journal (text), year (text), link (text)', () => {
      const field = getArrayField('publications')
      expect(subFieldNames(field)).toEqual(['title', 'journal', 'year', 'link'])
      const [title, journal, year, link] = field.fields ?? []
      expect(title).toMatchObject({ name: 'title', type: 'text', localized: true, required: true })
      expect(journal).toMatchObject({ name: 'journal', type: 'text' })
      expect(journal?.localized).toBeFalsy()
      expect(year).toMatchObject({ name: 'year', type: 'text' })
      expect(link).toMatchObject({ name: 'link', type: 'text' })
    })
  })

  describe('courses array', () => {
    it('has the expected name + label', () => {
      expect(getArrayField('courses')).toMatchObject({
        name: 'courses',
        type: 'array',
        label: 'Courses',
      })
    })

    it('has sub-fields: code (text), name (localized, required), semester (text)', () => {
      const field = getArrayField('courses')
      expect(subFieldNames(field)).toEqual(['code', 'name', 'semester'])
      const [code, name, semester] = field.fields ?? []
      expect(code).toMatchObject({ name: 'code', type: 'text' })
      expect(code?.localized).toBeFalsy()
      expect(name).toMatchObject({ name: 'name', type: 'text', localized: true, required: true })
      expect(semester).toMatchObject({ name: 'semester', type: 'text' })
    })
  })

  describe('extraction is structural (same object reference)', () => {
    it('education field in FacultyMembers.fields is the same object as educationArray', () => {
      expect(getArrayField('education')).toBe(educationArray)
    })

    it('experience field in FacultyMembers.fields is the same object as experienceArray', () => {
      expect(getArrayField('experience')).toBe(experienceArray)
    })

    it('publications field in FacultyMembers.fields is the same object as publicationsArray', () => {
      expect(getArrayField('publications')).toBe(publicationsArray)
    })

    it('courses field in FacultyMembers.fields is the same object as coursesArray', () => {
      expect(getArrayField('courses')).toBe(coursesArray)
    })
  })
})
