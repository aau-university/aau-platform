import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import type { PublicOfferItem } from '@/lib/payload/get-public-offers'
import type { PublicProjectItem } from '@/lib/payload/get-public-projects'
import type { PublicResearchArticleItem } from '@/lib/payload/get-public-research'

import { OfferCard } from '../OfferCard'
import { ProjectCard } from '../ProjectCard'
import { ResearchCard } from '../ResearchCard'

function renderCard(node: ReactNode) {
  return render(<LanguageProvider initialLanguage="en">{node}</LanguageProvider>)
}

describe('listing card links', () => {
  it('keeps offer detail links intact', () => {
    const offer = {
      id: 'offer-1',
      title: 'Student Offer',
      slug: 'student-offer',
      description: '',
      categoryName: '',
      targetAudience: '',
      duration: '',
      location: '',
      requirements: '',
      validUntil: '',
      applyLink: '',
      image: null,
      publishedAt: '',
      displayOrder: 0,
      college: null,
    } satisfies PublicOfferItem

    renderCard(<OfferCard offer={offer} />)
    expect(
      screen.getByRole('link', { name: /Offer details: Student Offer/i }).getAttribute('href'),
    ).toBe('/offers/student-offer')
  })

  it('keeps project detail links intact', () => {
    const project = {
      id: 'project-1',
      title: 'Solar Project',
      slug: 'solar-project',
      description: '',
      image: null,
      images: [],
      startDate: '',
      endDate: '',
      year: null,
      progress: null,
      projectStatus: 'planned',
      publishedAt: '',
      displayOrder: 0,
    } satisfies PublicProjectItem

    renderCard(<ProjectCard project={project} />)
    expect(
      screen
        .getByRole('link', { name: /View project details: Solar Project/i })
        .getAttribute('href'),
    ).toBe('/projects-studio/solar-project')
  })

  it('keeps research detail links intact', () => {
    const research = {
      id: 'research-1',
      title: 'AI Research',
      slug: 'ai-research',
      summary: '',
      author: '',
      image: null,
      categoryName: '',
      publishDate: '',
      tags: [],
      displayOrder: 0,
    } satisfies PublicResearchArticleItem

    renderCard(<ResearchCard research={research} />)
    expect(
      screen.getByRole('link', { name: /Research details: AI Research/i }).getAttribute('href'),
    ).toBe('/research/articles/ai-research')
  })

  it('formats research publication dates with the shared locale formatter', () => {
    const research = {
      id: 'dated-research',
      title: 'Dated Research',
      slug: 'dated-research',
      summary: '',
      author: '',
      image: null,
      categoryName: '',
      publishDate: '2026-07-17T23:30:00-05:00',
      tags: [],
      displayOrder: 0,
    } satisfies PublicResearchArticleItem

    renderCard(<ResearchCard research={research} />)

    expect(screen.getByText('July 18, 2026')).toBeTruthy()
  })

  it('shows the final project progress immediately when reduced motion is enabled', () => {
    const project = {
      id: 'active-project',
      title: 'Active Project',
      slug: 'active-project',
      description: '',
      image: null,
      images: [],
      startDate: '',
      endDate: '',
      year: null,
      progress: 67,
      projectStatus: 'current',
      publishedAt: '',
      displayOrder: 0,
    } satisfies PublicProjectItem

    renderCard(<ProjectCard project={project} />)

    expect(screen.getByText('67')).toBeTruthy()
  })
})
