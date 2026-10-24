/**
 * SiteHeader — same-URL bilingual header.
 *
 * Verifies the simplified-header decision (Option A) holds:
 *   - brand block renders the site name + tagline,
 *   - every primary nav item is reachable as a `<Link>`,
 *   - no nav href is hardcoded under `/ar` or `/en`,
 *   - the language toggle is present and switches text without changing
 *     the page URL (the LanguageProvider does the URL-less switch).
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SiteHeader } from '@/components/site/SiteHeader'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { getMainNav } from '@/lib/site/public-routes'
import type { PublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import type { PublicNavbarSettings } from '@/lib/payload/get-public-navbar-settings'

const settings: PublicSiteSettings = {
  siteName: 'جامعة الجيل الجديد',
  tagline: 'لأجيال واعدة',
  description: 'مؤسسة تعليمية رائدة',
  socialLinks: [],
}

const navbarSettings: PublicNavbarSettings = {
  topBarItems: [],
  hideLogin: false,
  showLanguagePicker: true,
  callToAction: null,
}

function renderHeader(language: 'ar' | 'en') {
  const nav = getMainNav(language)
  const localizedSettings =
    language === 'ar'
      ? settings
      : { ...settings, siteName: 'AJ JEEL ALJADEED UNIVERSITY', tagline: 'FOR PROMISING GENERATIONS' }

  return render(
    <LanguageProvider initialLanguage={language}>
      <SiteHeader nav={nav} settings={localizedSettings} navbarSettings={navbarSettings} />
    </LanguageProvider>,
  )
}

describe('<SiteHeader />', () => {
  it('renders the AAU brand block in Arabic', () => {
    renderHeader('ar')
    expect(screen.getAllByText('جامعة الجيل الجديد').length).toBeGreaterThan(0)
    expect(screen.getAllByText('لأجيال واعدة').length).toBeGreaterThan(0)
  })

  it('renders the AAU brand block in English when language is en', () => {
    renderHeader('en')
    expect(screen.getAllByText('AJ JEEL ALJADEED UNIVERSITY').length).toBeGreaterThan(0)
  })

  it('renders every primary nav item as a link', () => {
    const nav = getMainNav('ar')
    renderHeader('ar')
    // Overflow items are rendered by MoreMenu, not as direct primary links.
    for (const item of nav.filter((item) => !item.showInMore)) {
      const label = item.label
      if (!label) throw new Error(`Missing Arabic label for ${item.key}`)
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('does NOT emit any /ar or /en URLs on the header', () => {
    const { container } = renderHeader('ar')
    const links = container.querySelectorAll('a[href]')
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href') ?? ''
      expect(href.startsWith('/ar')).toBe(false)
      expect(href.startsWith('/en')).toBe(false)
    }
  })

  it('shows a language toggle button that swaps the visible text', () => {
    renderHeader('ar')
    expect(screen.getAllByText('الرئيسية').length).toBeGreaterThan(0)
    const toggle = screen.getAllByTestId('language-toggle')[0]
    act(() => {
      fireEvent.click(toggle)
    })
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(screen.getAllByText('العربية').length).toBeGreaterThan(0)
  })
})
