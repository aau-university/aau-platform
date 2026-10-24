import { describe, expect, it } from 'vitest'

import { isGlobalPristine, type PristineGlobalSlug } from '../lib/global-pristine'

const baselines = {
  'site-settings': { socialLinks: [] },
  'about-page': {
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
  'contact-settings': { page: {}, formLabels: {}, contactInfo: {} },
  'smart-chat-settings': { isEnabled: false },
  'navbar-settings': {
    topBarItems: [],
    callToAction: { type: 'reference', appearance: 'default' },
    hideLogin: false,
    showLanguagePicker: true,
  },
  'footer-settings': {
    footerItems: [],
    footerBackgroundType: 'none',
    footerBackgroundOverlayOpacity: 0.65,
    hideFooterSignup: false,
  },
  'analytics-settings': {
    googleAnalyticsAnonymizeIp: true,
    enableViewTracking: true,
    enableGoogleIndexing: false,
  },
} as const satisfies Record<PristineGlobalSlug, object>

const mutations: Record<PristineGlobalSlug, ReadonlyArray<readonly [string, unknown]>> = {
  'site-settings': [
    ['siteName', { ar: 'جامعة' }],
    ['tagline', { en: 'Tagline' }],
    ['description', { ar: 'وصف' }],
    ['logo', 1],
    ['favicon', { id: 1 }],
    ['contactEmail', ''],
    ['contactPhone', '1'],
    ['address', { en: 'Address' }],
    ['mapLocation', '0,0'],
    ['socialLinks', [{ platform: 'social' }]],
    ['socialLinks', [{ url: '/' }]],
    ['copyright', ''],
    ['footerLogo', 1],
    ['googleAnalyticsId', 'G-1'],
  ],
  'about-page': [
    ['header.badge', { ar: 'Badge' }],
    ['header.title', { en: 'Title' }],
    ['header.description', ''],
    ['intro.body', { ar: { root: {} } }],
    ['intro.image', 1],
    ['vision.title', { ar: 'Vision' }],
    ['vision.description', { en: { root: {} } }],
    ['mission.title', { ar: 'Mission' }],
    ['mission.description', { en: { root: {} } }],
    ['goals.title', { ar: 'Goals' }],
    ['goals.description', { en: { root: {} } }],
    ['values.title', { ar: 'Values' }],
    ['values.description', { en: { root: {} } }],
    ['president.sectionTitle', { ar: 'President' }],
    ['president.messageIntro', { ar: { root: {} } }],
    ['president.messageBody', { en: { root: {} } }],
    ['president.messageClosing', ''],
    ['president.name', { en: 'Name' }],
    ['president.role', { ar: 'Role' }],
    ['president.image', 1],
    ['teamSection.sectionTitle', { ar: 'Team' }],
    ['teamSection.sectionDescription', { en: 'Team' }],
    ['teamMembersRelationship', [1]],
    ['teamMembers', [{ groupName: { ar: 'Leadership' } }]],
    ['teamMembers', [{ fullName: { ar: 'Member' } }]],
    ['teamMembers', [{ jobTitle: { en: 'Role' } }]],
    ['teamMembers', [{ memberImage: 1 }]],
    ['teamMembers', [{ displayOrder: 0 }]],
  ],
  'contact-settings': [
    ['page.badge', { ar: 'Contact' }],
    ['page.title', { en: 'Contact' }],
    ['page.description', ''],
    ['formLabels.nameLabel', { ar: 'Name' }],
    ['formLabels.namePlaceholder', { en: 'Name' }],
    ['formLabels.emailLabel', { ar: 'Email' }],
    ['formLabels.emailPlaceholder', { en: 'Email' }],
    ['formLabels.subjectLabel', { ar: 'Subject' }],
    ['formLabels.subjectPlaceholder', { en: 'Subject' }],
    ['formLabels.messageLabel', { ar: 'Message' }],
    ['formLabels.messagePlaceholder', { en: 'Message' }],
    ['formLabels.submitText', ''],
    ['contactInfo.phone', '1'],
    ['contactInfo.email', 'mail@invalid.test'],
    ['contactInfo.address', { ar: 'Address' }],
  ],
  'smart-chat-settings': [
    ['isEnabled', true],
    ['botName', ''],
    ['welcomeMessage', 'Hello'],
    ['apiEndpoint', '/api/chat'],
    ['model', 'model'],
    ['maxTokens', 1],
    ['temperature', 0],
  ],
  'navbar-settings': [
    ['topBarItems', [{ label: { ar: 'Item' } }]],
    ['topBarItems', [{ link: { type: 'reference' } }]],
    ['topBarItems', [{ link: { reference: 1 } }]],
    ['topBarItems', [{ link: { url: '/' } }]],
    ['topBarItems', [{ link: { newTab: false } }]],
    ['topBarItems', [{ openInNewTab: false }]],
    ['hideLogin', true],
    ['showLanguagePicker', false],
    ['callToAction.type', 'custom'],
    ['callToAction.reference', { relationTo: 'pages', value: 1 }],
    ['callToAction.url', '/admission'],
    ['callToAction.newTab', false],
    ['callToAction.appearance', 'secondary'],
  ],
  'footer-settings': [
    ['footerItems', [{ label: { ar: 'Home' } }]],
    ['footerItems', [{ link: { type: 'reference' } }]],
    ['footerItems', [{ link: { reference: 1 } }]],
    ['footerItems', [{ link: { url: '/' } }]],
    ['footerItems', [{ link: { newTab: false } }]],
    ['footerItems', [{ group: 'quick-links' }]],
    ['footerBackgroundType', 'image'],
    ['footerBackgroundImage', 1],
    ['footerBackgroundVideo', { id: 1 }],
    ['footerBackgroundOverlayOpacity', 0],
    ['hideFooterSignup', true],
    ['address', { ar: 'Address' }],
    ['footerPowered', ''],
  ],
  'analytics-settings': [
    ['googleAnalyticsId', 'G-1'],
    ['googleAnalyticsAnonymizeIp', false],
    ['enableViewTracking', false],
    ['robotsTxt', ''],
    ['headHtml', '<script></script>'],
    ['enableGoogleIndexing', true],
  ],
}

describe('isGlobalPristine', () => {
  it.each(Object.entries(baselines))('accepts the exact %s baseline', (slug, baseline) => {
    expect(isGlobalPristine(slug as PristineGlobalSlug, baseline)).toBe(true)
  })

  it.each(Object.entries(baselines))('ignores only root metadata for %s', (slug, baseline) => {
    expect(
      isGlobalPristine(slug as PristineGlobalSlug, {
        ...baseline,
        id: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe(true)
    expect(isGlobalPristine(slug as PristineGlobalSlug, { ...baseline, extra: undefined })).toBe(
      false,
    )
  })

  it.each(Object.entries(mutations))(
    'rejects every configured mutation category for %s',
    (slug, cases) => {
      for (const [path, value] of cases) {
        const mutated = structuredClone(baselines[slug as PristineGlobalSlug])
        setPath(mutated, path, value)
        expect(isGlobalPristine(slug as PristineGlobalSlug, mutated), path).toBe(false)
      }
    },
  )

  it('accepts an absent or explicitly undefined about relationship only', () => {
    expect(
      isGlobalPristine('about-page', {
        ...baselines['about-page'],
        teamMembersRelationship: undefined,
      }),
    ).toBe(true)
    expect(
      isGlobalPristine('about-page', {
        ...baselines['about-page'],
        teamMembersRelationship: null,
      }),
    ).toBe(false)
  })

  it('rejects missing defaults, non-objects, nested metadata, and empty configured strings', () => {
    expect(isGlobalPristine('site-settings', {})).toBe(false)
    expect(isGlobalPristine('site-settings', null)).toBe(false)
    expect(isGlobalPristine('site-settings', [])).toBe(false)
    expect(isGlobalPristine('about-page', { ...baselines['about-page'], header: { id: 1 } })).toBe(
      false,
    )
    expect(
      isGlobalPristine('analytics-settings', {
        ...baselines['analytics-settings'],
        robotsTxt: '',
      }),
    ).toBe(false)
  })
})

function setPath(target: object, path: string, value: unknown): void {
  const segments = path.split('.')
  let current = target as Record<string, unknown>

  for (const segment of segments.slice(0, -1)) {
    const nested = current[segment]
    if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) {
      current[segment] = {}
    }
    current = current[segment] as Record<string, unknown>
  }

  current[segments.at(-1) as string] = value
}
