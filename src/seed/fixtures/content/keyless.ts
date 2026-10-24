import { published } from './shared'

export const sliderFixtures = [
  {
    shared: {
      displayOrder: 1,
      isActive: true,
      link: { type: 'custom' as const, url: '/about', newTab: false },
    },
    ar: { title: 'مرحباً بكم في جامعة الجيل الجديد', subtitle: 'مؤسسة تعليمية رائدة' },
    en: {
      title: 'Welcome to AJ JEEL ALJADEED UNIVERSITY',
      subtitle: 'A leading educational institution',
    },
  },
  {
    shared: {
      displayOrder: 2,
      isActive: true,
      link: { type: 'custom' as const, url: '/admission', newTab: false },
    },
    ar: { title: 'سجّل الآن للعام الأكاديمي 2026', subtitle: 'بوابة القبول الإلكترونية مفتوحة' },
    en: {
      title: 'Register Now for Academic Year 2026',
      subtitle: 'Online admission portal is open',
    },
  },
  {
    shared: {
      displayOrder: 3,
      isActive: true,
      link: { type: 'custom' as const, url: '/colleges/medicine', newTab: false },
    },
    ar: { title: 'كلية الطب البشري', subtitle: 'برنامج طب وجراحة معتمد' },
    en: { title: 'College of Human Medicine', subtitle: 'Accredited Medicine and Surgery Program' },
  },
  {
    shared: {
      displayOrder: 4,
      isActive: true,
      link: { type: 'custom' as const, url: '/colleges/engineering-it', newTab: false },
    },
    ar: { title: 'كلية الهندسة وتكنولوجيا المعلومات', subtitle: 'برامج حديثة تواكب سوق العمل' },
    en: {
      title: 'College of Engineering and IT',
      subtitle: 'Modern programs meeting market demands',
    },
  },
  {
    shared: {
      displayOrder: 5,
      isActive: true,
      link: { type: 'custom' as const, url: '/campus-life', newTab: false },
    },
    ar: { title: 'الحياة الجامعية النابضة', subtitle: 'مرافق وأنشطة متنوعة' },
    en: { title: 'Vibrant Campus Life', subtitle: 'Diverse facilities and activities' },
  },
] as const

export const studentAffairsDocumentFixtures = (
  [
    ['لائحة شؤون الطلاب', 'Student Affairs Regulations'],
    ['الدور التكميلي', 'Supplementary Semester'],
    ['استمارة تظلمات', 'Grievance Form'],
    ['ضوابط وسلوكيات عامة', 'General Behavior Controls'],
    ['ضوابط وسلوكيات الامتحانات', 'Exam Behavior Controls'],
    ['التقويم الأكاديمي 2026-2027', 'Academic Calendar 2026-2027'],
    ['دليل الطالب الجامعي', 'Student Handbook'],
    ['ميثاق السلوك الأكاديمي', 'Academic Code of Conduct'],
  ] as const
).map(([titleAr, titleEn], index) => ({
  shared: { ...published, fileComingSoon: true, displayOrder: index + 1 },
  ar: { title: titleAr },
  en: { title: titleEn },
}))

export const admissionRequirementFixtures = (
  [
    [
      'متطلبات القبول العامة',
      'General Admission Requirements',
      'شهادة الثانوية العامة بالفرع العلمي أو الأدبي حسب البرنامج، صورة من البطاقة الشخصية، عدد 6 صور شخصية.',
      'High school certificate in scientific or literary branch per program, copy of ID, 6 personal photos.',
    ],
    [
      'متطلبات كلية الطب',
      'Medicine College Requirements',
      'شهادة الثانوية العامة الفرع العلمي بنسبة لا تقل عن 78%، اجتياز الاختبار الطبي والمقابلة الشخصية.',
      'High school scientific branch with minimum 78%, pass medical test and personal interview.',
    ],
    [
      'متطلبات كلية الهندسة',
      'Engineering College Requirements',
      'شهادة الثانوية العامة الفرع العلمي بنسبة لا تقل عن 60%، اجتياز اختبار القبول.',
      'High school scientific branch with minimum 60%, pass admission test.',
    ],
    [
      'متطلبات القبول للبكالوريوس',
      'Bachelor Admission Requirements',
      'يشترط للقبول في برامج البكالوريوس شهادة الثانوية العامة بمعدل لا يقل عن 70% واجتياز اختبار القبول.',
      'Admission to bachelor programs requires a high school certificate with a minimum 70% average and passing the admission test.',
    ],
    [
      'متطلبات القبول للماجستير',
      'Master Admission Requirements',
      'يشترط للقبول في برامج الماجستير شهادة البكالوريوس بتقدير لا يقل عن جيد ومقابلة شخصية.',
      'Admission to master programs requires a bachelor degree with at least a Good grade and a personal interview.',
    ],
    [
      'متطلبات القبول للدبلوم',
      'Diploma Admission Requirements',
      'يشترط للقبول في برامج الدبلوم شهادة الثانوية العامة بمعدل لا يقل عن 60%.',
      'Admission to diploma programs requires a high school certificate with a minimum 60% average.',
    ],
  ] as const
).map(([titleAr, titleEn, contentAr, contentEn], index) => ({
  shared: { ...published, displayOrder: index + 1 },
  ar: { title: titleAr, content: contentAr },
  en: { title: titleEn, content: contentEn },
}))
