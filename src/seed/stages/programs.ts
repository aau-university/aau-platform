import type { RequiredDataFromCollectionSlug } from 'payload'

import { programFixtures } from '../fixtures/programs'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { richText } from '../lib/rich-text'
import { addWriteResult, createLocalizedIfMissing, requireBySlug } from './helpers'
import { published } from '../fixtures/content/shared'

export const programsStage: SeedStage = {
  name: 'programs',
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    for (const fixture of programFixtures) {
      const college = await requireBySlug(operations, 'colleges', fixture.collegeSlug)
      const department = await requireBySlug(
        operations,
        'academic-departments',
        fixture.departmentSlug,
      )
      const shared = {
        admissionRate: fixture.admissionRate,
        college: college.id,
        degreeType: fixture.degreeType,
        department: department.id,
        ...published,
        slug: fixture.slug,
        studyYears: fixture.studyYears,
      }
      const result = await createLocalizedIfMissing({
        arabic: {
          ...shared,
          applicationSteps: richText(fixture.applicationSteps.ar.join('\n\n'), 'ar'),
          careerProspects: richText(fixture.careerProspects.ar.join('\n\n'), 'ar'),
          description: richText(fixture.description.ar, 'ar'),
          duration: fixture.duration.ar,
          highSchoolType: fixture.highSchoolType.ar,
          name: fixture.name.ar,
          objectives: richText(fixture.objectives.ar.join('\n\n'), 'ar'),
          whyProgram: richText(fixture.whyProgram.ar, 'ar'),
        } satisfies RequiredDataFromCollectionSlug<'academic-programs'>,
        collection: 'academic-programs',
        english: {
          ...shared,
          applicationSteps: richText(fixture.applicationSteps.en.join('\n\n'), 'en'),
          careerProspects: richText(fixture.careerProspects.en.join('\n\n'), 'en'),
          description: richText(fixture.description.en, 'en'),
          duration: fixture.duration.en,
          highSchoolType: fixture.highSchoolType.en,
          name: fixture.name.en,
          objectives: richText(fixture.objectives.en.join('\n\n'), 'en'),
          whyProgram: richText(fixture.whyProgram.en, 'en'),
        } satisfies RequiredDataFromCollectionSlug<'academic-programs'>,
        operations,
        slug: fixture.slug,
        state,
      })
      addWriteResult(counts, result)
    }
    return counts
  },
}
