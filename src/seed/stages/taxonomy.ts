import type { RequiredDataFromCollectionSlug } from 'payload'

import { categoryFixtures } from '../fixtures/categories'
import { collegeFixtures } from '../fixtures/colleges'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { richText } from '../lib/rich-text'
import { addWriteResult, createLocalizedIfMissing } from './helpers'
import { published } from '../fixtures/content/shared'

export const taxonomyStage: SeedStage = {
  name: 'categories-and-colleges',
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    for (const fixture of categoryFixtures) {
      const shared = { kind: fixture.kind, slug: fixture.slug }
      const result = await createLocalizedIfMissing({
        arabic: { ...shared, description: fixture.name.ar, name: fixture.name.ar } satisfies RequiredDataFromCollectionSlug<'categories'>,
        collection: 'categories',
        english: { ...shared, description: fixture.name.en, name: fixture.name.en } satisfies RequiredDataFromCollectionSlug<'categories'>,
        operations,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }
    for (const fixture of collegeFixtures) {
      const shared = { icon: fixture.icon, slug: fixture.slug, ...published }
      const result = await createLocalizedIfMissing({
        arabic: {
          ...shared,
          admissionRequirements: richText(fixture.admissionRequirements.ar, 'ar'),
          deanName: fixture.deanName.ar,
          description: richText(fixture.description.ar, 'ar'),
          goals: richText(fixture.goals.ar, 'ar'),
          mission: richText(fixture.mission.ar, 'ar'),
          name: fixture.name.ar,
          quality: richText(fixture.quality.ar, 'ar'),
          strategy: richText(fixture.strategy.ar, 'ar'),
          values: richText(fixture.values.ar, 'ar'),
          vision: richText(fixture.vision.ar, 'ar'),
        } satisfies RequiredDataFromCollectionSlug<'colleges'>,
        collection: 'colleges',
        english: {
          ...shared,
          admissionRequirements: richText(fixture.admissionRequirements.en, 'en'),
          deanName: fixture.deanName.en,
          description: richText(fixture.description.en, 'en'),
          goals: richText(fixture.goals.en, 'en'),
          mission: richText(fixture.mission.en, 'en'),
          name: fixture.name.en,
          quality: richText(fixture.quality.en, 'en'),
          strategy: richText(fixture.strategy.en, 'en'),
          values: richText(fixture.values.en, 'en'),
          vision: richText(fixture.vision.en, 'en'),
        } satisfies RequiredDataFromCollectionSlug<'colleges'>,
        operations,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }
    return counts
  },
}
