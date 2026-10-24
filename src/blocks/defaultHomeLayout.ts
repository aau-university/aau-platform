import type { PageLayoutBlock } from './types'

export const DEFAULT_HOME_LAYOUT_AR = [
  {
    blockType: 'hero',
    badge: 'مرحباً بكم في جامعة الجيل الجديد',
    titlePrimary: 'جامعة الجيل الجديد',
    titleSecondary: 'الجامعة',
    tagline: 'لأجيال واعدة',
    description:
      'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا لخدمة المجتمع.',
    primaryCtaLabel: 'ابدأ رحلتك',
    primaryCtaHref: '/admission',
    secondaryCtaLabel: 'استكشف الكليات',
    secondaryCtaHref: '/colleges',
  },
  {
    blockType: 'collegesGrid',
    title: 'كلياتنا',
    description: 'نقدم مجموعة متنوعة من البرامج الأكاديمية المتميزة في مختلف التخصصات',
    maxItems: 4,
    variant: 'featured',
  },
  {
    blockType: 'newsGrid',
    title: 'الأخبار',
    description: 'تابع آخر أخبار الجامعة ومستجداتها',
    maxItems: 4,
    variant: 'latest',
  },
  {
    blockType: 'admissionCTA',
    badge: 'القبول والتسجيل',
    heading: 'انضم إلى مجتمع الأكاديمية',
    description: 'نقدم برامج أكاديمية متميزة تؤهلك لسوق العمل وتمنحك فرصة بناء مستقبل مشرق.',
    buttonLabel: 'سجل الآن',
    buttonHref: '/admission',
  },
  {
    blockType: 'contactInfo',
    badge: 'تواصل معنا',
    heading: 'نسعد بالتواصل معك',
    description:
      'فريقنا متاح للإجابة عن استفساراتكم بخصوص القبول والبرامج الأكاديمية وأي شؤون إدارية.',
  },
] satisfies PageLayoutBlock[]

export const DEFAULT_HOME_LAYOUT_EN = [
  {
    blockType: 'hero',
    badge: 'Welcome to ALJEEL AL JADEED UNIVERSITY',
    titlePrimary: 'ALJEEL AL JADEED',
    titleSecondary: 'UNIVERSITY',
    tagline: 'FOR PROMISING GENERATIONS',
    description:
      'A leading educational institution preparing specialized and scientifically qualified graduates to serve the community.',
    primaryCtaLabel: 'Start Your Journey',
    primaryCtaHref: '/admission',
    secondaryCtaLabel: 'Explore Colleges',
    secondaryCtaHref: '/colleges',
  },
  {
    blockType: 'collegesGrid',
    title: 'Our Colleges',
    description: 'We offer a diverse range of distinguished academic programmes.',
    maxItems: 4,
    variant: 'featured',
  },
  {
    blockType: 'newsGrid',
    title: 'News',
    description: 'Follow the latest university news and updates.',
    maxItems: 4,
    variant: 'latest',
  },
  {
    blockType: 'admissionCTA',
    badge: 'Admissions',
    heading: 'Join the Academy Community',
    description:
      'We offer distinguished academic programmes that prepare you for the job market.',
    buttonLabel: 'Register Now',
    buttonHref: '/admission',
  },
  {
    blockType: 'contactInfo',
    badge: 'Contact',
    heading: 'We are happy to hear from you',
    description:
      'Our team is available to answer your questions about admissions and academic programmes.',
  },
] satisfies PageLayoutBlock[]

export const DEFAULT_HOME_LAYOUT = DEFAULT_HOME_LAYOUT_AR
