import type { RequiredDataFromCollectionSlug } from 'payload'

import {
  announcementFixtures,
  blogPostFixtures,
  eventFixtures,
  faqFixtures,
  newsFixtures,
} from '../../fixtures/content'
import type { RowIdGraftSchema } from '../../lib/localized-row-ids'
import { richText } from '../../lib/rich-text'
import { emptySeedCounts, type SeedResetTarget, type SeedStage } from '../../lib/types'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from '../helpers'
import { contentResetOnlyValues } from './reset-values'
import { shouldSeed } from './shared'

const tagsSchema = { tags: {} } as const satisfies RowIdGraftSchema

const editorialResetTargets = [
  'news',
  'events',
  'blog-posts',
  'faqs',
  'announcements',
] as const satisfies readonly SeedResetTarget[]

export const editorialContentStage: SeedStage = {
  name: 'editorial-content',
  resetTargets: editorialResetTargets,
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()

    for (const fixture of shouldSeed(state.resetTarget, 'news') ? newsFixtures : []) {
      const category =
        'categorySlug' in fixture
          ? await requireBySlug(operations, 'categories', fixture.categorySlug)
          : undefined
      const college =
        'collegeSlug' in fixture
          ? await requireBySlug(operations, 'colleges', fixture.collegeSlug)
          : undefined
      const shared = {
        ...fixture.shared,
        ...(category ? { category: category.id } : {}),
        ...(college ? { college: college.id } : {}),
        populatedAuthors: [] as [],
        slug: fixture.slug,
      }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            content: richText(fixture.ar.content, 'ar'),
            summary: fixture.ar.summary,
            ...(fixture.ar.tags.length ? { tags: fixture.ar.tags.map((tag) => ({ tag })) } : {}),
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'news'>,
          collection: 'news',
          english: {
            ...shared,
            content: richText(fixture.en.content, 'en'),
            summary: fixture.en.summary,
            ...(fixture.en.tags.length ? { tags: fixture.en.tags.map((tag) => ({ tag })) } : {}),
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'news'>,
          operations,
          reset: state.resetTarget === 'news',
          resetOnly: {
            ...contentResetOnlyValues.news,
            category: category?.id ?? null,
            college: college?.id ?? null,
            displayOrder:
              'displayOrder' in fixture.shared ? fixture.shared.displayOrder : null,
            ...(fixture.ar.tags.length ? {} : { tags: [] }),
          },
          rowIdSchema: tagsSchema,
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'events') ? eventFixtures : []) {
      const category = await requireBySlug(operations, 'categories', fixture.categorySlug)
      const college = fixture.collegeSlug
        ? await requireBySlug(operations, 'colleges', fixture.collegeSlug)
        : undefined
      const shared = {
        ...fixture.shared,
        category: category.id,
        ...(college ? { college: college.id } : {}),
        slug: fixture.slug,
      }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            description: richText(fixture.ar.content, 'ar'),
            location: fixture.ar.location,
            organizer: fixture.ar.organizer,
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'events'>,
          collection: 'events',
          english: {
            ...shared,
            description: richText(fixture.en.content, 'en'),
            location: fixture.en.location,
            organizer: fixture.en.organizer,
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'events'>,
          operations,
          reset: state.resetTarget === 'events',
          resetOnly: {
            ...contentResetOnlyValues.events,
            college: college?.id ?? null,
            endDate: 'endDate' in fixture.shared ? fixture.shared.endDate : null,
          },
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'blog-posts') ? blogPostFixtures : []) {
      const category = fixture.categorySlug
        ? await requireBySlug(operations, 'categories', fixture.categorySlug)
        : undefined
      const shared = {
        ...fixture.shared,
        ...(category ? { category: category.id } : {}),
        populatedAuthors: [] as [],
        slug: fixture.slug,
      }
      const arabicTags = fixture.tags.map(({ ar: tag }) => ({ tag }))
      const englishTags = fixture.tags.map(({ en: tag }) => ({ tag }))
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            content: richText(fixture.ar.content, 'ar'),
            excerpt: fixture.ar.excerpt,
            tags: arabicTags,
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'blog-posts'>,
          collection: 'blog-posts',
          english: {
            ...shared,
            content: richText(fixture.en.content, 'en'),
            excerpt: fixture.en.excerpt,
            tags: englishTags,
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'blog-posts'>,
          operations,
          reset: state.resetTarget === 'blog-posts',
          resetOnly: {
            ...contentResetOnlyValues['blog-posts'],
            category: category?.id ?? null,
          },
          rowIdSchema: tagsSchema,
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'faqs') ? faqFixtures : []) {
      const category = await requireBySlug(operations, 'categories', fixture.categorySlug)
      const shared = { ...fixture.shared, category: category.id, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            answer: richText(fixture.ar.answer, 'ar'),
            question: fixture.ar.question,
          } satisfies RequiredDataFromCollectionSlug<'faqs'>,
          collection: 'faqs',
          english: {
            ...shared,
            answer: richText(fixture.en.answer, 'en'),
            question: fixture.en.question,
          } satisfies RequiredDataFromCollectionSlug<'faqs'>,
          operations,
          reset: state.resetTarget === 'faqs',
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'announcements')
      ? announcementFixtures
      : []) {
      const college = fixture.collegeSlug
        ? await requireBySlug(operations, 'colleges', fixture.collegeSlug)
        : undefined
      const shared = {
        ...fixture.shared,
        ...(college ? { college: college.id } : {}),
        slug: fixture.slug,
      }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            content: richText(fixture.ar.content, 'ar'),
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'announcements'>,
          collection: 'announcements',
          english: {
            ...shared,
            content: richText(fixture.en.content, 'en'),
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'announcements'>,
          operations,
          reset: state.resetTarget === 'announcements',
          resetOnly: {
            ...contentResetOnlyValues.announcements,
            college: college?.id ?? null,
          },
          slug: fixture.slug,
          state,
        }),
      )
    }
    return counts
  },
}
