import { describe, expect, it } from 'vitest'

import { teamMemberFixtures } from '../fixtures/content/team-members'
import * as globalFixtures from '../fixtures/globals'
import {
  aboutPageFixture,
  analyticsSettingsFixture,
  contactSettingsFixture,
  footerSettingsFixture,
  navbarSettingsFixture,
  siteSettingsFixture,
  smartChatSettingsFixture,
} from '../fixtures/globals'

const allFixtures = [
  aboutPageFixture,
  analyticsSettingsFixture,
  contactSettingsFixture,
  footerSettingsFixture,
  navbarSettingsFixture,
  siteSettingsFixture,
  smartChatSettingsFixture,
]

describe('global fixtures', () => {
  it('exports exactly the seven approved fixture-bearing globals', () => {
    expect(Object.keys(globalFixtures).sort()).toEqual([
      'aboutPageFixture',
      'analyticsSettingsFixture',
      'contactSettingsFixture',
      'footerSettingsFixture',
      'navbarSettingsFixture',
      'siteSettingsFixture',
      'smartChatSettingsFixture',
    ])
  })

  it('uses shared/ar/en for localized globals and shared-only for nonlocalized globals', () => {
    for (const fixture of [contactSettingsFixture, siteSettingsFixture]) {
      expect(Object.keys(fixture).sort()).toEqual(['ar', 'en', 'shared'])
    }
    for (const fixture of [footerSettingsFixture, navbarSettingsFixture]) {
      expect(Object.keys(fixture).sort()).toEqual(['ar', 'en', 'shared'])
    }
    for (const fixture of [aboutPageFixture]) {
      expect(Object.keys(fixture).sort()).toEqual(['ar', 'en', 'resolve', 'shared'])
    }

    expect(Object.keys(analyticsSettingsFixture)).toEqual(['shared'])
    expect(Object.keys(smartChatSettingsFixture)).toEqual(['shared'])
  })

  it('keeps site settings limited to authoritative bilingual identity copy', () => {
    expect(siteSettingsFixture).toEqual({
      shared: { copyright: 'جميع الحقوق محفوظة. All rights reserved.' },
      ar: {
        siteName: 'جامعة الجيل الجديد',
        tagline: 'لأجيال واعدة',
        description:
          'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا للمساهمة في تنمية المجتمع.',
      },
      en: {
        siteName: 'AJ JEEL ALJADEED UNIVERSITY',
        tagline: 'FOR PROMISING GENERATIONS',
        description:
          'A leading educational institution aiming to prepare specialised, scientifically qualified graduates who contribute to community development.',
      },
    })
  })

  it('uses canonical team order and president identity without inline members or media', () => {
    expect(aboutPageFixture.resolve.teamMemberSlugs).toEqual(
      teamMemberFixtures.map(({ slug }) => slug),
    )
    expect(aboutPageFixture.shared.teamMembers).toEqual([])
    expect(aboutPageFixture.shared).not.toHaveProperty('teamMemberSlugs')
    expect(aboutPageFixture.resolve.teamMemberSlugs[0]).toBe('president-hamdan')
    expect(aboutPageFixture.ar.president).toMatchObject({
      name: teamMemberFixtures[0].ar.name,
      role: teamMemberFixtures[0].ar.jobTitle,
    })
    expect(aboutPageFixture.en.president).toMatchObject({
      name: teamMemberFixtures[0].en.name,
      role: teamMemberFixtures[0].en.jobTitle,
    })
    expect(aboutPageFixture.ar.intro.body.root.direction).toBe('rtl')
    expect(aboutPageFixture.en.intro.body.root.direction).toBe('ltr')
    expect(deepKeys(aboutPageFixture)).not.toContain('image')
  })

  it('provides only bilingual page and form copy for contact settings', () => {
    expect(contactSettingsFixture.shared).toEqual({})
    expect(Object.keys(contactSettingsFixture.ar).sort()).toEqual(['formLabels', 'page'])
    expect(Object.keys(contactSettingsFixture.en).sort()).toEqual(['formLabels', 'page'])
    expect(deepKeys(contactSettingsFixture)).not.toEqual(
      expect.arrayContaining(['phone', 'email', 'address']),
    )
  })

  it('keeps smart chat safely disabled without provider configuration', () => {
    expect(smartChatSettingsFixture).toEqual({ shared: { isEnabled: false } })
  })

  it('uses an internal admission CTA and active navbar defaults', () => {
    expect(navbarSettingsFixture.shared).toEqual({
      topBarItems: [],
      callToAction: {
        appearance: 'default',
        reference: null,
        type: 'custom',
        url: '/admission',
        newTab: false,
      },
      hideLogin: false,
      showLanguagePicker: true,
    })
  })

  it('contains 12 verified bilingual internal footer links with neutral defaults', () => {
    const expectedRoutes = [
      '/',
      '/about',
      '/colleges',
      '/news',
      '/events',
      '/centers',
      '/projects-studio',
      '/offers',
      '/partners',
      '/faq',
      '/contact',
      '/admission',
    ]

    expect(footerSettingsFixture.ar.footerItems).toHaveLength(12)
    expect(footerSettingsFixture.en.footerItems).toHaveLength(12)
    expect(footerSettingsFixture.ar.footerItems.map(({ link }) => link.url)).toEqual(expectedRoutes)
    const expectedSharedItems = expectedRoutes.map((url) => ({
      group: null,
      link: { type: 'custom', url, newTab: false, reference: null },
    }))
    expect(
      footerSettingsFixture.ar.footerItems.map(({ label: _label, ...item }) => item),
    ).toEqual(expectedSharedItems)
    expect(
      footerSettingsFixture.en.footerItems.every(
        (row) => Object.keys(row).sort().join(',') === 'label',
      ),
    ).toBe(true)
    expect(footerSettingsFixture.shared).toEqual({
      footerBackgroundType: 'none',
      footerBackgroundOverlayOpacity: 0.65,
      hideFooterSignup: false,
    })
  })

  it('uses conservative analytics defaults without GA or head injection', () => {
    expect(analyticsSettingsFixture).toEqual({
      shared: {
        googleAnalyticsAnonymizeIp: true,
        enableViewTracking: true,
        robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api',
        enableGoogleIndexing: false,
      },
    })
  })

  it('individually excludes every forbidden global fixture key and value', () => {
    const source = JSON.stringify(allFixtures)
    const keys = deepKeys(allFixtures)

    expect(keys).not.toContain('socialLinks')
    expect(source).not.toContain('facebook.com')
    expect(source).not.toContain('twitter.com')
    expect(source).not.toContain('instagram.com')
    expect(source).not.toContain('linkedin.com')
    expect(source).not.toContain('youtube.com')

    expect(keys).not.toContain('totalStudents')
    expect(keys).not.toContain('totalPrograms')
    expect(keys).not.toContain('totalCourses')
    expect(keys).not.toContain('totalFaculty')
    expect(keys).not.toContain('totalColleges')
    expect(keys).not.toContain('totalNews')
    expect(keys).not.toContain('totalEvents')
    expect(keys).not.toContain('lastUpdated')

    expect(keys).not.toContain('contactEmail')
    expect(keys).not.toContain('contactPhone')
    expect(keys).not.toContain('phone')
    expect(keys).not.toContain('email')
    expect(keys).not.toContain('address')
    expect(keys).not.toContain('mapLocation')
    expect(keys).not.toContain('logo')
    expect(keys).not.toContain('favicon')
    expect(keys).not.toContain('footerLogo')
    expect(keys).not.toContain('image')
    expect(keys).not.toContain('memberImage')
    expect(keys).not.toContain('footerBackgroundImage')
    expect(keys).not.toContain('footerBackgroundVideo')
    expect(keys).not.toContain('navbarSearch')
    expect(keys).not.toContain('bannerHtml')
    expect(keys).not.toContain('mainMenu')
    expect(keys).not.toContain('footerMenu')
    expect(keys).not.toContain('googleAnalyticsId')
    expect(keys).not.toContain('headHtml')

    expect(source).not.toContain('000000')
    expect(source).not.toContain('example.edu')
    expect(source).not.toContain('portal.example')
    expect(source).not.toContain('mail.example')

    expect(keys).not.toContain('footerPowered')
    expect(source).not.toContain('Powered by the AAU Payload Platform')
    expect(source).not.toContain('مدعوم بواسطة منصة AAU Payload')
    expect(source).not.toContain('Main Campus')
    expect(source).not.toContain('الحرم الرئيسي')

    expect(keys).not.toContain('apiEndpoint')
    expect(keys).not.toContain('model')
    expect(keys).not.toContain('maxTokens')
    expect(keys).not.toContain('temperature')
    expect(keys).not.toContain('provider')
    expect(keys).not.toContain('token')
  })
})

function deepKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(deepKeys)
  if (value === null || typeof value !== 'object') return []

  return Object.entries(value).flatMap(([key, nested]) => [key, ...deepKeys(nested)])
}
