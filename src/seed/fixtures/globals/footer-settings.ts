import type { LocalizedGlobalFixture } from './types'

const routes = [
  ['/', 'الرئيسية', 'Home'],
  ['/about', 'عن الجامعة', 'About'],
  ['/colleges', 'الكليات', 'Colleges'],
  ['/news', 'الأخبار', 'News'],
  ['/events', 'الفعاليات', 'Events'],
  ['/centers', 'المراكز', 'Centers'],
  ['/projects-studio', 'المشاريع', 'Projects'],
  ['/offers', 'العروض', 'Offers'],
  ['/partners', 'الشركاء', 'Partners'],
  ['/faq', 'الأسئلة الشائعة', 'FAQ'],
  ['/contact', 'اتصل بنا', 'Contact'],
  ['/admission', 'القبول', 'Admission'],
] as const

const arabicFooterItems = routes.map((route) => ({
  group: null,
  label: route[1],
  link: {
    type: 'custom' as const,
    url: route[0],
    newTab: false,
    reference: null,
  },
}))

const englishFooterItems = routes.map((route) => ({ label: route[2] }))

export const footerSettingsFixture = {
  shared: {
    footerBackgroundType: 'none',
    footerBackgroundOverlayOpacity: 0.65,
    hideFooterSignup: false,
  },
  ar: {
    footerItems: arabicFooterItems,
  },
  en: {
    footerItems: englishFooterItems,
  },
} as const satisfies LocalizedGlobalFixture<'footer-settings'>
