import type { RequiredDataFromCollectionSlug } from 'payload'

import { offerFixtures, partnerFixtures } from '../../fixtures/content'
import type { RowIdGraftSchema } from '../../lib/localized-row-ids'
import { richText } from '../../lib/rich-text'
import { emptySeedCounts, type SeedResetTarget, type SeedStage } from '../../lib/types'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from '../helpers'
import { contentResetOnlyValues } from './reset-values'
import { shouldSeed } from './shared'

const offerRows = { interestHighlights: {} } as const satisfies RowIdGraftSchema

const marketingResetTargets = ['offers', 'partners'] as const satisfies readonly SeedResetTarget[]

export const marketingContentStage: SeedStage = {
  name: 'marketing-content',
  resetTargets: marketingResetTargets,
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    for (const fixture of shouldSeed(state.resetTarget, 'offers') ? offerFixtures : []) {
      const category = await requireBySlug(operations, 'categories', fixture.categorySlug)
      const shared = { ...fixture.shared, category: category.id, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: offerData(fixture.ar, shared, 'ar'),
          collection: 'offers',
          english: offerData(fixture.en, shared, 'en'),
          operations,
          reset: state.resetTarget === 'offers',
          resetOnly: {
            ...contentResetOnlyValues.offers,
            applyLink: 'applyLink' in fixture.shared ? fixture.shared.applyLink : null,
            ...(fixture.ar.interestTitle
              ? {}
              : {
                  interestHighlights: [],
                  interestHighlightsTitle: null,
                  interestNotice: null,
                  interestOpenSubtitle: null,
                  interestOpenTitle: null,
                  interestSubtitle: null,
                  interestTitle: null,
                }),
          },
          rowIdSchema: offerRows,
          slug: fixture.slug,
          state,
        }),
      )
    }
    for (const fixture of shouldSeed(state.resetTarget, 'partners') ? partnerFixtures : []) {
      const shared = { ...fixture.shared, slug: fixture.slug }
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: { ...shared, ...fixture.ar } satisfies RequiredDataFromCollectionSlug<'partners'>,
          collection: 'partners',
          english: {
            ...shared,
            ...fixture.en,
          } satisfies RequiredDataFromCollectionSlug<'partners'>,
          operations,
          reset: state.resetTarget === 'partners',
          resetOnly: contentResetOnlyValues.partners,
          slug: fixture.slug,
          state,
        }),
      )
    }
    return counts
  },
}

function offerData(
  fixture: (typeof offerFixtures)[number]['ar'] | (typeof offerFixtures)[number]['en'],
  shared: Omit<RequiredDataFromCollectionSlug<'offers'>, 'title'>,
  locale: 'ar' | 'en',
): RequiredDataFromCollectionSlug<'offers'> {
  return {
    ...shared,
    benefits: richText(fixture.benefits, locale),
    description: fixture.description,
    details: richText(fixture.details, locale),
    duration: fixture.duration,
    ...(fixture.interestTitle
      ? {
          interestHighlights: fixture.interestHighlights.map((highlight) => ({ highlight })),
          interestHighlightsTitle: fixture.interestHighlightsTitle,
          interestNotice: fixture.interestNotice,
          interestOpenSubtitle: fixture.interestOpenSubtitle,
          interestOpenTitle: fixture.interestOpenTitle,
          interestSubtitle: fixture.interestSubtitle,
          interestTitle: fixture.interestTitle,
        }
      : {}),
    location: fixture.location,
    requirements: fixture.requirements,
    targetAudience: fixture.targetAudience,
    title: fixture.title,
  }
}
