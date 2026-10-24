import { vi } from 'vitest'

import { teamMemberFixtures } from '../fixtures/content'
import type { SeedOperations } from '../lib/local-api'
import type { SeedRunState, SeedStageContext } from '../lib/types'

export const pristine = {
  'site-settings': { id: 1, socialLinks: [] },
  'about-page': {
    id: 2,
    header: {},
    intro: {},
    vision: {},
    mission: {},
    goals: {},
    values: {},
    president: {},
    teamSection: {},
    teamMembers: [],
  },
  'contact-settings': { id: 3, page: {}, formLabels: {}, contactInfo: {} },
  'smart-chat-settings': { id: 4, isEnabled: false },
  'navbar-settings': {
    id: 5,
    topBarItems: [],
    callToAction: { type: 'reference', appearance: 'default' },
    hideLogin: false,
    showLanguagePicker: true,
  },
  'footer-settings': {
    id: 6,
    footerItems: [],
    footerBackgroundType: 'none',
    footerBackgroundOverlayOpacity: 0.65,
    hideFooterSignup: false,
  },
  'analytics-settings': {
    id: 7,
    googleAnalyticsAnonymizeIp: true,
    enableViewTracking: true,
    enableGoogleIndexing: false,
  },
} as const

export function state(values: Partial<SeedRunState> = {}): SeedRunState {
  return { created: new Map(), initializeGlobals: false, ...values }
}

export function context(
  operations: Partial<SeedOperations>,
  seedState: SeedRunState,
): SeedStageContext {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: seedState,
  } as unknown as SeedStageContext
}

export function dependencyFind() {
  return vi.fn(async ({ collection, where }) => {
    if (collection === 'team-members') {
      const slug = where.slug.equals
      const index = teamMemberFixtures.findIndex((fixture) => fixture.slug === slug)
      return index < 0
        ? { docs: [], totalDocs: 0 }
        : { docs: [{ id: 100 + index, slug }], totalDocs: 1 }
    }
    const key = where.key.equals
    return { docs: [{ id: key === 'main' ? 201 : 202, key }], totalDocs: 1 }
  })
}

export function updateGlobalWithIds() {
  return vi.fn(async ({ data, slug }) => ({
    ...data,
    id: pristine[slug as keyof typeof pristine].id,
    ...(Array.isArray(data.footerItems)
      ? {
          footerItems: data.footerItems.map((row: Record<string, unknown>, index: number) => ({
            ...row,
            id: row.id ?? `footer-${index}`,
          })),
        }
      : {}),
  }))
}
