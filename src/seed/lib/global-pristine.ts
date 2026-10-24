const metadataKeys = new Set(['id', 'createdAt', 'updatedAt'])

const pristineProjections = {
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
    teamMembersRelationship: undefined,
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
} as const

export type PristineGlobalSlug = keyof typeof pristineProjections

export function isGlobalPristine(slug: PristineGlobalSlug, value: unknown): boolean {
  if (!isRecord(value)) return false

  const configuredData = Object.fromEntries(
    Object.entries(value).filter(([key]) => !metadataKeys.has(key)),
  )

  return isExactProjection(configuredData, pristineProjections[slug])
}

function isExactProjection(value: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(value) &&
      value.length === expected.length &&
      value.every((item, index) => isExactProjection(item, expected[index]))
    )
  }

  if (!isRecord(expected)) return Object.is(value, expected)
  if (!isRecord(value)) return false

  const expectedKeys = Object.keys(expected)
  const valueKeys = Object.keys(value)
  const requiredExpectedKeys = expectedKeys.filter((key) => expected[key] !== undefined)

  if (valueKeys.some((key) => !expectedKeys.includes(key))) return false
  if (requiredExpectedKeys.some((key) => !valueKeys.includes(key))) return false

  return expectedKeys.every(
    (key) => !valueKeys.includes(key) || isExactProjection(value[key], expected[key]),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
