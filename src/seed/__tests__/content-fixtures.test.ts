import { describe, expect, it } from 'vitest'

import {
  admissionRequirementFixtures,
  announcementFixtures,
  blogPostFixtures,
  campusLifeFixtures,
  centerFixtures,
  contentFixtureCounts,
  eventFixtures,
  faqFixtures,
  newsFixtures,
  offerFixtures,
  projectFixtures,
  researchPublicationFixtures,
  studentAffairsDocumentFixtures,
} from '../fixtures/content'
import { contentResetOnlyValues } from '../stages/content'

describe('content fixtures', () => {
  it('preserves the complete canonical content inventory and excludes stale fields', () => {
    expect(contentFixtureCounts).toEqual({
      'admission-requirements': 6,
      announcements: 8,
      'blog-posts': 5,
      'campus-life': 11,
      centers: 10,
      events: 9,
      faqs: 13,
      news: 9,
      offers: 9,
      partners: 16,
      projects: 10,
      'research-publications': 10,
      sliders: 5,
      'student-affairs-documents': 8,
      'team-members': 7,
    })
    expect(offerFixtures.every((fixture) => !('validUntil' in fixture.shared))).toBe(true)
    expect(
      eventFixtures.every(
        (fixture) => !('descriptionAr' in fixture) && !('descriptionEn' in fixture),
      ),
    ).toBe(true)
    expect(
      [
        admissionRequirementFixtures,
        announcementFixtures,
        blogPostFixtures,
        campusLifeFixtures,
        centerFixtures,
        eventFixtures,
        newsFixtures,
        offerFixtures,
        projectFixtures,
        researchPublicationFixtures,
        studentAffairsDocumentFixtures,
      ].every((fixtures) => fixtures.every((fixture) => fixture.shared._status === 'published')),
    ).toBe(true)
    expect(studentAffairsDocumentFixtures.every((fixture) => fixture.shared.fileComingSoon)).toBe(
      true,
    )
    expect(studentAffairsDocumentFixtures.every((fixture) => !('file' in fixture.shared))).toBe(
      true,
    )
    expect(
      newsFixtures.every(
        (fixture) => 'publishedAt' in fixture.shared && !('publishDate' in fixture.shared),
      ),
    ).toBe(true)
    expect(
      announcementFixtures.every(
        (fixture) => 'publishDate' in fixture.shared && !('publishedAt' in fixture.shared),
      ),
    ).toBe(true)
    expect(
      researchPublicationFixtures.every(
        (fixture) => 'publishDate' in fixture.shared && !('publishedAt' in fixture.shared),
      ),
    ).toBe(true)
  })

  it('preserves exact event, blog, FAQ, college, and status parity corrections', () => {
    expect(eventFixtures.every((fixture) => !('displayOrder' in fixture.shared))).toBe(true)
    expect(blogPostFixtures.every((fixture) => !('displayOrder' in fixture.shared))).toBe(true)

    const faqOrders = new Map<string, number[]>()
    for (const fixture of faqFixtures) {
      const orders = faqOrders.get(fixture.categorySlug) ?? []
      orders.push(fixture.shared.displayOrder)
      faqOrders.set(fixture.categorySlug, orders)
    }
    expect(faqOrders.get('faq-admission')).toEqual([1, 2, 3, 1])
    expect(faqOrders.get('faq-fees')).toEqual([1, 2, 3])
    expect(faqOrders.get('faq-academic')).toEqual([1, 2, 3])
    expect(faqOrders.get('faq-campus')).toEqual([1, 2, 3])

    expect(eventFixtures.find(({ slug }) => slug === 'academic-open-day')).toMatchObject({
      collegeSlug: 'medicine',
    })
    expect(
      newsFixtures.flatMap((fixture) =>
        'collegeSlug' in fixture ? [[fixture.slug, fixture.collegeSlug] as const] : [],
      ),
    ).toEqual([
      ['new-college-building-opening', 'medicine'],
      ['student-innovation-competition', 'engineering-it'],
      ['phase-15-college-news', 'medicine'],
    ])

    for (const fixture of projectFixtures) {
      if (
        'endDate' in fixture.shared &&
        typeof fixture.shared.endDate === 'string' &&
        fixture.shared.endDate.startsWith('2025-')
      ) {
        expect(fixture.shared.projectStatus, fixture.slug).toBe('completed')
      }
    }
  })

  it('declares schema-specific reset-only clears without adding them to create fixtures', () => {
    expect(contentResetOnlyValues).toEqual({
      announcements: { image: null },
      'blog-posts': {
        author: null,
        authorAvatar: null,
        displayOrder: null,
        image: null,
        populatedAuthors: [],
      },
      'campus-life': { image: null, publishedAt: null, sidebarNote: null, stats: [] },
      centers: { image: null, publishedAt: null },
      events: { displayOrder: null, image: null },
      news: {
        author: null,
        featuredImage: null,
        image: null,
        populatedAuthors: [],
      },
      offers: { college: null, image: null, publishedAt: null, validUntil: null },
      partners: { logo: null },
      projects: { image: null, images: [], publishedAt: null },
      'research-publications': { image: null },
      'team-members': { image: null },
    })
    expect(contentResetOnlyValues.news).toMatchObject({
      author: null,
      featuredImage: null,
      image: null,
      populatedAuthors: [],
    })
    expect(contentResetOnlyValues['blog-posts']).toMatchObject({
      author: null,
      authorAvatar: null,
      displayOrder: null,
      image: null,
      populatedAuthors: [],
    })
    expect(contentResetOnlyValues['campus-life']).toMatchObject({
      image: null,
      publishedAt: null,
      sidebarNote: null,
      stats: [],
    })
    expect(contentResetOnlyValues.events).toMatchObject({ displayOrder: null, image: null })
    expect(contentResetOnlyValues.offers).toMatchObject({
      college: null,
      image: null,
      publishedAt: null,
      validUntil: null,
    })
    expect(contentResetOnlyValues.projects).toMatchObject({
      image: null,
      images: [],
      publishedAt: null,
    })
    expect(eventFixtures.every((fixture) => !('displayOrder' in fixture.shared))).toBe(true)
    expect(blogPostFixtures.every((fixture) => !('displayOrder' in fixture.shared))).toBe(true)
    expect(campusLifeFixtures.every((fixture) => !('stats' in fixture.ar))).toBe(true)
    expect(offerFixtures.every((fixture) => !('validUntil' in fixture.shared))).toBe(true)
  })

  it('keeps summer training evergreen and production campus fixtures nonquantitative', () => {
    const summerTraining = offerFixtures.find(({ slug }) => slug === 'offer-summer-training')
    expect(summerTraining).toBeDefined()
    expect(summerTraining?.shared).not.toHaveProperty('validUntil')
    for (const locale of ['ar', 'en'] as const) {
      const copy = JSON.stringify(summerTraining?.[locale])
      expect(copy).not.toMatch(/(?:deadline|registration open|آخر موعد|التسجيل مفتوح|1 يونيو)/i)
    }

    for (const fixture of campusLifeFixtures) {
      expect(fixture.ar).not.toHaveProperty('stats')
      expect(fixture.en).not.toHaveProperty('stats')
      expect(JSON.stringify({ ar: fixture.ar, en: fixture.en })).not.toMatch(/[0-9٠-٩]/)
    }
  })

  it('provides genuinely bilingual positional blog tag topology with stable fixture keys', () => {
    for (const fixture of blogPostFixtures) {
      expect(fixture.tags.length).toBeGreaterThan(0)
      expect(new Set(fixture.tags.map(({ key }) => key)).size).toBe(fixture.tags.length)
      expect(fixture.tags.map(({ ar }) => ar)).not.toEqual(fixture.tags.map(({ en }) => en))
    }
  })

  it('keeps localized nested values genuinely bilingual with matching topology', () => {
    for (const fixture of researchPublicationFixtures) {
      expect(fixture.ar.tags).toHaveLength(fixture.en.tags.length)
      expect(fixture.ar.tags).not.toEqual(fixture.en.tags)
    }
    for (const fixture of campusLifeFixtures) {
      expect(fixture.ar.highlights).toHaveLength(fixture.en.highlights.length)
      expect(fixture.ar.highlights).not.toEqual(fixture.en.highlights)
    }
  })
})
