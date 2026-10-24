import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'
import { CollegeHero } from '../CollegeHero'

function college(overrides: Partial<PublicCollegeDetail> = {}): PublicCollegeDetail {
  return {
    id: '1',
    slug: 'medicine',
    name: 'كلية الطب',
    programsCount: 0,
    facultyCount: 0,
    departmentsCount: 0,
    ...overrides,
  }
}

describe('<CollegeHero /> icon rendering', () => {
  it('renders the stored icon name as an SVG icon, not literal text', () => {
    const { container, queryByText } = render(
      <CollegeHero college={college({ icon: 'Stethoscope' })} locale="ar" />,
    )

    // The literal name must never appear as visible text.
    expect(queryByText('Stethoscope')).toBeNull()
    // An <svg> lucide glyph is rendered in the icon badge instead.
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('falls back to a graduation-cap icon for an unknown icon value', () => {
    const { container, queryByText } = render(
      <CollegeHero college={college({ icon: 'not-a-real-icon' })} locale="en" />,
    )

    expect(queryByText('not-a-real-icon')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
