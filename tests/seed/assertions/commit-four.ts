import { expect } from 'vitest'
import type { Payload } from 'payload'

import { teamMemberFixtures } from '@/seed/fixtures/content'
import { pageFixtures } from '@/seed/fixtures/cms'
import {
  aboutPageFixture,
  analyticsSettingsFixture,
  contactSettingsFixture,
  footerSettingsFixture,
  navbarSettingsFixture,
  siteSettingsFixture,
  smartChatSettingsFixture,
} from '@/seed/fixtures/globals'
import { expectFixtureLeaves } from './fixture-match'
import { assertNavigationMenuFixtures, readNavigationMenuSnapshots } from './navigation-reset'

export const freshGlobalShapes = {
  'site-settings': { socialLinks: [] },
  'about-page': {
    header: {},
    intro: {},
    vision: {},
    mission: {},
    goals: {},
    values: {},
    president: {},
    teamSection: {},
    teamMembers: [],
  },
  'contact-settings': { page: {}, formLabels: {}, contactInfo: {} },
  'smart-chat-settings': { isEnabled: false },
  'navbar-settings': {
    topBarItems: [],
    callToAction: { type: 'reference', appearance: 'default' },
    hideLogin: false,
    showLanguagePicker: true,
  },
  'footer-settings': {
    footerItems: [],
    footerBackgroundType: 'none',
    footerBackgroundOverlayOpacity: 0.65,
    hideFooterSignup: false,
  },
  'analytics-settings': {
    googleAnalyticsAnonymizeIp: true,
    enableViewTracking: true,
    enableGoogleIndexing: false,
  },
} as const

const globalSlugs = Object.keys(freshGlobalShapes) as Array<keyof typeof freshGlobalShapes>

export async function assertFreshGlobalShapes(payload: Payload): Promise<void> {
  const globals = await Promise.all(
    globalSlugs.map(async (slug) => [slug, await readGlobal(payload, slug)] as const),
  )
  for (const [slug, value] of globals) {
    expect(withoutMetadata(value), slug).toEqual(freshGlobalShapes[slug])
  }
}

export async function assertInitializedCommitFourGlobals(payload: Payload): Promise<void> {
  const [
    members,
    siteAr,
    siteEn,
    aboutAr,
    aboutEn,
    contactAr,
    contactEn,
    smartChat,
    navbarAr,
    navbarEn,
    navbarAll,
    footerAr,
    footerEn,
    analytics,
  ] = await Promise.all([
    payload.find({
      collection: 'team-members',
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      locale: 'ar',
      overrideAccess: true,
      pagination: false,
    }),
    findGlobal(payload, 'site-settings', 'ar'),
    findGlobal(payload, 'site-settings', 'en'),
    findGlobal(payload, 'about-page', 'ar'),
    findGlobal(payload, 'about-page', 'en'),
    findGlobal(payload, 'contact-settings', 'ar'),
    findGlobal(payload, 'contact-settings', 'en'),
    findGlobal(payload, 'smart-chat-settings'),
    findGlobal(payload, 'navbar-settings', 'ar'),
    findGlobal(payload, 'navbar-settings', 'en'),
    findGlobal(payload, 'navbar-settings', 'all'),
    findGlobal(payload, 'footer-settings', 'ar'),
    findGlobal(payload, 'footer-settings', 'en'),
    findGlobal(payload, 'analytics-settings'),
  ])
  const memberIds = new Map(members.docs.map(({ id, slug }) => [slug, id]))
  expectFixtureLeaves(siteAr, { ...siteSettingsFixture.shared, ...siteSettingsFixture.ar }, 'site.ar')
  expectFixtureLeaves(siteEn, siteSettingsFixture.en, 'site.en')
  expect(siteEn.copyright).toBe(siteSettingsFixture.shared.copyright)

  expectFixtureLeaves(aboutAr, aboutPageFixture.ar, 'about.ar')
  expectFixtureLeaves(aboutEn, aboutPageFixture.en, 'about.en')
  expect(aboutAr.teamMembersRelationship).toEqual(
    teamMemberFixtures.map(({ slug }) => memberIds.get(slug)),
  )
  expect(aboutAr.teamMembers).toEqual([])
  expect(aboutEn.teamMembers).toEqual([])

  expectFixtureLeaves(contactAr, contactSettingsFixture.ar, 'contact.ar')
  expectFixtureLeaves(contactEn, contactSettingsFixture.en, 'contact.en')

  expect(smartChat).toMatchObject(smartChatSettingsFixture.shared)
  expect(smartChat.apiEndpoint ?? null).toBeNull()
  expect(smartChat.model ?? null).toBeNull()

  expect(navbarAr.topBarItems).toEqual([])
  expect(navbarEn.topBarItems).toEqual([])
  expect(navbarAll.topBarItems).toEqual([])
  expectFixtureLeaves(navbarAr, navbarSettingsFixture.shared, 'navbar.shared.ar')
  expectFixtureLeaves(navbarEn, navbarSettingsFixture.shared, 'navbar.shared.en')
  expect(navbarEn.callToAction).toEqual(navbarAr.callToAction)
  expect(navbarEn.hideLogin).toBe(navbarAr.hideLogin)
  expect(navbarEn.showLanguagePicker).toBe(navbarAr.showLanguagePicker)

  expect(footerAr.footerItems?.map(({ id }) => id)).toEqual(
    footerEn.footerItems?.map(({ id }) => id),
  )
  expectFixtureLeaves(footerAr, footerSettingsFixture.ar, 'footer.ar')
  expectFixtureLeaves(footerEn, footerSettingsFixture.en, 'footer.en')
  expectFixtureLeaves(footerAr, footerSettingsFixture.shared, 'footer.shared.ar')
  expectFixtureLeaves(footerEn, footerSettingsFixture.shared, 'footer.shared.en')
  expect(footerSharedRows(footerAr.footerItems ?? [])).toEqual(
    footerSharedRows(footerEn.footerItems ?? []),
  )
  for (const [index, row] of (footerAr.footerItems ?? []).entries()) {
    const expectedLink = footerSettingsFixture.ar.footerItems[index]?.link
      expect(row.group ?? null).toBeNull()
    expect(row.link?.reference ?? null).toBeNull()
    expect(row.link).toMatchObject({
      newTab: expectedLink?.newTab,
      type: expectedLink?.type,
      url: expectedLink?.url,
    })
  }
  expect(footerAr).toMatchObject(footerSettingsFixture.shared)
  expect(footerEn.footerBackgroundType).toBe(footerAr.footerBackgroundType)
  expect(footerEn.footerBackgroundOverlayOpacity).toBe(footerAr.footerBackgroundOverlayOpacity)
  expect(footerEn.hideFooterSignup).toBe(footerAr.hideFooterSignup)
  expect(footerAr.address ?? null).toBeNull()
  expect(footerEn.address ?? null).toBeNull()
  expect(footerAr.footerPowered ?? null).toBeNull()
  expect(footerEn.footerPowered ?? null).toBeNull()

  expect(analytics).toMatchObject(analyticsSettingsFixture.shared)
  expect(analytics.googleAnalyticsId ?? null).toBeNull()
  expect(analytics.headHtml ?? null).toBeNull()

  const serialized = JSON.stringify([
    siteAr,
    siteEn,
    aboutAr,
    aboutEn,
    contactAr,
    contactEn,
    smartChat,
    navbarAr,
    footerAr,
    footerEn,
    analytics,
  ])
  expect(serialized).not.toMatch(/example\.com|example\.edu|000000|totalStudents/i)
}

export async function readDashboardSnapshot(payload: Payload): Promise<Record<string, unknown>> {
  return structuredClone(
    (await findGlobal(payload, 'dashboard-metrics')) as unknown as Record<string, unknown>,
  )
}

export async function assertDashboardUnchanged(
  payload: Payload,
  expected: Record<string, unknown>,
): Promise<void> {
  expect(await readDashboardSnapshot(payload)).toEqual(expected)
}

export async function readGlobalTimestampSnapshot(
  payload: Payload,
  except?: keyof typeof freshGlobalShapes,
): Promise<Record<string, null | string | undefined>> {
  const slugs = [...globalSlugs, 'dashboard-metrics' as const].filter((slug) => slug !== except)
  const values = await Promise.all(
    slugs.map(async (slug) => {
      const value = await findGlobal(payload, slug)
      return [slug, value.updatedAt] as const
    }),
  )
  return Object.fromEntries(values)
}

export async function assertCommitFourCms(payload: Payload): Promise<void> {
  const [pagesAr, pagesEn, navigation] = await Promise.all([
    payload.find({ collection: 'pages', depth: 0, draft: true, fallbackLocale: false, limit: 0, locale: 'ar', overrideAccess: true, pagination: false }),
    payload.find({ collection: 'pages', depth: 0, draft: true, fallbackLocale: false, limit: 0, locale: 'en', overrideAccess: true, pagination: false }),
    readNavigationMenuSnapshots(payload),
  ])
  expect(pagesAr.docs).toHaveLength(1)
  const pageAr = pagesAr.docs[0]
  const pageEn = pagesEn.docs[0]
  expect(pageAr?.slug).toBe(pageFixtures[0].slug)
  expect(pageAr?.layout).toHaveLength(5)
  expect(pageAr?.layout.some(({ blockType }) => blockType === 'stats')).toBe(false)
  expect(pageAr?.layout.map(({ id }) => id)).toEqual(pageEn?.layout.map(({ id }) => id))
  expectFixtureLeaves(pageAr, pageFixtures[0].arabic, 'home.ar')
  expectFixtureLeaves(pageEn, pageFixtures[0].english, 'home.en')
  assertNavigationMenuFixtures(navigation)
}

async function readGlobal<TSlug extends keyof typeof freshGlobalShapes>(
  payload: Payload,
  slug: TSlug,
): Promise<Record<string, unknown>> {
  return (await payload.findGlobal({
    slug,
    depth: 0,
    fallbackLocale: false,
    locale: 'all',
    overrideAccess: true,
  })) as unknown as Record<string, unknown>
}

function withoutMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key)),
  )
}

function findGlobal<TSlug extends Parameters<Payload['findGlobal']>[0]['slug']>(
  payload: Payload,
  slug: TSlug,
  locale?: 'all' | 'ar' | 'en',
) {
  return payload.findGlobal({
    slug,
    depth: 0,
    fallbackLocale: false,
    ...(locale ? { locale } : {}),
    overrideAccess: true,
  })
}

function footerSharedRows(
  rows: Array<{ group?: null | string; id?: null | string; link?: unknown }>,
) {
  return rows.map(({ group, id, link }, order) => ({ group: group ?? null, id, link, order }))
}
