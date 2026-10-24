import type { CollectionSlug, RequiredDataFromCollectionSlug } from 'payload'

import {
  admissionRequirementFixtures,
  sliderFixtures,
  studentAffairsDocumentFixtures,
} from '../../fixtures/content'
import type { SeedOperations, SeedReplaceArgs } from '../../lib/local-api'
import { richText } from '../../lib/rich-text'
import { emptySeedCounts, type SeedCounts, type SeedStage } from '../../lib/types'

export const keylessContentStage: SeedStage = {
  name: 'keyless-content',
  run: async ({ operations }) => {
    const counts = emptySeedCounts()
    addCounts(
      counts,
      await initializeKeylessCollection({
        arabic: sliderFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              ...fixture.ar,
            }) satisfies RequiredDataFromCollectionSlug<'sliders'>,
        ),
        collection: 'sliders',
        english: sliderFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              ...fixture.en,
            }) satisfies RequiredDataFromCollectionSlug<'sliders'>,
        ),
        operations,
      }),
    )
    addCounts(
      counts,
      await initializeKeylessCollection({
        arabic: studentAffairsDocumentFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              ...fixture.ar,
            }) satisfies RequiredDataFromCollectionSlug<'student-affairs-documents'>,
        ),
        collection: 'student-affairs-documents',
        english: studentAffairsDocumentFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              ...fixture.en,
            }) satisfies RequiredDataFromCollectionSlug<'student-affairs-documents'>,
        ),
        operations,
      }),
    )
    addCounts(
      counts,
      await initializeKeylessCollection({
        arabic: admissionRequirementFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              content: richText(fixture.ar.content, 'ar'),
              title: fixture.ar.title,
            }) satisfies RequiredDataFromCollectionSlug<'admission-requirements'>,
        ),
        collection: 'admission-requirements',
        english: admissionRequirementFixtures.map(
          (fixture) =>
            ({
              ...fixture.shared,
              content: richText(fixture.en.content, 'en'),
              title: fixture.en.title,
            }) satisfies RequiredDataFromCollectionSlug<'admission-requirements'>,
        ),
        operations,
      }),
    )
    return counts
  },
}

async function initializeKeylessCollection<TSlug extends CollectionSlug>({
  arabic,
  collection,
  english,
  operations,
}: {
  arabic: RequiredDataFromCollectionSlug<TSlug>[]
  collection: TSlug
  english: RequiredDataFromCollectionSlug<TSlug>[]
  operations: SeedOperations
}): Promise<SeedCounts> {
  const counts = emptySeedCounts()
  const existing = await operations.find({
    collection,
    depth: 0,
    limit: 1,
    locale: 'ar',
  })
  if (existing.totalDocs > 0) return { ...counts, conflict: 1 }

  for (const [index, data] of arabic.entries()) {
    const created = await operations.create({ collection, data, locale: 'ar' })
    await operations.update({
      collection,
      data: english[index],
      id: created.id,
      locale: 'en',
    } as SeedReplaceArgs<TSlug>)
    counts.created += 1
    counts.updated += 1
  }
  return counts
}

function addCounts(target: SeedCounts, source: SeedCounts): void {
  target.conflict += source.conflict
  target.created += source.created
  target.skipped += source.skipped
  target.updated += source.updated
}
