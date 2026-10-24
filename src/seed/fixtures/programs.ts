import { published } from './content/shared'

export const programFixtures = [
  {
    admissionRate: 78,
    applicationSteps: {
      ar: [
        'التقديم الإلكتروني عبر موقع الجامعة',
        'إرفاق الوثائق المطلوبة',
        'دفع رسوم التسجيل',
        'إجراء المقابلة الشخصية (إن وجدت)',
        'استلام القبول والتسجيل النهائي',
      ],
      en: [
        'Online application through university website',
        'Attach required documents',
        'Pay registration fees',
        'Personal interview (if required)',
        'Receive admission and final registration',
      ],
    },
    careerProspects: {
      ar: ['طبيب عام', 'طبيب متخصص', 'باحث طبي', 'أكاديمي'],
      en: ['General Physician', 'Specialist Doctor', 'Medical Researcher', 'Academic'],
    },
    collegeSlug: 'medicine',
    degreeType: 'bachelor',
    departmentSlug: 'dept-medicine-general',
    description: {
      ar: 'برنامج الطب والجراحة يهدف إلى إعداد أطباء متميزين قادرين على تقديم الرعاية الصحية الشاملة',
      en: 'The Medicine and Surgery program aims to prepare distinguished physicians capable of providing comprehensive healthcare',
    },
    duration: {
      ar: '7 سنوات (سنة تحضيرية + 6 سنوات طب)',
      en: '7 years (1 preparatory + 6 medical)',
    },
    highSchoolType: { ar: 'علمي', en: 'Scientific' },
    ...published,
    name: { ar: 'برنامج طب وجراحة', en: 'Medicine and Surgery Program' },
    objectives: {
      ar: [
        'إعداد أطباء مؤهلين علمياً وعملياً',
        'تطوير مهارات التشخيص والعلاج',
        'تعزيز البحث العلمي الطبي',
      ],
      en: [
        'Prepare scientifically and practically qualified physicians',
        'Develop diagnostic and treatment skills',
        'Promote medical research',
      ],
    },
    slug: 'medicine-and-surgery',
    studyYears: '1 + 6',
    whyProgram: {
      ar: 'برنامج معتمد يوفر تدريباً سريرياً في أحدث المستشفيات ويخرج أطباء قادرين على المنافسة محلياً وإقليمياً.',
      en: 'An accredited program providing clinical training in the latest hospitals and graduating competitive physicians locally and regionally.',
    },
  },
  {
    admissionRate: 75,
    applicationSteps: {
      ar: ['التقديم الإلكتروني', 'إرفاق الوثائق', 'دفع الرسوم', 'المقابلة الشخصية', 'القبول النهائي'],
      en: ['Online application', 'Attach documents', 'Pay fees', 'Personal interview', 'Final admission'],
    },
    careerProspects: {
      ar: ['طبيب أسنان عام', 'أخصائي تقويم', 'جراح فم وأسنان'],
      en: ['General Dentist', 'Orthodontist', 'Oral Surgeon'],
    },
    collegeSlug: 'health-sciences',
    degreeType: 'bachelor',
    departmentSlug: 'dept-dentistry',
    description: {
      ar: 'برنامج متخصص في طب الأسنان يؤهل الخريجين لممارسة طب الفم والأسنان بكفاءة عالية',
      en: 'A specialized program in dentistry that qualifies graduates to practice oral and dental medicine with high efficiency',
    },
    duration: {
      ar: '6 سنوات (سنة تحضيرية + 5 سنوات)',
      en: '6 years (1 preparatory + 5 years)',
    },
    highSchoolType: { ar: 'علمي', en: 'Scientific' },
    ...published,
    name: {
      ar: 'طب وجراحة الفم والأسنان',
      en: 'Oral and Dental Medicine and Surgery',
    },
    objectives: {
      ar: ['إعداد أطباء أسنان مؤهلين', 'تطوير المهارات السريرية في طب الأسنان', 'تعزيز الوعي الصحي الفموي'],
      en: ['Prepare qualified dentists', 'Develop clinical skills in dentistry', 'Promote oral health awareness'],
    },
    slug: 'oral-dental-medicine',
    studyYears: '1 + 5',
    whyProgram: {
      ar: 'برنامج عملي يركز على التدريب السريري في عيادات الأسنان الحديثة.',
      en: 'A practical program focusing on clinical training in modern dental clinics.',
    },
  },
  {
    admissionRate: 70,
    applicationSteps: {
      ar: ['التقديم الإلكتروني', 'الوثائق', 'الرسوم', 'القبول'],
      en: ['Online application', 'Documents', 'Fees', 'Admission'],
    },
    careerProspects: {
      ar: ['صيدلي مستشفيات', 'صيدلي مجتمعي', 'صيدلي صناعي'],
      en: ['Hospital Pharmacist', 'Community Pharmacist', 'Industrial Pharmacist'],
    },
    collegeSlug: 'health-sciences',
    degreeType: 'bachelor',
    departmentSlug: 'dept-pharmacy',
    description: {
      ar: 'برنامج الصيدلة يعد الخريجين للعمل في مختلف مجالات الصيدلة والرعاية الدوائية',
      en: 'The pharmacy program prepares graduates for various pharmacy and pharmaceutical care fields',
    },
    duration: {
      ar: '6 سنوات (سنة تحضيرية + 5 سنوات)',
      en: '6 years (1 preparatory + 5 years)',
    },
    highSchoolType: { ar: 'علمي', en: 'Scientific' },
    ...published,
    name: { ar: 'دكتور صيدلة', en: 'Doctor of Pharmacy' },
    objectives: {
      ar: ['إعداد صيادلة مؤهلين', 'تطوير المعرفة الدوائية', 'تعزيز ممارسات الصيدلة السريرية'],
      en: ['Prepare qualified pharmacists', 'Develop pharmaceutical knowledge', 'Promote clinical pharmacy practices'],
    },
    slug: 'doctor-of-pharmacy',
    studyYears: '1 + 5',
    whyProgram: {
      ar: 'برنامج شامل يجمع بين العلوم الصيدلانية النظرية والتطبيق العملي.',
      en: 'A comprehensive program combining theoretical pharmaceutical sciences and practical application.',
    },
  },
  {
    admissionRate: 55,
    applicationSteps: {
      ar: ['التقديم', 'الوثائق', 'الرسوم', 'القبول'],
      en: ['Application', 'Documents', 'Fees', 'Admission'],
    },
    careerProspects: {
      ar: ['مطور برمجيات', 'مدير نظم', 'محلل بيانات', 'مهندس شبكات'],
      en: ['Software Developer', 'System Administrator', 'Data Analyst', 'Network Engineer'],
    },
    collegeSlug: 'engineering-it',
    degreeType: 'bachelor',
    departmentSlug: 'dept-information-technology',
    description: {
      ar: 'برنامج شامل في تقنية المعلومات والأنظمة',
      en: 'A comprehensive program in information technology and systems',
    },
    duration: { ar: '4 سنوات', en: '4 years' },
    highSchoolType: { ar: 'علمي', en: 'Scientific' },
    ...published,
    name: { ar: 'تكنولوجيا المعلومات', en: 'Information Technology' },
    objectives: {
      ar: ['إعداد مطورين برمجيات', 'تطوير مهارات تحليل النظم', 'تعزيز الابتكار التقني'],
      en: ['Prepare software developers', 'Develop systems analysis skills', 'Promote technological innovation'],
    },
    slug: 'information-technology',
    studyYears: '4',
    whyProgram: {
      ar: 'برنامج يواكب أحدث التقنيات ويربط التعليم بسوق العمل.',
      en: 'A program keeping pace with the latest technologies and linking education to the labor market.',
    },
  },
  {
    admissionRate: 60,
    applicationSteps: {
      ar: ['التقديم', 'الوثائق', 'الرسوم', 'القبول'],
      en: ['Application', 'Documents', 'Fees', 'Admission'],
    },
    careerProspects: {
      ar: ['مدير مشاريع', 'محلل أعمال', 'رائد أعمال', 'مدير مالي'],
      en: ['Project Manager', 'Business Analyst', 'Entrepreneur', 'Financial Manager'],
    },
    collegeSlug: 'business-humanities',
    degreeType: 'bachelor',
    departmentSlug: 'dept-business-administration',
    description: {
      ar: 'برنامج يؤهل الطلاب لإدارة المؤسسات بكفاءة',
      en: 'A program that prepares students to manage organizations effectively',
    },
    duration: { ar: '4 سنوات', en: '4 years' },
    highSchoolType: { ar: 'علمي + أدبي', en: 'Scientific + Literary' },
    ...published,
    name: { ar: 'إدارة أعمال', en: 'Business Administration' },
    objectives: {
      ar: ['إعداد قادة إداريين', 'تطوير مهارات الإدارة الاستراتيجية', 'تعزيز ريادة الأعمال'],
      en: ['Prepare administrative leaders', 'Develop strategic management skills', 'Promote entrepreneurship'],
    },
    slug: 'business-administration',
    studyYears: '4',
    whyProgram: {
      ar: 'برنامج عملي يركز على دراسات الحالة والتدريب الميداني.',
      en: 'A practical program focusing on case studies and field training.',
    },
  },
] as const
