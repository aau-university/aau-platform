import type { SeedUpdateGlobalArgs } from '../../lib/local-api'

export const globalResetValues = {
  'site-settings': {
    logo: null,
    favicon: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    mapLocation: null,
    socialLinks: [],
    footerLogo: null,
    googleAnalyticsId: null,
  },
  'about-page': {
    intro: { image: null },
    president: { image: null },
    teamMembers: [],
  },
  'contact-settings': {
    contactInfo: { phone: null, email: null, address: null },
  },
  'smart-chat-settings': {
    isEnabled: false,
    botName: null,
    welcomeMessage: null,
    apiEndpoint: null,
    model: null,
    maxTokens: null,
    temperature: null,
  },
  'navbar-settings': {
    topBarItems: [],
    hideLogin: false,
    showLanguagePicker: true,
  },
  'footer-settings': {
    footerItems: [],
    footerBackgroundType: 'none',
    footerBackgroundImage: null,
    footerBackgroundVideo: null,
    footerBackgroundOverlayOpacity: 0.65,
    hideFooterSignup: false,
    address: null,
    footerPowered: null,
  },
  'analytics-settings': {
    googleAnalyticsId: null,
    googleAnalyticsAnonymizeIp: true,
    enableViewTracking: true,
    robotsTxt: null,
    headHtml: null,
    enableGoogleIndexing: false,
  },
} as const satisfies {
  'site-settings': SeedUpdateGlobalArgs<'site-settings'>['data']
  'about-page': SeedUpdateGlobalArgs<'about-page'>['data']
  'contact-settings': SeedUpdateGlobalArgs<'contact-settings'>['data']
  'smart-chat-settings': SeedUpdateGlobalArgs<'smart-chat-settings'>['data']
  'navbar-settings': SeedUpdateGlobalArgs<'navbar-settings'>['data']
  'footer-settings': SeedUpdateGlobalArgs<'footer-settings'>['data']
  'analytics-settings': SeedUpdateGlobalArgs<'analytics-settings'>['data']
}
