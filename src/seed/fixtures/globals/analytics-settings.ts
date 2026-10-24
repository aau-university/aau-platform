import type { SharedGlobalFixture } from './types'

export const analyticsSettingsFixture = {
  shared: {
    googleAnalyticsAnonymizeIp: true,
    enableViewTracking: true,
    robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api',
    enableGoogleIndexing: false,
  },
} as const satisfies SharedGlobalFixture<'analytics-settings'>
