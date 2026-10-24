export const teamMemberFixtures = [
  {
    slug: 'president-hamdan',
    shared: {
      email: 'president@aau.edu.ye',
      phone: '+967-1-000000',
      isActive: true,
      displayOrder: 1,
    },
    ar: {
      name: 'أ.د/ همدان الشامي',
      jobTitle: 'رئيس الجامعة',
      group: 'القيادة',
      bio: 'رئيس الجامعة وأستاذ الرياضيات. حاصل على الدكتوراه من جامعة برمنجهام.',
    },
    en: {
      name: 'Prof. Dr. Hamdan Al-Shami',
      jobTitle: 'University President',
      group: 'Leadership',
      bio: 'University President and Professor of Mathematics. PhD from University of Birmingham.',
    },
  },
  {
    slug: 'vp-academic',
    shared: {
      email: 'vp.academic@aau.edu.ye',
      phone: '+967-1-000010',
      isActive: true,
      displayOrder: 2,
    },
    ar: {
      name: 'د. عبدالباري القباطي',
      jobTitle: 'نائب الرئيس للشؤون الأكاديمية',
      group: 'القيادة',
      bio: 'نائب الرئيس للشؤون الأكاديمية وأستاذ الهندسة.',
    },
    en: {
      name: 'Dr. Abdulbari Al-Qubati',
      jobTitle: 'Vice President for Academic Affairs',
      group: 'Leadership',
      bio: 'VP for Academic Affairs and Professor of Engineering.',
    },
  },
  {
    slug: 'dean-medicine',
    shared: {
      email: 'dean.medicine@aau.edu.ye',
      phone: '+967-1-000001',
      isActive: true,
      displayOrder: 3,
    },
    ar: {
      name: 'د. أحمد محمود الحسن',
      jobTitle: 'عميد كلية الطب البشري',
      group: 'القيادة',
      bio: 'عميد كلية الطب البشري وأستاذ الأمراض الباطنية.',
    },
    en: {
      name: 'Dr. Ahmed Mahmoud Al-Hasan',
      jobTitle: 'Dean of College of Human Medicine',
      group: 'Leadership',
      bio: 'Dean of College of Human Medicine and Professor of Internal Medicine.',
    },
  },
  {
    slug: 'registrar',
    shared: {
      email: 'registrar@aau.edu.ye',
      phone: '+967-1-000020',
      isActive: true,
      displayOrder: 4,
    },
    ar: {
      name: 'أ. محمد المرادي',
      jobTitle: 'مدير شؤون الطلاب',
      group: 'الإدارة',
      bio: 'مدير شؤون الطلاب المسؤول عن القبول والتسجيل.',
    },
    en: {
      name: 'Mr. Mohammed Al-Muradi',
      jobTitle: 'Student Affairs Director',
      group: 'Administration',
      bio: 'Student Affairs Director responsible for admission and registration.',
    },
  },
  {
    slug: 'it-manager',
    shared: { email: 'it@aau.edu.ye', phone: '+967-1-000030', isActive: true, displayOrder: 5 },
    ar: {
      name: 'م. سالم باوزير',
      jobTitle: 'مدير تقنية المعلومات',
      group: 'الإدارة',
      bio: 'مدير قسم تقنية المعلومات والبنية التحتية الرقمية.',
    },
    en: {
      name: 'Eng. Salem Bawazir',
      jobTitle: 'IT Manager',
      group: 'Administration',
      bio: 'IT Department Manager and Digital Infrastructure Lead.',
    },
  },
  {
    slug: 'admission-officer',
    shared: {
      email: 'admission@aau.edu.ye',
      phone: '+967-1-000040',
      isActive: true,
      displayOrder: 6,
    },
    ar: {
      name: 'أ. فاطمة الصلوي',
      jobTitle: 'مسؤولة القبول والتسجيل',
      group: 'الدعم',
      bio: 'مسؤولة القبول والتسجيل ودعم الطلاب المستجدين.',
    },
    en: {
      name: 'Mrs. Fatima Al-Salwi',
      jobTitle: 'Admission Officer',
      group: 'Support',
      bio: 'Admission officer supporting new students.',
    },
  },
  {
    slug: 'dr-sara-ahmed-team',
    shared: { isActive: true, displayOrder: 7 },
    ar: {
      name: 'د. سارة أحمد',
      jobTitle: 'مديرة الشؤون الأكاديمية',
      group: 'القيادة',
      bio: 'تقود تطوير البرامج الأكاديمية وتجربة الطلبة.',
    },
    en: {
      name: 'Dr. Sara Ahmed',
      jobTitle: 'Director of Academic Affairs',
      group: 'Leadership',
      bio: 'Leads academic program development and the student experience.',
    },
  },
] as const
