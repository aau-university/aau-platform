import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { Container } from '@/components/ui/Container'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { CollegesListSkeleton } from './skeleton'
import { CollegesHero, CollegesList } from '@/components/pages/colleges'

export const metadata: Metadata = {
  title: 'كلياتنا | Our Colleges',
  description:
    'تعرف على كليات وبرامج جامعة الجيل الجديد - Discover Al-Jeel Al-Jadeed University Colleges and Programs',
}

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export default async function CollegesPage() {
  const locale = await resolveLocale()

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-8">
        <CollegesHero locale={locale} />

        <Suspense fallback={<CollegesListSkeleton />}>
          <CollegesList locale={locale} />
        </Suspense>
      </Container>
    </div>
  )
}
