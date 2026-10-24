import type { LocalizedGlobalFixture } from './types'

export const siteSettingsFixture = {
  shared: {
    copyright: 'جميع الحقوق محفوظة. All rights reserved.',
  },
  ar: {
    siteName: 'جامعة الجيل الجديد',
    tagline: 'لأجيال واعدة',
    description:
      'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا للمساهمة في تنمية المجتمع.',
  },
  en: {
    siteName: 'AJ JEEL ALJADEED UNIVERSITY',
    tagline: 'FOR PROMISING GENERATIONS',
    description:
      'A leading educational institution aiming to prepare specialised, scientifically qualified graduates who contribute to community development.',
  },
} as const satisfies LocalizedGlobalFixture<'site-settings'>
