import type { LocalizedGlobalFixture } from './types'

export const contactSettingsFixture = {
  shared: {},
  ar: {
    page: {
      badge: 'تواصل معنا',
      title: 'نحن هنا للإجابة على استفساراتكم',
      description: 'تواصل معنا للاستفسار عن القبول والبرامج الأكاديمية والخدمات الطلابية.',
    },
    formLabels: {
      nameLabel: 'الاسم الكامل',
      namePlaceholder: 'أدخل اسمك الكامل',
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      subjectLabel: 'الموضوع',
      subjectPlaceholder: 'أدخل موضوع الرسالة',
      messageLabel: 'الرسالة',
      messagePlaceholder: 'اكتب رسالتك',
      submitText: 'إرسال الرسالة',
    },
  },
  en: {
    page: {
      badge: 'Contact Us',
      title: 'We Are Here to Answer Your Questions',
      description:
        'Contact us for inquiries about admission, academic programs, and student services.',
    },
    formLabels: {
      nameLabel: 'Full Name',
      namePlaceholder: 'Enter your full name',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email address',
      subjectLabel: 'Subject',
      subjectPlaceholder: 'Enter the message subject',
      messageLabel: 'Message',
      messagePlaceholder: 'Write your message',
      submitText: 'Send Message',
    },
  },
} as const satisfies LocalizedGlobalFixture<'contact-settings'>
