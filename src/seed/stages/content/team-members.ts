import type { RequiredDataFromCollectionSlug } from 'payload'

import { teamMemberFixtures } from '../../fixtures/content'
import { richText } from '../../lib/rich-text'
import { emptySeedCounts, type SeedResetTarget, type SeedStage } from '../../lib/types'
import { createLocalizedIfMissing, addWriteResult } from '../helpers'
import { contentResetOnlyValues } from './reset-values'
import { shouldSeed } from './shared'

const teamMemberResetTargets = ['team-members'] as const satisfies readonly SeedResetTarget[]

export const teamMembersStage: SeedStage = {
  name: 'team-members',
  resetTargets: teamMemberResetTargets,
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    if (!shouldSeed(state.resetTarget, 'team-members')) return counts
    for (const fixture of teamMemberFixtures) {
      addWriteResult(
        counts,
        await createLocalizedIfMissing({
          arabic: {
            ...fixture.shared,
            ...fixture.ar,
            bio: richText(fixture.ar.bio, 'ar'),
            slug: fixture.slug,
          } satisfies RequiredDataFromCollectionSlug<'team-members'>,
          collection: 'team-members',
          english: {
            ...fixture.shared,
            ...fixture.en,
            bio: richText(fixture.en.bio, 'en'),
            slug: fixture.slug,
          } satisfies RequiredDataFromCollectionSlug<'team-members'>,
          operations,
          reset: state.resetTarget === 'team-members',
          resetOnly: {
            ...contentResetOnlyValues['team-members'],
            email: 'email' in fixture.shared ? fixture.shared.email : null,
            phone: 'phone' in fixture.shared ? fixture.shared.phone : null,
          },
          slug: fixture.slug,
          state,
        }),
      )
    }
    return counts
  },
}
