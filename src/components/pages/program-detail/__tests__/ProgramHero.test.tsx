import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AcademicProgram } from '@/payload-types'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'
import { ProgramHero } from '../ProgramHero'

describe('<ProgramHero /> breadcrumb', () => {
  it('keeps the full English college label accessible and enables mobile wrapping', () => {
    const collegeName = 'College of Engineering and Advanced Applied Technologies'

    render(
      <ProgramHero
        locale="en"
        program={{ name: 'Software Engineering' } as AcademicProgram}
        college={{ name: collegeName, slug: 'engineering' } as PublicCollegeDetail}
      />,
    )

    const collegeLink = screen.getByRole('link', { name: collegeName })
    const breadcrumb = collegeLink.closest('nav')

    expect(collegeLink.textContent).toBe(collegeName)
    expect(breadcrumb?.className).toContain('[&_ol]:flex-wrap')
    expect(breadcrumb?.className).toContain('[&_a]:!whitespace-normal')
    expect(breadcrumb?.className).toContain('[overflow-wrap:anywhere]')
  })
})
