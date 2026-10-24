import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicFacultyList } from '@/lib/payload/get-public-faculty'
import { FacultyHero } from '@/components/pages/faculty'
import { FacultyGridSection } from '@/components/sections/FacultyGrid'
import { FacultyListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'الكادر التعليمي' : 'Faculty'
  const description = isAr
    ? 'نخبة من الأساتذة والدكاترة المتميزين في جامعة الجيل الجديد.'
    : 'Distinguished faculty members at Al-Jeel Al-Jadeed University.'
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: '/faculty' },
  }
}

export default async function FacultyPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<FacultyListSkeleton />}>
      <FacultyListContent locale={locale} />
    </Suspense>
  )
}

async function FacultyListContent({ locale }: { locale: Locale }) {
  const members = await getPublicFacultyList({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background pb-12">
      <FacultyHero locale={locale} />
      <FacultyGridSection members={members} disableInnerContainer={false} />
    </div>
  )
}

