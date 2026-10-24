import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import type { PublicOfferItem } from '@/lib/payload/get-public-offers'
import type { PublicPartnerItem } from '@/lib/payload/get-public-partners'
import type { PublicProjectItem } from '@/lib/payload/get-public-projects'

import { OffersGridSection } from '../OffersGrid'
import { PartnersGrid } from '../PartnersGrid'
import { ProjectsGridSection } from '../ProjectsGrid'

const projects: PublicProjectItem[] = [
  {
    id: 'active-project',
    title: 'Active Project',
    slug: 'active-project',
    description: 'Active project description',
    image: null,
    images: [],
    startDate: '',
    endDate: '',
    year: 2026,
    progress: 50,
    projectStatus: 'current',
    publishedAt: '',
    displayOrder: 1,
  },
  {
    id: 'completed-project',
    title: 'Completed Project',
    slug: 'completed-project',
    description: 'Completed project description',
    image: null,
    images: [],
    startDate: '',
    endDate: '',
    year: 2025,
    progress: 100,
    projectStatus: 'completed',
    publishedAt: '',
    displayOrder: 2,
  },
]

const offers: PublicOfferItem[] = [
  {
    id: 'scholarship-offer',
    title: 'Scholarship Offer',
    slug: 'scholarship-offer',
    description: '',
    categoryName: 'Scholarship',
    targetAudience: '',
    duration: '',
    location: '',
    requirements: '',
    validUntil: '',
    applyLink: '',
    image: null,
    publishedAt: '',
    displayOrder: 1,
    college: null,
  },
  {
    id: 'discount-offer',
    title: 'Discount Offer',
    slug: 'discount-offer',
    description: '',
    categoryName: 'Discount',
    targetAudience: '',
    duration: '',
    location: '',
    requirements: '',
    validUntil: '',
    applyLink: '',
    image: null,
    publishedAt: '',
    displayOrder: 2,
    college: null,
  },
]

const partners: PublicPartnerItem[] = [
  {
    id: 'local-partner',
    name: 'Local Partner',
    description: '',
    logo: null,
    type: 'local',
    website: '',
    displayOrder: 1,
  },
  {
    id: 'international-partner',
    name: 'International Partner',
    description: '',
    logo: null,
    type: 'international',
    website: '',
    displayOrder: 2,
  },
]

function renderWithLanguage(node: ReactNode) {
  return render(<LanguageProvider initialLanguage="en">{node}</LanguageProvider>)
}

describe('listing filters', () => {
  it('renders only projects matching the selected stable status key', () => {
    renderWithLanguage(<ProjectsGridSection items={projects} disableInnerContainer />)

    const allFilter = screen.getByRole('button', { name: 'All' })
    const completedFilter = screen.getByRole('button', { name: 'Completed' })

    expect(allFilter.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Active Project')).toBeTruthy()
    expect(screen.getByText('Completed Project')).toBeTruthy()

    fireEvent.click(completedFilter)

    expect(completedFilter.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Active Project')).toBeNull()
    expect(screen.getByText('Completed Project')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Planned' }))
    expect(screen.getByRole('status').textContent).toContain('No projects found in this category.')
  })

  it('renders only offers matching the selected category value', () => {
    renderWithLanguage(<OffersGridSection items={offers} disableInnerContainer />)

    expect(screen.getByText('Scholarship Offer')).toBeTruthy()
    expect(screen.getByText('Discount Offer')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Scholarship' }))

    expect(screen.getByText('Scholarship Offer')).toBeTruthy()
    expect(screen.queryByText('Discount Offer')).toBeNull()
  })

  it('renders only partners matching the selected stable type key', () => {
    renderWithLanguage(<PartnersGrid partners={partners} />)

    expect(screen.getByText('Local Partner')).toBeTruthy()
    expect(screen.getByText('International Partner')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'International' }))

    expect(screen.queryByText('Local Partner')).toBeNull()
    expect(screen.getByText('International Partner')).toBeTruthy()
  })
})
