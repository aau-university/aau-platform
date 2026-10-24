import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import type { HomeFallbackNewsItem } from '@/lib/fallback/home-fallback-data'

import { NewsGridSection } from '../NewsGrid'

const news: HomeFallbackNewsItem[] = [
  {
    id: '1',
    title: 'خبر تجريبي',
    slug: 'test-news',
    summary: 'ملخص',
    publishDate: '2026-01-01T00:00:00.000Z',
  },
]

function renderIn(language: 'ar' | 'en') {
  return render(
    <LanguageProvider initialLanguage={language}>
      <NewsGridSection news={news} />
    </LanguageProvider>,
  )
}

describe('NewsGridSection language forwarding', () => {
  afterEach(cleanup)

  it('renders the Arabic card CTA when the site language is Arabic', () => {
    renderIn('ar')
    // Regression: the card button used to stay in English because NewsGrid
    // did not pass `isAr` down to <NewsCard>.
    expect(screen.getByText('تفاصيل الخبر')).toBeTruthy()
    expect(screen.queryByText('Read Article')).toBeNull()
  })

  it('renders the English card CTA when the site language is English', () => {
    renderIn('en')
    expect(screen.getByText('Read Article')).toBeTruthy()
    expect(screen.queryByText('تفاصيل الخبر')).toBeNull()
  })
})
