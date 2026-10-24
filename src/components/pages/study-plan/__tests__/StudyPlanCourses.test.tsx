import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { StudyPlan } from '@/payload-types'
import { StudyPlanCourses } from '../StudyPlanCourses'
import { totalCredits } from '../utils'

type Course = NonNullable<StudyPlan['courses']>[number]

const courses: Course[] = [
  { code: 'MED101', name: 'Health Education', credits: 3, year: 1, semester: '1' },
  { code: 'BIO101', name: 'General Biology', credits: 4, year: 1, semester: '1' },
  { code: 'PHY101', name: 'Medical Physics', credits: 3, year: 1, semester: '2' },
  { code: 'MED201', name: 'Physiology', credits: 5, year: 2, semester: '1' },
]

describe('totalCredits', () => {
  it('sums the credit hours across all courses', () => {
    expect(totalCredits(courses)).toBe(15)
  })

  it('ignores courses without a numeric credit value', () => {
    expect(totalCredits([{ name: 'Seminar', credits: null }] as Course[])).toBe(0)
  })
})

describe('<StudyPlanCourses />', () => {
  afterEach(cleanup)

  it('groups courses by year with a per-year credit total', () => {
    render(<StudyPlanCourses courses={courses} locale="en" />)

    // Two year headings.
    expect(screen.getByRole('heading', { name: 'Year 1' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Year 2' })).toBeTruthy()

    // Year 1 has 3+4+3 = 10 credit hours.
    expect(screen.getByText('10 Credit Hours')).toBeTruthy()
    // Year 2 has 5.
    expect(screen.getByText('5 Credit Hours')).toBeTruthy()
  })

  it('splits years into semesters and lists each course code', () => {
    render(<StudyPlanCourses courses={courses} locale="en" />)

    // 3 semester groups total: Y1S1, Y1S2, Y2S1.
    const semesterHeadings = screen.getAllByRole('heading', { name: /^Semester \d$/ })
    expect(semesterHeadings).toHaveLength(3)
    expect(screen.getByText('MED101')).toBeTruthy()
    expect(screen.getByText('Medical Physics')).toBeTruthy()
  })

  it('renders a friendly empty state when there are no courses', () => {
    render(<StudyPlanCourses courses={[]} locale="en" />)
    expect(screen.getByText(/No courses have been added/i)).toBeTruthy()
  })

  it('buckets courses with a blank year/semester into a trailing "Other" group, never "Year -1"', () => {
    const mixed: Course[] = [
      { code: 'X1', name: 'Unassigned Course', credits: 2 },
      ...courses,
    ]
    render(<StudyPlanCourses courses={mixed} locale="en" />)

    // No literal sentinel headings leak into the UI.
    expect(screen.queryByText(/Year -1/)).toBeNull()
    expect(screen.queryByText(/Semester 0/)).toBeNull()

    // The blank-year course lands under an "Other Courses" heading...
    const otherHeading = screen.getByRole('heading', { name: 'Other Courses' })
    expect(otherHeading).toBeTruthy()
    expect(within(otherHeading.closest('section') as HTMLElement).getByText('Unassigned')).toBeTruthy()

    // ...and it renders after the real Year 1 / Year 2 sections.
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Year 1', 'Year 2', 'Other Courses'])
  })

  it('uses Arabic labels under the ar locale', () => {
    render(<StudyPlanCourses courses={courses} locale="ar" />)
    expect(screen.getByRole('heading', { name: 'السنة الأولى' })).toBeTruthy()
    const yearTwo = screen.getByRole('heading', { name: 'السنة الثانية' })
    expect(within(yearTwo.closest('section') as HTMLElement).getByText(/ساعة معتمدة/)).toBeTruthy()
  })
})
