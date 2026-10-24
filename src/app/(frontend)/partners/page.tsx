import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Handshake } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicPartners } from '@/lib/payload/get-public-partners'
import { PartnersGrid } from '@/components/sections/PartnersGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { PartnersHero } from '@/components/pages/partners'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'شركاؤنا' : 'Our Partners'
  const description = isAr
    ? 'نفخر بشراكاتنا مع الهيئات والمؤسسات المحلية والدولية الرائدة لتعزيز تدريب وتأهيل طلابنا.'
    : 'We are proud of our partnerships with leading local and international institutions.'
  return { title, description, openGraph: { title, description } }
}

export default async function PartnersPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<PartnersSkeleton />}>
      <PartnersContent locale={locale} />
    </Suspense>
  )
}

async function PartnersContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const partners = await getPublicPartners({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background">
      {/* Extracted Hero Banner Section */}
      <PartnersHero locale={locale} />

      {/* Partners Grid Section */}
      {partners.length === 0 ? (
        <Container className="py-16">
          <EmptyState
            title={isAr ? 'لا يوجد شركاء' : 'No partners available'}
            message={
              isAr ? 'لا يوجد شركاء منشورون حالياً.' : 'No published partners available right now.'
            }
            icon={<Handshake className="h-16 w-16 text-muted-foreground" />}
          />
        </Container>
      ) : (
        <PartnersGrid partners={partners} />
      )}
    </div>
  )
}

function PartnersSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 text-center">
          <Skeleton className="mx-auto mb-4 h-12 w-48 rounded-xl" />
          <Skeleton className="mx-auto mb-6 h-1 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
