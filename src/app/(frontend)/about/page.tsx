import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPublicAboutPage } from '@/lib/payload/get-public-about-page'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { cookies } from 'next/headers'
import { AboutPageClient } from './page.client'
import { AboutPageSkeleton } from './skeleton'
import { generateMeta } from '@/utilities/generateMeta'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const aboutPage = await getPublicAboutPage({ locale })

  // The Payload global slug differs from its public route.
  return generateMeta({
    doc: aboutPage
      ? {
          title: aboutPage.header?.title ?? undefined,
          path: '/about',
        }
      : { path: '/about' },
    globalSlug: 'about-page',
  })
}

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export default async function AboutPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<AboutPageSkeleton />}>
      <AboutPageContent locale={locale} />
    </Suspense>
  )
}

async function AboutPageContent({ locale }: { locale: Locale }) {
  const aboutPage = await getPublicAboutPage({ locale })
  // The public loader returns null in development/test when Payload is unavailable.
  // A stable empty state is more accurate than leaving a loading skeleton on screen.
  if (!aboutPage) return <AboutPageUnavailable locale={locale} />
  return <AboutPageClient aboutPage={aboutPage} />
}

function AboutPageUnavailable({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'

  return (
    <section id="main-content" className="min-h-[60vh] bg-background py-20 sm:py-24">
      <div className="container mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="mb-3 text-sm font-semibold text-secondary">
          {isAr ? 'عن الجامعة' : 'About'}
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          {isAr ? 'المحتوى غير متاح حالياً' : 'Content is currently unavailable'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {isAr
            ? 'تعذر تحميل محتوى هذه الصفحة في الوقت الحالي.'
            : 'The content for this page could not be loaded at this time.'}
        </p>
      </div>
    </section>
  )
}
