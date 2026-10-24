/**
 * Tests for the `filterOptions` callbacks added in Issue #38 to the
 * relationship fields that have a college context.
 *
 * Pre-Issue #38, the admin picker for these relationships loaded every
 * record across all colleges (data leak via admin UI, plus N×M query
 * explosion on large datasets). The fix adds `filterOptions` that scope
 * the picker to records belonging to the same `college` as the doc
 * being edited.
 *
 * Covered fields:
 *   - `FacultyMembers.program`        → relationTo: 'academic-programs'
 *   - `FacultyMembers.department`     → relationTo: 'academic-departments'
 *   - `AcademicDepartments.headOfDepartment` → relationTo: 'faculty-members'
 *   - `StudyPlans.academicProgram`    → relationTo: 'academic-programs'
 *
 * For each field we assert two scenarios:
 *   1. `data.college` is set → returns a `Where` clause scoping by college.
 *   2. `data.college` is unset → returns `true` (show all options so the
 *      editor can still pick a college-scoped record before selecting the
 *      parent college).
 */

import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { StudyPlans } from '@/collections/StudyPlans'

type FilterOptionsFn = (args: {
  data?: Record<string, unknown> | null
}) => unknown

/**
 * Walk a CollectionConfig's `fields` array (top-level only — the affected
 * collections do not nest these relationships inside arrays/groups) and
 * return the `filterOptions` callback for the named relationship field.
 * Throws if the field is missing or has no `filterOptions`.
 */
function getFieldFilterOptions(
  fields: unknown[],
  name: string,
): FilterOptionsFn {
  const field = fields.find((f) => {
    if (typeof f !== 'object' || f === null) return false
    return (f as { name?: string }).name === name
  }) as
    | { name?: string; type?: string; filterOptions?: unknown }
    | undefined

  if (!field) {
    throw new Error(`Field '${name}' not found in collection fields`)
  }
  if (field.type !== 'relationship') {
    throw new Error(
      `Field '${name}' is type '${field.type}', expected 'relationship'`,
    )
  }
  if (typeof field.filterOptions !== 'function') {
    throw new Error(
      `Field '${name}' is missing a 'filterOptions' function (Issue #38)`,
    )
  }
  return field.filterOptions as FilterOptionsFn
}

describe('Issue #38 — filterOptions on college-scoped relationship fields', () => {
  describe('FacultyMembers', () => {
    const fields = FacultyMembers.fields

    it('`program` filters academic-programs by data.college', () => {
      const fn = getFieldFilterOptions(fields, 'program')
      const result = fn({ data: { college: 7 } })
      expect(result).toEqual({ college: { equals: 7 } })
    })

    it('`program` returns true when data.college is unset (no pre-selection)', () => {
      const fn = getFieldFilterOptions(fields, 'program')
      expect(fn({ data: {} })).toBe(true)
      expect(fn({ data: undefined })).toBe(true)
      expect(fn({ data: null })).toBe(true)
    })

    it('`department` filters academic-departments by data.college', () => {
      const fn = getFieldFilterOptions(fields, 'department')
      const result = fn({ data: { college: 'college-abc' } })
      expect(result).toEqual({ college: { equals: 'college-abc' } })
    })

    it('`department` returns true when data.college is unset', () => {
      const fn = getFieldFilterOptions(fields, 'department')
      expect(fn({ data: {} })).toBe(true)
    })
  })

  describe('AcademicDepartments', () => {
    const fields = AcademicDepartments.fields

    it('`headOfDepartment` filters faculty-members by data.college', () => {
      const fn = getFieldFilterOptions(fields, 'headOfDepartment')
      const result = fn({ data: { college: 42 } })
      expect(result).toEqual({ college: { equals: 42 } })
    })

    it('`headOfDepartment` returns true when data.college is unset', () => {
      const fn = getFieldFilterOptions(fields, 'headOfDepartment')
      expect(fn({ data: {} })).toBe(true)
      expect(fn({ data: undefined })).toBe(true)
    })
  })

  describe('StudyPlans', () => {
    const fields = StudyPlans.fields

    it('`academicProgram` filters academic-programs by data.college', () => {
      const fn = getFieldFilterOptions(fields, 'academicProgram')
      const result = fn({ data: { college: 9 } })
      expect(result).toEqual({ college: { equals: 9 } })
    })

    it('`academicProgram` returns true when data.college is unset', () => {
      const fn = getFieldFilterOptions(fields, 'academicProgram')
      expect(fn({ data: {} })).toBe(true)
      expect(fn({ data: null })).toBe(true)
    })
  })
})
