import { describe, expect, it } from 'vitest'

import { DEFAULT_HOME_LAYOUT_AR, DEFAULT_HOME_LAYOUT_EN } from '@/blocks/defaultHomeLayout'

import {
  cmsFixtureCounts,
  HOME_PAGE_SLUG,
  NAVIGATION_MENU_KEYS,
  navigationMenuFixtures,
  pageFixtures,
} from '../fixtures/cms'
import { collegeFixtures } from '../fixtures/colleges'
import { campusLifeFixtures } from '../fixtures/content/research-campus'

const expectedMainDestinations = [
  '/',
  '/about',
  '/colleges',
  '/campus-life',
  '/research/articles',
  '/news',
  '/admission',
  '/contact',
] as const

describe('CMS fixtures', () => {
  it('exports the exact page and navigation inventory', () => {
    expect(cmsFixtureCounts).toEqual({ 'navigation-menus': 1, pages: 1 })
    expect(pageFixtures).toHaveLength(1)
    expect(navigationMenuFixtures).toHaveLength(1)
    expect(navigationMenuFixtures.map(({ key }) => key)).toEqual(NAVIGATION_MENU_KEYS)
  })

  it('reuses the five-block bilingual home layout without legacy or metric data', () => {
    const [home] = pageFixtures

    expect(home.slug).toBe(HOME_PAGE_SLUG)
    expect(home.arabic.layout).toBe(DEFAULT_HOME_LAYOUT_AR)
    expect(home.english.layout).toBe(DEFAULT_HOME_LAYOUT_EN)
    expect(home.arabic._status).toBe('published')
    expect(home.english._status).toBe('published')

    for (const locale of [home.arabic, home.english]) {
      expect(locale.layout.map(({ blockType }) => blockType)).toEqual([
        'hero',
        'collegesGrid',
        'newsGrid',
        'admissionCTA',
        'contactInfo',
      ])
      expect(locale.layout).toHaveLength(5)
      expect(locale.layout.some(({ blockType }) => blockType === ('stats' as string))).toBe(false)
      expect(locale).not.toHaveProperty('content')
      expect(locale).not.toHaveProperty('heroImage')
      expect(locale).not.toHaveProperty('meta')
      expect(locale).not.toHaveProperty('seo')
      expect(JSON.stringify(locale.layout)).not.toMatch(/"stats"|"metrics"|"items"/i)
    }
  })

  it('keeps locale topology, identity, ordering, and sibling URLs aligned', () => {
    expect(new Set(navigationMenuFixtures.map(({ key }) => key)).size).toBe(
      navigationMenuFixtures.length,
    )

    for (const fixture of navigationMenuFixtures) {
      expect(fixture.arabic.key).toBe(fixture.key)
      expect(fixture.english.key).toBe(fixture.key)
      expect(fixture.arabic.isPublished).toBe(true)
      expect(fixture.english.isPublished).toBe(true)

      const topology = (locale: typeof fixture.arabic | typeof fixture.english) => ({
        isPublished: locale.isPublished,
        items: locale.items?.map(({ label: _label, children, ...item }) => ({
          ...item,
          children: children?.map(
            ({ label: _childLabel, description: _description, ...child }) => child,
          ),
        })),
        key: locale.key,
      })

      expect(topology(fixture.arabic)).toEqual(topology(fixture.english))
      const sharedTopology = topology(fixture.arabic)
      for (const item of sharedTopology.items ?? []) {
        expect(item.group).toBeNull()
        expect(item.openInNewTab).toBe(false)
        expect(item.showInMore).toBe(false)
        for (const child of item.children ?? []) {
          expect(child.openInNewTab).toBe(false)
        }
      }
      for (const locale of [fixture.arabic, fixture.english]) {
        const items = locale.items ?? []
        expect(items.map(({ order }) => order)).toEqual(items.map((_, index) => index + 1))
        expect(new Set(items.map(({ url }) => url)).size).toBe(items.length)
        for (const item of items) {
          const children = item.children ?? []
          expect(children.map(({ order }) => order)).toEqual(children.map((_, index) => index + 1))
          expect(new Set(children.map(({ url }) => url)).size).toBe(children.length)
        }
      }
    }
  })

  it('uses only canonical college and campus slugs for all seven main-menu children', () => {
    const main = navigationMenuFixtures.find(({ key }) => key === 'main')
    const items = main?.arabic.items ?? []
    const collegeChildren = items.find(({ url }) => url === '/colleges')?.children ?? []
    const campusChildren = items.find(({ url }) => url === '/campus-life')?.children ?? []

    expect(collegeChildren.map(({ url }) => url)).toEqual(
      collegeFixtures.map(({ slug }) => `/colleges/${slug}`),
    )
    expect(campusChildren.map(({ url }) => url)).toEqual(
      campusLifeFixtures.slice(0, 3).map(({ slug }) => `/campus-life/${slug}`),
    )
    expect([...collegeChildren, ...campusChildren]).toHaveLength(7)
  })

  it('provides genuinely bilingual labels and child descriptions', () => {
    for (const fixture of navigationMenuFixtures) {
      const arabicItems = fixture.arabic.items ?? []
      const englishItems = fixture.english.items ?? []
      for (const [index, arabicItem] of arabicItems.entries()) {
        const englishItem = englishItems[index]
        expect(arabicItem.label).not.toBe('')
        expect(englishItem?.label).not.toBe('')
        expect(arabicItem.label).not.toBe(englishItem?.label)

        for (const [childIndex, arabicChild] of (arabicItem.children ?? []).entries()) {
          const englishChild = englishItem?.children?.[childIndex]
          expect(arabicChild.description).not.toBe('')
          expect(englishChild?.description).not.toBe('')
          expect(arabicChild.description).not.toBe(englishChild?.description)
        }
      }
    }
  })

  it('contains exactly the approved safe destinations and no dead research root', () => {
    const main = navigationMenuFixtures.find(({ key }) => key === 'main')

    expect(main?.arabic.items?.map(({ url }) => url)).toEqual(expectedMainDestinations)

    const urls = navigationMenuFixtures.flatMap(({ arabic }) =>
      (arabic.items ?? []).flatMap((item) => [
        item.url,
        ...(item.children ?? []).map(({ url }) => url),
      ]),
    )
    expect(urls.every((url) => url.startsWith('/'))).toBe(true)
    expect(urls).not.toContain('/research')
    expect(urls.join('\n')).not.toMatch(/https?:|example|demo/i)
  })
})
