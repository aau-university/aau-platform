import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { JournalHero, JournalHighlights } from '@/components/pages/research-journal'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'المجلة العلمية | جامعة الجيل الجديد' : 'Scientific Journal | AAU'
  const description = isAr
    ? 'مجلة علمية محكمة لأبحاث وأوراق عمل الكوادر الأكاديمية في جامعة الجيل الجديد'
    : 'AAU Scientific Journal — a peer-reviewed platform for distinguished academic research across multiple disciplines.'
  return { title, description, openGraph: { title, description } }
}

export default async function JournalPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalContent locale={locale} />
    </Suspense>
  )
}

async function JournalContent({ locale }: { locale: Locale }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Extracted Hero Banner Section */}
      <JournalHero locale={locale} />

      {/* Extracted Highlights Grid */}
      <JournalHighlights locale={locale} />
    </div>
  )
}

function JournalSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-16">
      <div className="container mx-auto px-4">
        <Skeleton className="mb-4 h-4 w-full max-w-32 rounded-full" />
        <Skeleton className="mb-6 h-12 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-6 w-full max-w-xl rounded-md" />
      </div>
    </div>
  )
}
