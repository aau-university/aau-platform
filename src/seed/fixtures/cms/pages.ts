import type { RequiredDataFromCollectionSlug } from 'payload'

import { DEFAULT_HOME_LAYOUT_AR, DEFAULT_HOME_LAYOUT_EN } from '@/blocks/defaultHomeLayout'

export const HOME_PAGE_SLUG = 'home' as const

const sharedHomePageData = {
  _status: 'published',
  slug: HOME_PAGE_SLUG,
} as const

export const homePageFixture = {
  slug: HOME_PAGE_SLUG,
  arabic: {
    ...sharedHomePageData,
    layout: DEFAULT_HOME_LAYOUT_AR,
    title: 'الصفحة الرئيسية',
  } satisfies RequiredDataFromCollectionSlug<'pages'>,
  english: {
    ...sharedHomePageData,
    layout: DEFAULT_HOME_LAYOUT_EN,
    title: 'Home',
  } satisfies RequiredDataFromCollectionSlug<'pages'>,
} as const

export const pageFixtures = [homePageFixture] as const
