import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FacultyMember } from '@/payload-types'
import { FacultyInfo } from '../FacultyInfo'

const member = {
  fullName: 'Dr. Ada Example',
  researchInterests: 'Accessible computing',
  publications: [{ id: 'publication-1', title: 'Inclusive systems' }],
  courses: [],
  education: [],
  experience: [],
  skills: [],
} as unknown as FacultyMember

describe('<FacultyInfo /> tabs', () => {
  it('hides empty tabs and supports arrow-key selection', () => {
    render(<FacultyInfo member={member} locale="en" sidebar={<div>Sidebar</div>} />)

    const overview = screen.getByRole('tab', { name: 'Bio & Interests' })
    const publications = screen.getByRole('tab', { name: 'Publications' })

    expect(screen.queryByRole('tab', { name: 'Career & Education' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Courses & Skills' })).toBeNull()
    expect(overview.getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(overview, { key: 'ArrowRight' })

    expect(publications.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(publications)
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      'faculty-tab-publications',
    )
  })
})
