import { teamMemberFixtures } from '../content/team-members'
import { richText } from '../../lib/rich-text'
import type { LocalizedGlobalFixture } from './types'

const president = teamMemberFixtures[0]

export const aboutPageFixture = {
  shared: {
    teamMembers: [],
  },
  ar: {
    header: {
      badge: 'من نحن',
      title: 'عن الجامعة',
      description: 'جامعة تطبيقية رائدة في خدمة المجتمع وتطوير المعرفة.',
    },
    intro: {
      body: richText(
        'تأسست الجامعة لتقديم تعليم تطبيقي عالي الجودة يربط بين المعرفة النظرية ومتطلبات سوق العمل.',
        'ar',
      ),
    },
    vision: {
      title: 'الرؤية',
      description: richText(
        'أن نكون جامعة رائدة في التعليم التطبيقي والبحث العلمي على المستوى الإقليمي.',
        'ar',
      ),
    },
    mission: {
      title: 'الرسالة',
      description: richText(
        'تقديم تعليم متميز يخدم المجتمع ويصقل الكفاءات لمواكبة التحديات المستقبلية.',
        'ar',
      ),
    },
    goals: {
      title: 'الأهداف',
      description: richText(
        'تطوير البرامج الأكاديمية، تعزيز البحث العلمي، بناء شراكات مجتمعية، وتأهيل خريجين مبدعين.',
        'ar',
      ),
    },
    values: {
      title: 'القيم',
      description: richText('النزاهة، الجودة، الابتكار، الانتماء، والعمل بروح الفريق.', 'ar'),
    },
    president: {
      sectionTitle: 'كلمة رئيس الجامعة',
      messageIntro: richText('يسعدني أن أرحب بكم في موقع جامعتنا الإلكتروني.', 'ar'),
      messageBody: richText(
        'جامعتنا تلتزم بتقديم تعليم تطبيقي نوعي يمزج بين الأصالة والمعاصرة.',
        'ar',
      ),
      messageClosing: richText(
        'نتطلع لاستقبالكم في حرم الجامعة وبناء مستقبل أفضل معاً.',
        'ar',
      ),
      name: president.ar.name,
      role: president.ar.jobTitle,
    },
    teamSection: {
      sectionTitle: 'فريق العمل',
      sectionDescription: 'تعرّف على فريق العمل في جامعتنا',
    },
  },
  en: {
    header: {
      badge: 'About Us',
      title: 'About the University',
      description: 'A leading applied university serving the community and developing knowledge.',
    },
    intro: {
      body: richText(
        'The university was established to provide high-quality applied education linking theoretical knowledge with labor market requirements.',
        'en',
      ),
    },
    vision: {
      title: 'Vision',
      description: richText(
        'To be a leading university in applied education and scientific research at the regional level.',
        'en',
      ),
    },
    mission: {
      title: 'Mission',
      description: richText(
        'Providing distinguished education that serves the community and hones competencies to meet future challenges.',
        'en',
      ),
    },
    goals: {
      title: 'Goals',
      description: richText(
        'Developing academic programs, promoting scientific research, building community partnerships, and qualifying creative graduates.',
        'en',
      ),
    },
    values: {
      title: 'Values',
      description: richText('Integrity, quality, innovation, belonging, and teamwork.', 'en'),
    },
    president: {
      sectionTitle: "President's Message",
      messageIntro: richText('I am pleased to welcome you to our university website.', 'en'),
      messageBody: richText(
        'Our university is committed to providing quality applied education that blends authenticity with modernity.',
        'en',
      ),
      messageClosing: richText(
        'We look forward to welcoming you on campus and building a better future together.',
        'en',
      ),
      name: president.en.name,
      role: president.en.jobTitle,
    },
    teamSection: {
      sectionTitle: 'Our Team',
      sectionDescription: 'Meet our university team',
    },
  },
  resolve: {
    teamMemberSlugs: teamMemberFixtures.map(({ slug }) => slug),
  },
} as const satisfies LocalizedGlobalFixture<
  'about-page',
  { teamMemberSlugs: ReadonlyArray<string> }
>
