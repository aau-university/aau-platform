import type { RequiredDataFromCollectionSlug } from 'payload'

import { departmentFixtures } from '../fixtures/departments'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { richText } from '../lib/rich-text'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from './helpers'
import { published } from '../fixtures/content/shared'

export const departmentsStage: SeedStage = {
  name: 'departments',
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    for (const fixture of departmentFixtures) {
      const college = await requireBySlug(operations, 'colleges', fixture.collegeSlug)
      const shared = {
        college: college.id,
        ...published,
        slug: fixture.slug,
      }
      const result = await createLocalizedIfMissing({
        arabic: {
          ...shared,
          description: richText(fixture.description.ar, 'ar'),
          name: fixture.name.ar,
        } satisfies RequiredDataFromCollectionSlug<'academic-departments'>,
        collection: 'academic-departments',
        english: {
          ...shared,
          description: richText(fixture.description.en, 'en'),
          name: fixture.name.en,
        } satisfies RequiredDataFromCollectionSlug<'academic-departments'>,
        operations,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }
    return counts
  },
}
