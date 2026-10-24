import type { StudyPlan } from '@/payload-types'

type Course = NonNullable<StudyPlan['courses']>[number]

/**
 * Sum the credit hours across a course list, ignoring courses without a
 * numeric credit value. Pure helper (no `'use client'`) so it can be
 * called from both the Server Component route and the client view.
 */
export function totalCredits(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + (typeof c.credits === 'number' ? c.credits : 0), 0)
}
