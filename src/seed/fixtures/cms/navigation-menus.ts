import type { RequiredDataFromCollectionSlug } from 'payload'

import { collegeFixtures } from '../colleges'
import { campusLifeFixtures } from '../content/research-campus'

export const NAVIGATION_MENU_KEYS = ['main'] as const

const collegeChildren = collegeFixtures.map((college, index) => ({
  description: college.description,
  label: college.name,
  openInNewTab: false,
  order: index + 1,
  url: `/colleges/${college.slug}` as const,
}))

const campusChildren = campusLifeFixtures.slice(0, 3).map((campusItem, index) => ({
  description: { ar: campusItem.ar.content, en: campusItem.en.content },
  label: { ar: campusItem.ar.title, en: campusItem.en.title },
  openInNewTab: false,
  order: index + 1,
  url: `/campus-life/${campusItem.slug}` as const,
}))

const mainMenuSource = [
  { label: { ar: 'الرئيسية', en: 'Home' }, url: '/', children: [] },
  { label: { ar: 'عن الجامعة', en: 'About' }, url: '/about', children: [] },
  { label: { ar: 'الكليات', en: 'Colleges' }, url: '/colleges', children: collegeChildren },
  {
    label: { ar: 'الحياة الجامعية', en: 'Campus Life' },
    url: '/campus-life',
    children: campusChildren,
  },
  {
    label: { ar: 'الأبحاث العلمية', en: 'Research Articles' },
    url: '/research/articles',
    children: [],
  },
  { label: { ar: 'الأخبار', en: 'News' }, url: '/news', children: [] },
  { label: { ar: 'القبول والتسجيل', en: 'Admission' }, url: '/admission', children: [] },
  { label: { ar: 'اتصل بنا', en: 'Contact' }, url: '/contact', children: [] },
] as const

function localizeMainItems(locale: 'ar' | 'en') {
  return mainMenuSource.map((item, index) => ({
    children: item.children.map((child) => ({
      description: child.description[locale],
      label: child.label[locale],
      openInNewTab: child.openInNewTab,
      order: child.order,
      url: child.url,
    })),
    group: null,
    label: item.label[locale],
    openInNewTab: false,
    order: index + 1,
    showInMore: false,
    url: item.url,
  }))
}

const mainMenuFixture = {
  key: 'main',
  arabic: {
    isPublished: true,
    items: localizeMainItems('ar'),
    key: 'main',
  } satisfies RequiredDataFromCollectionSlug<'navigation-menus'>,
  english: {
    isPublished: true,
    items: localizeMainItems('en'),
    key: 'main',
  } satisfies RequiredDataFromCollectionSlug<'navigation-menus'>,
} as const

export const navigationMenuFixtures = [mainMenuFixture] as const
