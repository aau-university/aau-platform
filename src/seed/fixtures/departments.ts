import { published } from './content/shared'

export const departmentFixtures = [
  {
    collegeSlug: 'medicine',
    description: {
      ar: 'قسم الطب البشري يقدم برنامجاً متكاملاً لإعداد الأطباء',
      en: 'The Department of Human Medicine offers an integrated program to prepare physicians',
    },
    headFacultySlug: 'dr-ahmed-mahmoud',
    ...published,
    name: { ar: 'قسم الطب البشري', en: 'Department of Human Medicine' },
    slug: 'dept-medicine-general',
  },
  {
    collegeSlug: 'health-sciences',
    description: { ar: 'قسم متخصص في طب الأسنان', en: 'A specialized department in dentistry' },
    headFacultySlug: 'dr-salma-khaled',
    ...published,
    name: { ar: 'قسم طب وجراحة الفم والأسنان', en: 'Department of Oral and Dental Medicine and Surgery' },
    slug: 'dept-dentistry',
  },
  {
    collegeSlug: 'health-sciences',
    description: {
      ar: 'قسم الصيدلة يعد الخريجين للعمل في مختلف مجالات الصيدلة',
      en: 'The Pharmacy Department prepares graduates for various pharmacy fields',
    },
    headFacultySlug: 'dr-fatima-ali',
    ...published,
    name: { ar: 'قسم الصيدلة', en: 'Department of Pharmacy' },
    slug: 'dept-pharmacy',
  },
  {
    collegeSlug: 'engineering-it',
    description: {
      ar: 'قسم شامل في تقنية المعلومات والأنظمة',
      en: 'A comprehensive department in information technology and systems',
    },
    headFacultySlug: 'dr-khaled-abdullah',
    ...published,
    name: { ar: 'قسم تكنولوجيا المعلومات', en: 'Department of Information Technology' },
    slug: 'dept-information-technology',
  },
  {
    collegeSlug: 'business-humanities',
    description: {
      ar: 'قسم يؤهل الطلاب لإدارة المؤسسات بكفاءة',
      en: 'A department that prepares students to manage organizations effectively',
    },
    headFacultySlug: 'dr-mohammed-saeed',
    ...published,
    name: { ar: 'قسم إدارة الأعمال', en: 'Department of Business Administration' },
    slug: 'dept-business-administration',
  },
] as const
