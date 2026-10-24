import type { RequiredDataFromCollectionSlug } from 'payload'

import {
  campusLifeFixtures,
  centerFixtures,
  projectFixtures,
  researchPublicationFixtures,
} from '../../fixtures/content'
import type { RowIdGraftSchema } from '../../lib/localized-row-ids'
import { richText } from '../../lib/rich-text'
import { emptySeedCounts, type SeedResetTarget, type SeedStage } from '../../lib/types'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from '../helpers'
import { contentResetOnlyValues } from './reset-values'
import { shouldSeed } from './shared'

const tagsSchema = { tags: {} } as const satisfies RowIdGraftSchema
const campusLifeRows = { highlights: {} } as const satisfies RowIdGraftSchema

const servicesResetTargets = [
  'centers',
  'projects',
  'research-publications',
  'campus-life',
] as const satisfies readonly SeedResetTarget[]

export const servicesContentStage: SeedStage = {
  name: 'services-content',
  resetTargets: servicesResetTargets,
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()

    for (const fixture of shouldSeed(state.resetTarget, 'centers') ? centerFixtures : []) {
      const shared = { ...fixture.shared, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            description: richText(fixture.ar.description, 'ar'),
            location: fixture.ar.location,
            ...(fixture.ar.programs ? { programs: richText(fixture.ar.programs, 'ar') } : {}),
            services: richText(fixture.ar.services, 'ar'),
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'centers'>,
          collection: 'centers',
          english: {
            ...shared,
            description: richText(fixture.en.description, 'en'),
            location: fixture.en.location,
            ...(fixture.en.programs ? { programs: richText(fixture.en.programs, 'en') } : {}),
            services: richText(fixture.en.services, 'en'),
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'centers'>,
          operations,
          reset: state.resetTarget === 'centers',
          resetOnly: {
            ...contentResetOnlyValues.centers,
            ...(fixture.ar.programs ? {} : { programs: null }),
          },
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'projects') ? projectFixtures : []) {
      const shared = { ...fixture.shared, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            description: fixture.ar.description,
            details: richText(fixture.ar.details, 'ar'),
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'projects'>,
          collection: 'projects',
          english: {
            ...shared,
            description: fixture.en.description,
            details: richText(fixture.en.details, 'en'),
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'projects'>,
          operations,
          reset: state.resetTarget === 'projects',
          resetOnly: {
            ...contentResetOnlyValues.projects,
            endDate: 'endDate' in fixture.shared ? fixture.shared.endDate : null,
            startDate: 'startDate' in fixture.shared ? fixture.shared.startDate : null,
          },
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'research-publications')
      ? researchPublicationFixtures
      : []) {
      const category = await requireBySlug(operations, 'categories', fixture.categorySlug)
      const shared = { ...fixture.shared, category: category.id, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            author: fixture.ar.author,
            content: richText(fixture.ar.content, 'ar'),
            summary: fixture.ar.summary,
            tags: fixture.ar.tags.map((tag) => ({ tag })),
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'research-publications'>,
          collection: 'research-publications',
          english: {
            ...shared,
            author: fixture.en.author,
            content: richText(fixture.en.content, 'en'),
            summary: fixture.en.summary,
            tags: fixture.en.tags.map((tag) => ({ tag })),
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'research-publications'>,
          operations,
          reset: state.resetTarget === 'research-publications',
          resetOnly: contentResetOnlyValues['research-publications'],
          rowIdSchema: tagsSchema,
          slug: fixture.slug,
          state,
        }),
      )
    }

    for (const fixture of shouldSeed(state.resetTarget, 'campus-life')
      ? campusLifeFixtures
      : []) {
      const shared = { ...fixture.shared, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...shared,
            content: richText(fixture.ar.content, 'ar'),
            highlights: fixture.ar.highlights.map((highlight) => ({ highlight })),
            highlightsTitle: fixture.ar.highlightsTitle,
            sidebarTitle: fixture.ar.sidebarTitle,
            title: fixture.ar.title,
          } satisfies RequiredDataFromCollectionSlug<'campus-life'>,
          collection: 'campus-life',
          english: {
            ...shared,
            content: richText(fixture.en.content, 'en'),
            highlights: fixture.en.highlights.map((highlight) => ({ highlight })),
            highlightsTitle: fixture.en.highlightsTitle,
            sidebarTitle: fixture.en.sidebarTitle,
            title: fixture.en.title,
          } satisfies RequiredDataFromCollectionSlug<'campus-life'>,
          operations,
          reset: state.resetTarget === 'campus-life',
          resetOnly: contentResetOnlyValues['campus-life'],
          rowIdSchema: campusLifeRows,
          slug: fixture.slug,
          state,
        }),
      )
    }
    return counts
  },
}
