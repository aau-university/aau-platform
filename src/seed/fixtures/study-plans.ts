export const studyPlanFixtures = [
  {
    collegeSlug: 'medicine',
    courses: [
      { code: 'MED101', credits: 3, name: { ar: 'التربية الصحية', en: 'Health Education' }, semester: '1', year: 1 },
      { code: 'BIO101', credits: 4, name: { ar: 'الأحياء العامة', en: 'General Biology' }, semester: '1', year: 1 },
      { code: 'CHE101', credits: 4, name: { ar: 'الكيمياء العامة', en: 'General Chemistry' }, semester: '1', year: 1 },
      { code: 'PHY101', credits: 3, name: { ar: 'الفيزياء الطبية', en: 'Medical Physics' }, semester: '2', year: 1 },
      { code: 'BIO102', credits: 5, name: { ar: 'علم التشريح', en: 'Anatomy' }, semester: '2', year: 1 },
    ],
    name: { ar: 'خطة الطب - السنة التحضيرية', en: 'Medicine Plan - Preparatory Year' },
    programSlug: 'medicine-and-surgery',
    slug: 'plan-medicine-year1',
  },
  {
    collegeSlug: 'health-sciences',
    courses: [
      { code: 'DEN101', credits: 3, name: { ar: 'مدخل لطب الأسنان', en: 'Introduction to Dentistry' }, semester: '1', year: 1 },
      { code: 'BIO101', credits: 4, name: { ar: 'الأحياء العامة', en: 'General Biology' }, semester: '1', year: 1 },
      { code: 'CHE101', credits: 4, name: { ar: 'الكيمياء العامة', en: 'General Chemistry' }, semester: '1', year: 1 },
      { code: 'DEN102', credits: 4, name: { ar: 'تشريح الرأس والعنق', en: 'Head and Neck Anatomy' }, semester: '2', year: 1 },
    ],
    name: { ar: 'خطة طب الأسنان - السنة التحضيرية', en: 'Dentistry Plan - Preparatory Year' },
    programSlug: 'oral-dental-medicine',
    slug: 'plan-dentistry-year1',
  },
  {
    collegeSlug: 'health-sciences',
    courses: [
      { code: 'PHR101', credits: 3, name: { ar: 'مدخل للصيدلة', en: 'Introduction to Pharmacy' }, semester: '1', year: 1 },
      { code: 'BIO101', credits: 4, name: { ar: 'الأحياء العامة', en: 'General Biology' }, semester: '1', year: 1 },
      { code: 'CHE101', credits: 4, name: { ar: 'الكيمياء العضوية', en: 'Organic Chemistry' }, semester: '1', year: 1 },
      { code: 'PHR102', credits: 4, name: { ar: 'علم الأدوية الأساسي', en: 'Basic Pharmacology' }, semester: '2', year: 1 },
    ],
    name: { ar: 'خطة الصيدلة - السنة التحضيرية', en: 'Pharmacy Plan - Preparatory Year' },
    programSlug: 'doctor-of-pharmacy',
    slug: 'plan-pharmacy-year1',
  },
  {
    collegeSlug: 'engineering-it',
    courses: [
      { code: 'CS101', credits: 4, name: { ar: 'مقدمة في البرمجة', en: 'Introduction to Programming' }, semester: '1', year: 1 },
      { code: 'CS102', credits: 3, name: { ar: 'الرياضيات المتقطعة', en: 'Discrete Mathematics' }, semester: '1', year: 1 },
      { code: 'CS103', credits: 3, name: { ar: 'أساسيات قواعد البيانات', en: 'Database Fundamentals' }, semester: '2', year: 1 },
      { code: 'CS104', credits: 4, name: { ar: 'هياكل البيانات', en: 'Data Structures' }, semester: '2', year: 1 },
    ],
    name: { ar: 'خطة تكنولوجيا المعلومات - السنة الأولى', en: 'IT Plan - First Year' },
    programSlug: 'information-technology',
    slug: 'plan-it-year1',
  },
  {
    collegeSlug: 'business-humanities',
    courses: [
      { code: 'BUS101', credits: 3, name: { ar: 'مبادئ الإدارة', en: 'Principles of Management' }, semester: '1', year: 1 },
      { code: 'BUS102', credits: 4, name: { ar: 'مبادئ المحاسبة', en: 'Principles of Accounting' }, semester: '1', year: 1 },
      { code: 'BUS103', credits: 3, name: { ar: 'الاقتصاد الجزئي', en: 'Microeconomics' }, semester: '2', year: 1 },
      { code: 'BUS104', credits: 3, name: { ar: 'إدارة التسويق', en: 'Marketing Management' }, semester: '2', year: 1 },
    ],
    name: { ar: 'خطة إدارة الأعمال - السنة الأولى', en: 'Business Administration Plan - First Year' },
    programSlug: 'business-administration',
    slug: 'plan-business-year1',
  },
] as const
