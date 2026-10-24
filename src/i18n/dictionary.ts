/**
 * Static UI dictionary for the AAU public website.
 *
 * Use this for text that is NOT stored in Payload (buttons, error messages,
 * accessibility labels, etc.). Content that lives in Payload should be
 * fetched via the Local API with Payload's `locale` option.
 *
 * Keys are flat strings (`"home.hero.applyNow"`) — this keeps the type system
 * happy without a deep nested record, and makes it easy to grep for usages.
 */

import type { Locale } from './locale'

export type DictKey =
  | 'common.applyNow'
  | 'common.discoverMore'
  | 'common.aboutUs'
  | 'common.viewAll'
  | 'common.loading'
  | 'common.languageToggle'
  | 'common.languageToggleAria'
  | 'common.copyright'

  | 'nav.home'
  | 'nav.about'
  | 'nav.colleges'
  | 'nav.news'
  | 'nav.contact'

  | 'home.hero.badge'
  | 'home.hero.title'
  | 'home.hero.subtitle'
  | 'home.hero.description'

  | 'home.stats.students'
  | 'home.stats.faculty'
  | 'home.stats.programs'
  | 'home.stats.colleges'

  | 'home.colleges.heading'
  | 'home.colleges.subtitle'
  | 'home.news.heading'
  | 'home.news.subtitle'

  | 'home.cta.heading'
  | 'home.cta.description'
  | 'home.cta.button'

  | 'forms.contact.success'
  | 'forms.contact.error'
  | 'forms.join.success'
  | 'forms.join.error'
  | 'forms.rateLimited'

const dictionary: Record<Locale, Record<DictKey, string>> = {
  ar: {
    'common.applyNow': 'التقديم الآن',
    'common.discoverMore': 'اكتشف المزيد',
    'common.aboutUs': 'تعرّف علينا',
    'common.viewAll': 'عرض الكل',
    'common.loading': 'جاري التحميل...',
    'common.languageToggle': 'English',
    'common.languageToggleAria': 'تبديل اللغة إلى الإنجليزية',
    'common.copyright': 'جميع الحقوق محفوظة',

    'nav.home': 'الرئيسية',
    'nav.about': 'عن الجامعة',
    'nav.colleges': 'الكليات',
    'nav.news': 'الأخبار',
    'nav.contact': 'اتصل بنا',

    'home.hero.badge': 'مرحباً بكم في الأكاديمية',
    'home.hero.title': 'الأكاديمية العربية',
    'home.hero.subtitle': 'لأجيال واعدة',
    'home.hero.description':
      'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا لخدمة المجتمع.',

    'home.stats.students': 'طالب وطالبة',
    'home.stats.faculty': 'عضو هيئة تدريس',
    'home.stats.programs': 'برنامج أكاديمي',
    'home.stats.colleges': 'كلية متخصصة',

    'home.colleges.heading': 'كلياتنا',
    'home.colleges.subtitle': 'اكتشف الكليات والبرامج الأكاديمية المتاحة',
    'home.news.heading': 'آخر الأخبار',
    'home.news.subtitle': 'تابع آخر المستجدات والأخبار الجامعية',

    'home.cta.heading': 'انضم إلى مجتمع الأكاديمية',
    'home.cta.description':
      'نقدّم برامج أكاديمية متميّزة تؤهلك لسوق العمل وتمنحك فرصة بناء مستقبل مشرق.',
    'home.cta.button': 'سجّل الآن',

    'forms.contact.success': 'تم إرسال رسالتك بنجاح. سنرد عليك قريبًا.',
    'forms.contact.error': 'تعذّر إرسال الرسالة. حاول مرة أخرى.',
    'forms.join.success': 'تم استلام طلب التقديم. سيتواصل معك فريق القبول.',
    'forms.join.error': 'تعذّر إرسال الطلب. حاول مرة أخرى.',
    'forms.rateLimited': 'لقد تجاوزت الحد المسموح. الرجاء المحاولة لاحقًا.',
  },
  en: {
    'common.applyNow': 'Apply Now',
    'common.discoverMore': 'Discover More',
    'common.aboutUs': 'About Us',
    'common.viewAll': 'View All',
    'common.loading': 'Loading...',
    'common.languageToggle': 'العربية',
    'common.languageToggleAria': 'Switch language to Arabic',
    'common.copyright': 'All rights reserved',

    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.colleges': 'Colleges',
    'nav.news': 'News',
    'nav.contact': 'Contact',

    'home.hero.badge': 'Welcome to the Academy',
    'home.hero.title': 'Arab Academy',
    'home.hero.subtitle': 'For Promising Generations',
    'home.hero.description':
      'A leading educational institution preparing scientifically and technically qualified graduates to serve the community.',

    'home.stats.students': 'Students',
    'home.stats.faculty': 'Faculty Members',
    'home.stats.programs': 'Academic Programs',
    'home.stats.colleges': 'Specialised Colleges',

    'home.colleges.heading': 'Our Colleges',
    'home.colleges.subtitle': 'Explore our colleges and available academic programmes',
    'home.news.heading': 'Latest News',
    'home.news.subtitle': 'Stay up to date with the latest university news',

    'home.cta.heading': 'Join the Academy Community',
    'home.cta.description':
      'We offer distinguished academic programmes that prepare you for the job market and help you build a bright future.',
    'home.cta.button': 'Register Now',

    'forms.contact.success': 'Your message has been sent. We will respond shortly.',
    'forms.contact.error': 'Unable to send the message. Please try again.',
    'forms.join.success': 'Your application has been received. Admissions will be in touch.',
    'forms.join.error': 'Unable to submit the application. Please try again.',
    'forms.rateLimited': 'You have exceeded the allowed rate. Please try again later.',
  },
}

/**
 * Translate a static dictionary key for the given locale.
 * Falls back to Arabic (default locale) if the key is missing in `en`.
 */
export function translate(locale: Locale, key: DictKey): string {
  const localeDict = dictionary[locale]
  const value = localeDict[key]
  if (value !== undefined && value !== '') return value
  return dictionary.ar[key] ?? key
}

export function getDictionary(locale: Locale): Record<DictKey, string> {
  return dictionary[locale]
}
