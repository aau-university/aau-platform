import type { GlobalSlug } from 'payload'

import {
  aboutPageFixture,
  analyticsSettingsFixture,
  contactSettingsFixture,
  footerSettingsFixture,
  navbarSettingsFixture,
  siteSettingsFixture,
  smartChatSettingsFixture,
} from '../../fixtures/globals'
import { isGlobalPristine, type PristineGlobalSlug } from '../../lib/global-pristine'
import type { RowIdGraftSchema } from '../../lib/localized-row-ids'
import type { SeedAllLocalesDocument, SeedOperations, SeedUpdateGlobalArgs } from '../../lib/local-api'
import { emptySeedCounts, type SeedResetTarget, type SeedStage } from '../../lib/types'
import { globalResetValues } from './reset-values'
import { resolveTeamMemberIds } from './relationships'
import { writeLocalizedGlobal, writeSharedGlobal } from './writer'

export const fixtureGlobalSlugs = [
  'site-settings',
  'about-page',
  'contact-settings',
  'smart-chat-settings',
  'navbar-settings',
  'footer-settings',
  'analytics-settings',
] as const satisfies readonly PristineGlobalSlug[]

const resetTargets = fixtureGlobalSlugs satisfies readonly SeedResetTarget[]
const footerRows = { footerItems: {} } as const satisfies RowIdGraftSchema

export const globalsStage: SeedStage = {
  name: 'globals',
  resetTargets,
  run: async ({ operations, state }) => {
    const counts = emptySeedCounts()
    if (!state.resetTarget && !state.initializeGlobals) {
      counts.skipped = fixtureGlobalSlugs.length
      return counts
    }

    for (const slug of fixtureGlobalSlugs) {
      if (state.resetTarget && state.resetTarget !== slug) continue
      const snapshot = await operations.findGlobalAllLocales({ depth: 0, slug })
      if (!state.resetTarget && !isGlobalPristine(slug, snapshot)) {
        counts.conflict += 1
        continue
      }
      await writeFixtureGlobal(operations, slug, snapshot, state.resetTarget === slug)
      counts.updated += 1
    }
    return counts
  },
}

async function writeFixtureGlobal(
  operations: SeedOperations,
  slug: PristineGlobalSlug,
  snapshot: SeedAllLocalesDocument,
  reset: boolean,
): Promise<void> {
  switch (slug) {
    case 'site-settings':
      return writeLocalizedGlobal({
        arabic: mergeGlobalData<'site-settings'>(reset ? globalResetValues[slug] : {}, siteSettingsFixture.shared, siteSettingsFixture.ar),
        english: mergeGlobalData<'site-settings'>(reset ? { address: null } : {}, siteSettingsFixture.en),
        operations,
        slug,
        snapshot,
      })
    case 'about-page': {
      const teamMembersRelationship = await resolveTeamMemberIds(
        operations,
        aboutPageFixture.resolve.teamMemberSlugs,
      )
      const arabic = reset
        ? {
            ...aboutPageFixture.shared,
            ...aboutPageFixture.ar,
            intro: {
              ...aboutPageFixture.ar.intro,
              ...globalResetValues[slug].intro,
            },
            president: {
              ...aboutPageFixture.ar.president,
              ...globalResetValues[slug].president,
            },
            teamMembers: globalResetValues[slug].teamMembers,
            teamMembersRelationship,
          }
        : mergeGlobalData<'about-page'>(
            aboutPageFixture.shared,
            aboutPageFixture.ar,
            { teamMembersRelationship },
          )
      return writeLocalizedGlobal({
        arabic,
        english: aboutPageFixture.en,
        operations,
        slug,
        snapshot,
      })
    }
    case 'contact-settings':
      return writeLocalizedGlobal({
        arabic: mergeGlobalData<'contact-settings'>(reset ? globalResetValues[slug] : {}, contactSettingsFixture.ar),
        english: mergeGlobalData<'contact-settings'>(
          reset ? { contactInfo: { address: null } } : {},
          contactSettingsFixture.en,
        ),
        operations,
        slug,
        snapshot,
      })
    case 'smart-chat-settings':
      return writeSharedGlobal({
        data: mergeGlobalData<'smart-chat-settings'>(reset ? globalResetValues[slug] : {}, smartChatSettingsFixture.shared),
        operations,
        slug,
      })
    case 'navbar-settings':
      return writeSharedGlobal({
        data: mergeGlobalData<'navbar-settings'>(
          reset ? globalResetValues[slug] : {},
          navbarSettingsFixture.shared,
        ),
        operations,
        slug,
      })
    case 'footer-settings':
      return writeLocalizedGlobal({
        arabic: mergeGlobalData<'footer-settings'>(
          reset ? globalResetValues[slug] : {},
          footerSettingsFixture.shared,
          footerSettingsFixture.ar,
        ),
        english: mergeGlobalData<'footer-settings'>(
          reset ? { address: null, footerPowered: null } : {},
          {
            footerItems: footerSettingsFixture.en.footerItems.map(({ label }) => ({ label })),
          },
        ),
        operations,
        rowSchema: footerRows,
        slug,
        snapshot,
      })
    case 'analytics-settings':
      return writeSharedGlobal({
        data: mergeGlobalData<'analytics-settings'>(reset ? globalResetValues[slug] : {}, analyticsSettingsFixture.shared),
        operations,
        slug,
      })
  }
}

function mergeGlobalData<TSlug extends GlobalSlug>(
  ...values: Array<SeedUpdateGlobalArgs<TSlug>['data']>
): SeedUpdateGlobalArgs<TSlug>['data'] {
  return Object.assign({}, ...values)
}
