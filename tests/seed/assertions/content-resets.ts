import { expect } from 'vitest'
import type { Payload } from 'payload'

import {
  blogPostFixtures,
  campusLifeFixtures,
  newsFixtures,
  offerFixtures,
  projectFixtures,
} from '@/seed/fixtures/content'
import { runSeed } from '@/seed/run-seed'
import { assertEditorSentinel } from './academic-content'
import {
  fixtureDocument,
  readArabicInventory,
  readCollectionSnapshot,
  stageElapsedDiagnostics,
  timestampSnapshot,
} from './seed-state'

export async function resetSlugKeyedBlog(payload: Payload): Promise<void> {
  const fixture = blogPostFixtures[0]
  const [beforeInventory, beforeEnglishBlog] = await Promise.all([
    readArabicInventory(payload),
    readCollectionSnapshot(payload, 'blog-posts', 'en'),
  ])
  const beforeArabic = fixtureDocument(beforeInventory['blog-posts'], fixture.slug)
  const beforeEnglish = fixtureDocument(beforeEnglishBlog, fixture.slug)
  const beforeTagIds = beforeArabic.tags?.map(({ id }) => id)
  const unrelatedBefore = timestampSnapshot(beforeInventory, { except: 'blog-posts' })

  await payload.update({
    collection: 'blog-posts',
    context: { disableRevalidate: true },
    data: {
      title: 'EDITOR BLOG SENTINEL',
      tags: beforeArabic.tags?.map(({ id, tag }) => ({ id, tag: `${tag}-edited` })),
    },
    fallbackLocale: false,
    id: beforeArabic.id,
    locale: 'ar',
    overrideAccess: true,
  })
  const reset = await runSeed(payload, {
    onStageResult: stageElapsedDiagnostics('blog-reset'),
    resetTarget: 'blog-posts',
  })
  expect(reset.updated).toBe(blogPostFixtures.length)

  const [afterInventory, afterEnglishBlog] = await Promise.all([
    readArabicInventory(payload),
    readCollectionSnapshot(payload, 'blog-posts', 'en'),
  ])
  const afterArabic = fixtureDocument(afterInventory['blog-posts'], fixture.slug)
  const afterEnglish = fixtureDocument(afterEnglishBlog, fixture.slug)
  assertEditorSentinel(afterInventory['team-members'])
  expect(timestampSnapshot(afterInventory, { except: 'blog-posts' })).toEqual(unrelatedBefore)
  expect(afterArabic.tags?.map(({ id }) => id)).toEqual(beforeTagIds)
  expect(afterEnglish.tags?.map(({ id }) => id)).toEqual(beforeTagIds)
  expect(afterArabic.tags?.map(({ tag }) => tag)).toEqual(fixture.tags.map(({ ar }) => ar))
  expect(afterEnglish.tags?.map(({ tag }) => tag)).toEqual(fixture.tags.map(({ en }) => en))
  expect(afterArabic.title).toBe(fixture.ar.title)
  expect(afterEnglish.title).toBe(fixture.en.title)
  expect(beforeEnglish.tags?.map(({ id }) => id)).toEqual(beforeTagIds)
}

export async function resetOptionalContent(payload: Payload): Promise<void> {
  const [users, colleges] = await Promise.all([
    readCollectionSnapshot(payload, 'users', 'ar'),
    readCollectionSnapshot(payload, 'colleges', 'ar'),
  ])
  const admin = users.docs[0]
  const college = colleges.docs[0]
  if (!admin || !college) throw new Error('Missing reset corruption dependency.')

  const blogFixture = blogPostFixtures[0]
  const newsFixture = newsFixtures[0]
  const campusFixture = campusLifeFixtures[0]
  const projectFixture = projectFixtures[0]
  const offerFixture = offerFixtures[0]
  const [blogs, allNews, campusLife, projects, offers] = await Promise.all([
    readCollectionSnapshot(payload, 'blog-posts', 'ar'),
    readCollectionSnapshot(payload, 'news', 'ar'),
    readCollectionSnapshot(payload, 'campus-life', 'ar'),
    readCollectionSnapshot(payload, 'projects', 'ar'),
    readCollectionSnapshot(payload, 'offers', 'ar'),
  ])
  const blog = fixtureDocument(blogs, blogFixture.slug)
  const news = fixtureDocument(allNews, newsFixture.slug)
  const campus = fixtureDocument(campusLife, campusFixture.slug)
  const project = fixtureDocument(projects, projectFixture.slug)
  const offer = fixtureDocument(offers, offerFixture.slug)

  await payload.update({
    collection: 'blog-posts',
    context: { disableRevalidate: true },
    data: {
      author: admin.id,
      displayOrder: 999,
      populatedAuthors: [{ userId: String(admin.id), name: 'Stale author' }],
    },
    fallbackLocale: false,
    id: blog.id,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'news',
    context: { disableRevalidate: true },
    data: {
      author: admin.id,
      populatedAuthors: [{ userId: String(admin.id), name: 'Stale author' }],
    },
    fallbackLocale: false,
    id: news.id,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'campus-life',
    context: { disableRevalidate: true },
    data: {
      publishedAt: '2035-01-01T00:00:00.000Z',
      sidebarNote: 'بيانات محرر قديمة',
      stats: [{ label: 'قيمة مختلقة', value: 999 }],
    },
    fallbackLocale: false,
    id: campus.id,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'projects',
    context: { disableRevalidate: true },
    data: { publishedAt: '2035-01-01T00:00:00.000Z' },
    fallbackLocale: false,
    id: project.id,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'offers',
    context: { disableRevalidate: true },
    data: {
      college: college.id,
      publishedAt: '2035-01-01T00:00:00.000Z',
      validUntil: '2035-12-31T00:00:00.000Z',
    },
    fallbackLocale: false,
    id: offer.id,
    locale: 'ar',
    overrideAccess: true,
  })
  for (const resetTarget of ['blog-posts', 'news', 'campus-life', 'projects', 'offers'] as const) {
    await runSeed(payload, { resetTarget })
  }

  for (const locale of ['ar', 'en'] as const) {
    const [resetBlogs, resetNewsCollection, resetCampusLife, resetProjects, resetOffers] =
      await Promise.all([
        readCollectionSnapshot(payload, 'blog-posts', locale),
        readCollectionSnapshot(payload, 'news', locale),
        readCollectionSnapshot(payload, 'campus-life', locale),
        readCollectionSnapshot(payload, 'projects', locale),
        readCollectionSnapshot(payload, 'offers', locale),
      ])
    const resetBlog = fixtureDocument(resetBlogs, blogFixture.slug)
    expect(resetBlog.author ?? null).toBeNull()
    expect(resetBlog.authorAvatar ?? null).toBeNull()
    expect(resetBlog.displayOrder ?? null).toBeNull()
    expect(resetBlog.image ?? null).toBeNull()
    expect(resetBlog.populatedAuthors).toEqual([])
    const resetNews = fixtureDocument(resetNewsCollection, newsFixture.slug)
    expect(resetNews.author ?? null).toBeNull()
    expect(resetNews.featuredImage ?? null).toBeNull()
    expect(resetNews.image ?? null).toBeNull()
    expect(resetNews.populatedAuthors).toEqual([])
    const resetCampus = fixtureDocument(resetCampusLife, campusFixture.slug)
    expect(resetCampus.image ?? null).toBeNull()
    expect(resetCampus.publishedAt ?? null).toBeNull()
    expect(resetCampus.sidebarNote ?? null).toBeNull()
    expect(resetCampus.stats ?? []).toEqual([])
    const resetProject = fixtureDocument(resetProjects, projectFixture.slug)
    expect(resetProject.image ?? null).toBeNull()
    expect(resetProject.images ?? []).toEqual([])
    expect(resetProject.publishedAt ?? null).toBeNull()
    const resetOffer = fixtureDocument(resetOffers, offerFixture.slug)
    expect(resetOffer.college ?? null).toBeNull()
    expect(resetOffer.image ?? null).toBeNull()
    expect(resetOffer.publishedAt ?? null).toBeNull()
    expect(resetOffer.validUntil ?? null).toBeNull()
  }
}
