import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicOffers } from '@/lib/payload/get-public-offers'
import { OffersGridSection } from '@/components/sections/OffersGrid'
import { OffersHero } from '@/components/pages/offers'
import { Container } from '@/components/ui/Container'
import { OffersListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'العروض والخصومات والفرص' : 'Offers & Discounts'
  const description = isAr
    ? 'استفد من الحسومات الحصرية والفرص الخاصة الممنوحة لمنتسبي وطلاب جامعة الجيل الجديد بالتعاون مع شركائنا.'
    : 'Take advantage of exclusive discounts and special opportunities provided to Al-Jeel Al-Jadeed University students in collaboration with our partners.'
  return { title, description, openGraph: { title, description } }
}

export default async function OffersListPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<OffersListSkeleton />}>
      <OffersListContent locale={locale} />
    </Suspense>
  )
}

async function OffersListContent({ locale }: { locale: Locale }) {
  const offers = await getPublicOffers({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background">
      {/* Extracted Hero Banner Section */}
      <OffersHero locale={locale} />

      {/* Main Grid Content */}
      <Container className="py-12 md:py-16">
        <OffersGridSection items={offers} disableInnerContainer />
      </Container>
    </div>
  )
}
