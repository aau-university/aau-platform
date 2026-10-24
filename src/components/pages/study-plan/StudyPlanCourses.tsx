'use client'

import { BookOpen } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'
import type { StudyPlan } from '@/payload-types'

type Course = NonNullable<StudyPlan['courses']>[number]

// Sentinels for courses whose (optional) year/semester fields are blank.
// They sort last and render under an "unassigned" heading rather than a
// literal "Year -1" / "Semester 0".
const NO_YEAR = -1
const NO_SEMESTER = '0'

const AR_ORDINALS = [
  'التمهيدية',
  'الأولى',
  'الثانية',
  'الثالثة',
  'الرابعة',
  'الخامسة',
  'السادسة',
  'السابعة',
  'الثامنة',
]

const AR_SEMESTERS: Record<string, string> = {
  '1': 'الفصل الأول',
  '2': 'الفصل الثاني',
  '3': 'الفصل الثالث',
  '4': 'الفصل الرابع',
  '5': 'الفصل الخامس',
  '6': 'الفصل السادس',
  '7': 'الفصل السابع',
  '8': 'الفصل الثامن',
}

function yearLabel(year: number, isAr: boolean): string {
  if (year === NO_YEAR) return isAr ? 'مقررات أخرى' : 'Other Courses'
  if (isAr) return `السنة ${AR_ORDINALS[year] ?? year}`
  return year === 0 ? 'Preparatory Year' : `Year ${year}`
}

function semesterLabel(semester: string, isAr: boolean): string {
  if (semester === NO_SEMESTER) return isAr ? 'غير محدد' : 'Unassigned'
  if (isAr) return AR_SEMESTERS[semester] ?? `الفصل ${semester}`
  return `Semester ${semester}`
}

interface SemesterGroup {
  semester: string
  courses: Course[]
  credits: number
}

interface YearGroup {
  year: number
  semesters: SemesterGroup[]
  credits: number
}

// Comparators that keep the "unassigned" sentinel bucket last regardless
// of its numeric value.
function compareYears(a: number, b: number): number {
  if (a === NO_YEAR) return 1
  if (b === NO_YEAR) return -1
  return a - b
}

function compareSemesters(a: string, b: string): number {
  if (a === NO_SEMESTER) return 1
  if (b === NO_SEMESTER) return -1
  return a.localeCompare(b, undefined, { numeric: true })
}

/**
 * Group a flat course list by year, then by semester within the year.
 * Real years/semesters sort ascending; courses missing the (optional)
 * year/semester fields fall into a trailing "unassigned" bucket
 * (`NO_YEAR` / `NO_SEMESTER`) so nothing is ever dropped.
 */
function groupCourses(courses: Course[]): YearGroup[] {
  const byYear = new Map<number, Map<string, Course[]>>()

  for (const course of courses) {
    const year = typeof course.year === 'number' ? course.year : NO_YEAR
    const semester = course.semester ?? NO_SEMESTER
    if (!byYear.has(year)) byYear.set(year, new Map())
    const bySemester = byYear.get(year)!
    if (!bySemester.has(semester)) bySemester.set(semester, [])
    bySemester.get(semester)!.push(course)
  }

  const creditsOf = (list: Course[]) =>
    list.reduce((sum, c) => sum + (typeof c.credits === 'number' ? c.credits : 0), 0)

  return [...byYear.entries()]
    .sort(([a], [b]) => compareYears(a, b))
    .map(([year, bySemester]) => {
      const semesters = [...bySemester.entries()]
        .sort(([a], [b]) => compareSemesters(a, b))
        .map(([semester, list]) => ({ semester, courses: list, credits: creditsOf(list) }))
      return {
        year,
        semesters,
        credits: semesters.reduce((sum, s) => sum + s.credits, 0),
      }
    })
}

export function StudyPlanCourses({
  courses,
  locale,
}: {
  courses: Course[]
  locale: Locale
}) {
  const isAr = locale === 'ar'

  if (courses.length === 0) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <BookOpen className="size-6" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            {isAr ? 'لم تُضف مقررات إلى هذه الخطة بعد.' : 'No courses have been added to this plan yet.'}
          </p>
        </div>
      </Container>
    )
  }

  const years = groupCourses(courses)

  return (
    <Container className="py-14 md:py-20">
      <div className="flex flex-col gap-12">
        {years.map((yearGroup) => (
          <section key={yearGroup.year} className="scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                {yearLabel(yearGroup.year, isAr)}
              </h2>
              <span className="rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-bold text-secondary">
                {yearGroup.credits} {isAr ? 'ساعة معتمدة' : 'Credit Hours'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {yearGroup.semesters.map((semGroup) => (
                <div
                  key={semGroup.semester}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/5 px-5 py-4 sm:px-6">
                    <h3 className="text-lg font-bold text-foreground">
                      {semesterLabel(semGroup.semester, isAr)}
                    </h3>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {semGroup.credits} {isAr ? 'ساعة' : 'hrs'}
                    </span>
                  </div>

                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 text-start font-semibold sm:px-6">
                          {isAr ? 'الرمز' : 'Code'}
                        </th>
                        <th className="px-2 py-3 text-start font-semibold">
                          {isAr ? 'المقرر' : 'Course'}
                        </th>
                        <th className="px-5 py-3 text-end font-semibold sm:px-6">
                          {isAr ? 'الساعات' : 'Credits'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {semGroup.courses.map((course, idx) => (
                        <tr
                          key={course.id ?? `${course.code ?? 'course'}-${idx}`}
                          className="transition-colors hover:bg-secondary/5"
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-muted-foreground sm:px-6">
                            {course.code || '—'}
                          </td>
                          <td className="px-2 py-3.5 font-medium text-foreground">{course.name}</td>
                          <td className="px-5 py-3.5 text-end font-bold text-secondary sm:px-6">
                            {typeof course.credits === 'number' ? course.credits : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  )
}
