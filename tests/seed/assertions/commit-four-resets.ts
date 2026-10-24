import { expect } from 'vitest'
import type { Payload } from 'payload'

import { pageFixtures } from '@/seed/fixtures/cms'
import { footerSettingsFixture } from '@/seed/fixtures/globals'
import { richText } from '@/seed/lib/rich-text'
import { expectFixtureLeaves } from './fixture-match'

export async function corruptHomeForReset(payload: Payload) {
  const [pages, colleges, users] = await Promise.all([
    readPages(payload, 'ar'),
    payload.find({
      collection: 'colleges',
      depth: 0,
      fallbackLocale: false,
      limit: 1,
      locale: 'ar',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'users',
      depth: 0,
      fallbackLocale: false,
      limit: 1,
      locale: 'ar',
      overrideAccess: true,
    }),
  ])
  const home = pages.docs.find(({ slug }) => slug === 'home')
  const college = colleges.docs[0]
  const user = users.docs[0]
  if (!home || !college || !user) throw new Error('Missing Page reset corruption dependency.')
  const layoutIds = home.layout.map(({ id }) => id)

  await payload.update({
    collection: 'pages',
    context: { disableRevalidate: true },
    data: {
      author: user.id,
      content: richText('EDITOR PAGE CONTENT', 'ar'),
      displayOrder: 999,
      layout: home.layout.map((block) => {
        if (block.blockType === 'collegesGrid') {
          return {
            ...block,
            maxItems: 8,
            selectedColleges: [college.id],
            variant: 'compact' as const,
          }
        }
        if (block.blockType === 'admissionCTA') {
          return { ...block, buttonHref: '/editor-admission' }
        }
        if (block.blockType === 'hero') {
          return {
            ...block,
            primaryCtaHref: '/editor-primary',
            secondaryCtaHref: '/editor-secondary',
          }
        }
        return block
      }),
      meta: { description: 'EDITOR META DESCRIPTION', title: 'EDITOR META TITLE' },
      populatedAuthors: [{ userId: String(user.id), name: 'EDITOR AUTHOR' }],
    },
    fallbackLocale: false,
    id: home.id,
    locale: 'ar',
    overrideAccess: true,
  })
  return { id: home.id, layoutIds }
}

export async function assertHomeReset(
  payload: Payload,
  expected: Awaited<ReturnType<typeof corruptHomeForReset>>,
): Promise<void> {
  const [arabicPages, englishPages] = await Promise.all([readPages(payload, 'ar'), readPages(payload, 'en')])
  const arabic = arabicPages.docs.find(({ id }) => id === expected.id)
  const english = englishPages.docs.find(({ id }) => id === expected.id)
  if (!arabic || !english) throw new Error('Missing reset Home page.')

  for (const page of [arabic, english]) {
    expect(page._status).toBe('published')
    expect(page.author ?? null).toBeNull()
    expect(page.populatedAuthors).toEqual([])
    expect(page.publishedAt ?? null).toBeNull()
    expect(page.displayOrder ?? null).toBeNull()
    expect(page.content ?? null).toBeNull()
    expect(page.heroImage ?? null).toBeNull()
    expect(page.hero).toMatchObject({ links: [], media: null, richText: null, type: 'lowImpact' })
    expect(page.meta).toMatchObject({ description: null, image: null, title: null })
    expect(page.layout.map(({ id }) => id)).toEqual(expected.layoutIds)
    const colleges = page.layout.find(({ blockType }) => blockType === 'collegesGrid')
    const admission = page.layout.find(({ blockType }) => blockType === 'admissionCTA')
    const hero = page.layout.find(({ blockType }) => blockType === 'hero')
    expect(colleges).toMatchObject({ maxItems: 4, selectedColleges: [], variant: 'featured' })
    expect(admission).toMatchObject({ buttonHref: '/admission' })
    expect(hero).toMatchObject({
      primaryCtaHref: '/admission',
      secondaryCtaHref: '/colleges',
    })
  }
  expectFixtureLeaves(arabic, pageFixtures[0].arabic, 'reset.home.ar')
  expectFixtureLeaves(english, pageFixtures[0].english, 'reset.home.en')
  expect(arabic.layout.map(({ id }) => id)).toEqual(english.layout.map(({ id }) => id))
  expect(arabic.layout.map(({ blockType }) => blockType)).toEqual(
    pageFixtures[0].arabic.layout.map(({ blockType }) => blockType),
  )
}

export async function corruptFooterForReset(payload: Payload) {
  const [arabic, english, pages] = await Promise.all([
    readFooter(payload, 'ar'),
    readFooter(payload, 'en'),
    readPages(payload, 'ar'),
  ])
  const home = pages.docs.find(({ slug }) => slug === 'home')
  if (!home) throw new Error('Missing Home page for Footer link corruption.')
  const ids = (arabic.footerItems ?? []).map(({ id }) => id)
  expect(ids).toEqual(english.footerItems?.map(({ id }) => id))

  await payload.updateGlobal({
    slug: 'footer-settings',
    context: { disableRevalidate: true },
    data: {
      address: 'EDITOR FOOTER ADDRESS',
      footerBackgroundOverlayOpacity: 0,
      footerBackgroundType: 'image',
      footerItems: (arabic.footerItems ?? []).map(({ id }, index) => ({
        id,
        group: 'editor-group',
        label: `EDITOR AR ${index}`,
        link:
          index === 0
            ? {
                newTab: true,
                reference: { relationTo: 'pages' as const, value: home.id },
                type: 'reference' as const,
              }
            : { newTab: true, type: 'custom' as const, url: `/editor-${index}` },
      })),
      footerPowered: 'EDITOR POWERED',
      hideFooterSignup: true,
    },
    fallbackLocale: false,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'footer-settings',
    context: { disableRevalidate: true },
    data: {
      address: 'EDITOR EN ADDRESS',
      footerItems: ids.map((id, index) => ({ id, label: `EDITOR EN ${index}` })),
      footerPowered: 'EDITOR EN POWERED',
    },
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: true,
  })
  return { ids }
}

export async function assertFooterReset(
  payload: Payload,
  expected: Awaited<ReturnType<typeof corruptFooterForReset>>,
): Promise<void> {
  const [arabic, english] = await Promise.all([
    readFooter(payload, 'ar'),
    readFooter(payload, 'en'),
  ])
  for (const [locale, footer] of [
    ['ar', arabic],
    ['en', english],
  ] as const) {
    expect(footer.address ?? null).toBeNull()
    expect(footer.footerPowered ?? null).toBeNull()
    expect(footer.footerBackgroundType).toBe('none')
    expect(footer.footerBackgroundImage ?? null).toBeNull()
    expect(footer.footerBackgroundVideo ?? null).toBeNull()
    expect(footer.footerBackgroundOverlayOpacity).toBe(0.65)
    expect(footer.hideFooterSignup).toBe(false)
    expect(footer.footerItems?.map(({ id }) => id)).toEqual(expected.ids)
    expect(footer.footerItems?.map(({ label }) => label)).toEqual(
      footerSettingsFixture[locale].footerItems.map(({ label }) => label),
    )
    for (const [index, row] of (footer.footerItems ?? []).entries()) {
      const expectedLink = footerSettingsFixture.ar.footerItems[index]?.link
      expect(row.group ?? null).toBeNull()
      expect(row.link?.reference ?? null).toBeNull()
      expect(row.link).toMatchObject({
        newTab: expectedLink?.newTab,
        type: expectedLink?.type,
        url: expectedLink?.url,
      })
    }
    expectFixtureLeaves(footer, footerSettingsFixture[locale], `reset.footer.${locale}`)
    expectFixtureLeaves(footer, footerSettingsFixture.shared, `reset.footer.shared.${locale}`)
  }
  expect(sharedFooterRows(arabic.footerItems ?? [])).toEqual(
    sharedFooterRows(english.footerItems ?? []),
  )
}

export async function removeHomeBlockForTopologyFailure(payload: Payload): Promise<void> {
  const pages = await readPages(payload, 'ar')
  const home = pages.docs.find(({ slug }) => slug === 'home')
  if (!home) throw new Error('Missing Home page for topology corruption.')
  await payload.update({
    collection: 'pages',
    context: { disableRevalidate: true },
    data: { layout: home.layout.slice(0, -1) },
    fallbackLocale: false,
    id: home.id,
    locale: 'ar',
    overrideAccess: true,
  })
}

function readPages(payload: Payload, locale: 'ar' | 'en') {
  return payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 0,
    locale,
    overrideAccess: true,
    pagination: false,
  })
}

function readFooter(payload: Payload, locale: 'ar' | 'en') {
  return payload.findGlobal({
    slug: 'footer-settings',
    depth: 0,
    fallbackLocale: false,
    locale,
    overrideAccess: true,
  })
}

function sharedFooterRows(
  rows: Array<{ group?: null | string; id?: null | string; link?: unknown }>,
) {
  return rows.map(({ group, id, link }, order) => ({ group: group ?? null, id, link, order }))
}
