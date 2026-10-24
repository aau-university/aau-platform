import type { LocalizedGlobalFixture } from './types'

export const navbarSettingsFixture = {
  shared: {
    topBarItems: [],
    callToAction: {
      appearance: 'default',
      reference: null,
      type: 'custom',
      url: '/admission',
      newTab: false,
    },
    hideLogin: false,
    showLanguagePicker: true,
  },
  ar: {},
  en: {},
} as const satisfies LocalizedGlobalFixture<'navbar-settings'>
