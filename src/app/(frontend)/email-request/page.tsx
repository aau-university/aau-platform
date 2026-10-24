import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Mail } from 'lucide-react'

import { Breadcrumb } from '@/components/Breadcrumb'
import { Container } from '@/components/ui/Container'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicCollegesList } from '@/lib/payload/get-public-colleges'
import { getProgramOptionsByColleges } from '@/lib/payload/get-public-programs'

import {
  EmailRequestForm,
  type EmailRequestCollegeOption,
} from './EmailRequestForm.client'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'طلب بريد إلكتروني جامعي' : 'University Email Request'
  const description = isAr
    ? 'قدّم طلب الحصول على بريد إلكتروني جامعي أو خدمة مرتبطة به.'
    : 'Request a university email account or a related email service.'
  return { title, description, openGraph: { title, description } }
}

export default async function EmailRequestPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<EmailRequestSkeleton />}>
      <EmailRequestContent locale={locale} />
    </Suspense>
  )
}

async function EmailRequestContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const colleges = await getPublicCollegesList({ locale, limit: 50 })

  // One batched query fetches every college's program options at once
  // (replaces the per-college getCollegePrograms N+1 pattern).
  const programsByCollege = await getProgramOptionsByColleges(
    colleges.map((college) => college.id),
    locale,
  )
  const collegesWithOptions: EmailRequestCollegeOption[] = colleges.map((college) => ({
    id: typeof college.id === 'number' ? college.id : Number(college.id),
    slug: college.slug,
    name: college.name || '',
    programs: programsByCollege[String(college.id)] ?? [],
  }))

  const heading = isAr ? 'طلب بريد إلكتروني جامعي' : 'University Email Request'
  const description = isAr
    ? 'استخدم هذا النموذج لطلب بريد إلكتروني جامعي أو خدمة مرتبطة به. سيتم مراجعة طلبك من قبل شؤون الطلاب.'
    : 'Use this form to request a university email account or a related service. Your request will be reviewed by Student Affairs.'

  return (
    <div className="min-h-screen bg-background py-16">
      <Container>
        <Breadcrumb items={[{ label: heading }]} locale={locale} />

        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Mail className="h-4 w-4" />
            {isAr ? 'طلب بريد' : 'Email Request'}
          </div>
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl lg:text-6xl">
            {heading}
          </h1>
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-primary to-secondary" />
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <EmailRequestForm colleges={collegesWithOptions} locale={locale} />
      </Container>
    </div>
  )
}

function EmailRequestSkeleton() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 text-center">
          <div className="mx-auto mb-4 h-12 w-80 rounded-xl bg-muted" />
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-muted" />
        </div>
        <div className="mx-auto h-96 max-w-2xl rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
