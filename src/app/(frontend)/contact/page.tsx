import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { MessageCircle } from 'lucide-react'

import { Breadcrumb } from '@/components/Breadcrumb'
import { Container } from '@/components/ui/Container'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from '@/lib/payload/safe-payload'
import { getPublicContactSettings } from '@/lib/payload/get-public-contact-settings'
import type { ContactSetting } from '@/payload-types'

import { ContactForm, type ContactFormLabels, type ContactInfo } from './ContactForm.client'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'تواصل معنا' : 'Contact Us'
  const description = isAr
    ? 'تواصل مع جامعة الجيل الجديد للاستفسار عن القبول، البرامج الأكاديمية، والخدمات الطلابية.'
    : 'Get in touch with Al-Jeel Al-Jadeed University about admissions, academic programmes, and student services.'
  return { title, description, openGraph: { title, description } }
}

export default async function ContactPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<ContactSkeleton />}>
      <ContactContent locale={locale} />
    </Suspense>
  )
}

/**
 * Fetches the raw `contact-settings` global and the merged public site
 * settings (phone/email/address) so the page header + form labels +
 * contact-info panel can render. Both reads are cached via 'use cache'
 * upstream — this function only composes the results.
 *
 * Returns `null` for the raw global when Payload is unreachable; the
 * client form falls back to bilingual defaults in that case.
 */
async function fetchContactData(locale: Locale): Promise<{
  settings: ContactSetting | null
  info: ContactInfo
}> {
  const siteSettings = await getPublicContactSettings(locale)
  const info: ContactInfo = {
    phone: siteSettings.contactPhone,
    email: siteSettings.contactEmail,
    address: siteSettings.address,
  }

  try {
    const payload = await getPayloadSafe()
    if (!payload) return { settings: null, info }

    const raw = (await payload.findGlobal({
      slug: 'contact-settings',
      locale,
      overrideAccess: false,
      depth: 0,
    })) as ContactSetting
    return { settings: raw, info }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return { settings: null, info }
  }
}

async function ContactContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const { settings, info } = await fetchContactData(locale)

  const page = settings?.page
  const formLabels = settings?.formLabels

  const labels: ContactFormLabels = {
    name: formLabels?.nameLabel ?? (isAr ? 'الاسم' : 'Name'),
    namePlaceholder:
      formLabels?.namePlaceholder ?? (isAr ? 'أدخل اسمك' : 'Enter your name'),
    email: formLabels?.emailLabel ?? (isAr ? 'البريد الإلكتروني' : 'Email'),
    emailPlaceholder:
      formLabels?.emailPlaceholder ??
      (isAr ? 'أدخل بريدك الإلكتروني' : 'Enter your email'),
    phone: isAr ? 'الهاتف' : 'Phone',
    phonePlaceholder: isAr ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)',
    subject: formLabels?.subjectLabel ?? (isAr ? 'الموضوع' : 'Subject'),
    subjectPlaceholder:
      formLabels?.subjectPlaceholder ??
      (isAr ? 'أدخل موضوع الرسالة' : 'Enter message subject'),
    message: formLabels?.messageLabel ?? (isAr ? 'الرسالة' : 'Message'),
    messagePlaceholder:
      formLabels?.messagePlaceholder ??
      (isAr ? 'اكتب رسالتك هنا' : 'Write your message here'),
    submit: formLabels?.submitText ?? (isAr ? 'إرسال الرسالة' : 'Send Message'),
  }

  const header = {
    badge: page?.badge ?? (isAr ? 'تواصل معنا' : 'Contact Us'),
    title:
      page?.title ??
      (isAr ? 'نحن هنا للإجابة على استفساراتكم' : 'We Are Here to Answer Your Questions'),
    description:
      page?.description ??
      (isAr
        ? 'تواصل معنا للأسئلة، الاستفسارات، أو الدعم — وسنرد عليك في أقرب وقت ممكن.'
        : 'Reach out with any questions, queries, or for support — we will get back to you as soon as possible.'),
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <Container>
        <Breadcrumb items={[{ label: header.badge }]} locale={locale} />

        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <MessageCircle className="h-4 w-4" />
            {header.badge}
          </div>
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl lg:text-6xl">
            {header.title}
          </h1>
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-primary to-secondary" />
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {header.description}
          </p>
        </div>

        <ContactForm labels={labels} info={info} locale={locale} />
      </Container>
    </div>
  )
}

function ContactSkeleton() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 text-center">
          <div className="mx-auto mb-4 h-6 w-32 rounded-full bg-muted" />
          <div className="mx-auto mb-4 h-12 w-full max-w-96 rounded-xl bg-muted" />
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-muted" />
          <div className="mx-auto h-6 w-2/3 rounded-md bg-muted" />
        </div>
        <div className="mx-auto h-96 max-w-2xl rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
