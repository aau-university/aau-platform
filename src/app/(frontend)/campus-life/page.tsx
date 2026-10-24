import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicCampusLife } from '@/lib/payload/get-public-campus-life'
import { CampusLifeHero } from '@/components/pages/campus-life'
import { CampusLifeGridSection } from '@/components/sections/CampusLifeGrid'
import { CampusLifeListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'الحياة الجامعية' : 'Campus Life'
  const description = isAr
    ? 'استكشف الحياة الجامعية النابضة بالحيوية والمرافق الحديثة في جامعة الجيل الجديد'
    : 'Explore vibrant campus life and modern facilities at Al-Jeel Al-Jadid University'
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function CampusLifeListPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<CampusLifeListSkeleton />}>
      <CampusLifeListContent locale={locale} />
    </Suspense>
  )
}

async function CampusLifeListContent({ locale }: { locale: Locale }) {
  const items = await getPublicCampusLife({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background pb-12">
      <CampusLifeHero locale={locale} />
      <CampusLifeGridSection items={items} disableInnerContainer={false} />
    </div>
  )
}

