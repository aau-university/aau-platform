import { published } from './content/shared'

export const collegeFixtures = [
  {
    admissionRequirements: {
      ar: 'شهادة الثانوية العامة الفرع العلمي بنسبة لا تقل عن 78%',
      en: 'High school certificate scientific branch with a minimum of 78%',
    },
    deanName: { ar: 'أ.د. أحمد محمود الحسن', en: 'Prof. Dr. Ahmed Mahmoud Al-Hasan' },
    description: {
      ar: 'كلية الطب البشري تقدم برنامجاً أكاديمياً متميزاً لإعداد أطباء مؤهلين لخدمة المجتمع',
      en: 'The College of Human Medicine offers an outstanding academic program to prepare qualified physicians to serve the community',
    },
    goals: {
      ar: 'إعداد أطباء مؤهلين علمياً وعملياً، تطوير مهارات التشخيص والعلاج، تعزيز البحث العلمي الطبي، وبناء شراكات مع المؤسسات الصحية.',
      en: 'Prepare scientifically and practically qualified physicians, develop diagnostic and treatment skills, promote medical research, and build partnerships with health institutions.',
    },
    icon: 'Stethoscope',
    ...published,
    mission: {
      ar: 'تقديم تعليم طبي رائد يفي بمسؤوليات الكلية الأكاديمية لتخريج طبيب قادر على التعلم المستمر.',
      en: 'Provide leading medical education to graduate physicians capable of continuous learning.',
    },
    name: { ar: 'كلية الطب البشري', en: 'College of Human Medicine' },
    quality: {
      ar: 'ضمان جودة التعليم الطبي وفق المعايير الدولية.',
      en: 'Ensuring medical education quality according to international standards.',
    },
    slug: 'medicine',
    strategy: {
      ar: 'اعتماد المناهج الحديثة في التعليم الطبي، وتطوير المهارات السريرية من خلال التدريب الميداني.',
      en: 'Adopting modern curricula in medical education and developing clinical skills through field training.',
    },
    values: {
      ar: 'الإنسانية، النزاهة العلمية، التميز السريري، المسؤولية المجتمعية.',
      en: 'Humanity, scientific integrity, clinical excellence, social responsibility.',
    },
    vision: {
      ar: 'نحو بيئة تعليمية طبية وبحثية رائدة تسهم في إثراء المعرفة وتقديم خدمة صحية مجتمعية متكاملة',
      en: 'Towards a leading educational and research medical environment that contributes to enriching knowledge and providing integrated community health services.',
    },
  },
  {
    admissionRequirements: {
      ar: 'شهادة الثانوية العامة الفرع العلمي',
      en: 'High school certificate scientific branch',
    },
    deanName: { ar: 'أ.د. سلمى خالد العمر', en: 'Prof. Dr. Salma Khaled Al-Omar' },
    description: {
      ar: 'كلية متخصصة في العلوم الطبية والصحية تقدم برامج متنوعة في مجالات الصحة المختلفة',
      en: 'A specialized college in medical and health sciences offering various programs in different health fields',
    },
    goals: {
      ar: 'إعداد كوادر صحية مؤهلة، تطوير برامج أكاديمية نوعية، تعزيز البحث العلمي، بناء شراكات مجتمعية.',
      en: 'Prepare qualified health cadres, develop quality academic programs, promote scientific research, build community partnerships.',
    },
    icon: 'Heart',
    ...published,
    mission: {
      ar: 'تأهيل كادر طبي وبحثي عالي التنافسية من خلال برامج أكاديمية تساهم في تنمية المجتمع.',
      en: 'Prepare highly competitive medical and research cadres through academic programs that contribute to community development.',
    },
    name: {
      ar: 'كلية العلوم الطبية والصحية',
      en: 'College of Medical and Health Sciences',
    },
    quality: {
      ar: 'متابعة مستمرة لجودة المخرجات التعليمية.',
      en: 'Continuous monitoring of educational output quality.',
    },
    slug: 'health-sciences',
    strategy: {
      ar: 'تطوير البرامج الأكاديمية بما يواكب التطورات في المجال الطبي والصحي.',
      en: 'Developing academic programs to keep pace with developments in the medical and health field.',
    },
    values: {
      ar: 'الجودة، الابتكار، المسؤولية، العمل بروح الفريق.',
      en: 'Quality, innovation, responsibility, teamwork.',
    },
    vision: {
      ar: 'ريادة وطنية وإقليمية متميزة في التعليم الطبي والبحث العلمي لخدمة المجتمع',
      en: 'National and regional leadership in medical education and scientific research to serve the community',
    },
  },
  {
    admissionRequirements: {
      ar: 'شهادة الثانوية العامة الفرع العلمي',
      en: 'High school certificate scientific branch',
    },
    deanName: { ar: 'أ.د. خالد عبدالله الحاج', en: 'Prof. Dr. Khaled Abdullah Al-Haj' },
    description: {
      ar: 'كلية رائدة في مجالات الهندسة والتكنولوجيا تقدم برامج حديثة تواكب سوق العمل',
      en: 'A leading college in engineering and technology fields offering modern programs that meet market demands',
    },
    goals: {
      ar: 'إعداد مهندسين تقنيين مبدعين، تطوير برامج تكنولوجية حديثة، تعزيز الابتكار وريادة الأعمال.',
      en: 'Prepare creative technical engineers, develop modern technology programs, promote innovation and entrepreneurship.',
    },
    icon: 'Cpu',
    ...published,
    mission: {
      ar: 'تقديم خدمة تعليمية وبحثية متميزة في العلوم الهندسية والتكنولوجيا.',
      en: 'Provide distinguished educational and research services in engineering and technology.',
    },
    name: {
      ar: 'كلية الهندسة وتكنولوجيا المعلومات',
      en: 'College of Engineering and Information Technology',
    },
    quality: {
      ar: 'اعتماد معايير الجودة الأكاديمية في البرامج الهندسية.',
      en: 'Adopting academic quality standards in engineering programs.',
    },
    slug: 'engineering-it',
    strategy: {
      ar: 'مواكبة التطورات التكنولوجية السريعة وربط التعليم باحتياجات سوق العمل.',
      en: 'Keeping pace with rapid technological developments and linking education to labor market needs.',
    },
    values: {
      ar: 'الابتكار، الإتقان، العمل الجماعي، المسؤولية المهنية.',
      en: 'Innovation, mastery, teamwork, professional responsibility.',
    },
    vision: {
      ar: 'الريادة محلياً والتميز إقليمياً في العلوم الهندسية والتكنولوجيا',
      en: 'Local leadership and regional excellence in engineering sciences and technology',
    },
  },
  {
    admissionRequirements: {
      ar: 'شهادة الثانوية العامة الفرع العلمي أو الأدبي',
      en: 'High school certificate scientific or literary branch',
    },
    deanName: {
      ar: 'أ.د. محمد سعيد الشرعبي',
      en: 'Prof. Dr. Mohammed Saeed Al-Sharabi',
    },
    description: {
      ar: 'كلية تقدم برامج متنوعة في مجالات الإدارة والعلوم الإنسانية',
      en: 'A college offering diverse programs in management and humanities fields',
    },
    goals: {
      ar: 'تخريج قادة إداريين، تطوير برامج إدارية حديثة، تعزيز البحث في العلوم الإنسانية.',
      en: 'Graduate administrative leaders, develop modern management programs, promote research in humanities.',
    },
    icon: 'Briefcase',
    ...published,
    mission: {
      ar: 'إعداد كوادر قيادية وإدارية ذات كفاءة عالية تخدم المجتمع وسوق العمل.',
      en: 'Prepare high-competency leadership and management cadres for society and labor market.',
    },
    name: {
      ar: 'كلية العلوم الإدارية والإنسانية',
      en: 'College of Administrative and Human Sciences',
    },
    quality: {
      ar: 'ضمان جودة البرامج وفق المعايير الأكاديمية.',
      en: 'Ensuring program quality according to academic standards.',
    },
    slug: 'business-humanities',
    strategy: {
      ar: 'ربط البرامج الأكاديمية بالواقع العملي للسوق.',
      en: 'Linking academic programs to the practical reality of the market.',
    },
    values: {
      ar: 'القيادة، النزاهة، التطوير المستمر، خدمة المجتمع.',
      en: 'Leadership, integrity, continuous development, community service.',
    },
    vision: {
      ar: 'التميز في العلوم الإدارية والإنسانية وخدمة المجتمع',
      en: 'Excellence in administrative and humanities sciences and community service',
    },
  },
] as const
