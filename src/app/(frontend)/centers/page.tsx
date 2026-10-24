import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Building2 } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Container } from '@/components/ui/Container'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicCenters } from '@/lib/payload/get-public-centers'
import { CentersGridSection } from '@/components/sections/CentersGrid'
import { CentersHero } from '@/components/pages/centers'
import { CentersListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'المراكز والخدمات الجامعية' : 'University Centers & Services'
  return {
    title,
    openGraph: { title },
  }
}

export default async function CentersListPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<CentersListSkeleton />}>
      <CentersListContent locale={locale} />
    </Suspense>
  )
}

async function CentersListContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const centers = await getPublicCenters({ locale, limit: 30 })

  return (
    <div className="min-h-screen bg-background pb-16">
      <CentersHero locale={locale} />

      {centers.length === 0 ? (
        <Container className="py-16">
          <EmptyState
            title={isAr ? 'لا توجد مراكز' : 'No centers available'}
            message={
              isAr
                ? 'لا توجد مراكز أو خدمات منشورة حالياً. يرجى المحاولة لاحقاً.'
                : 'No published centers or services available right now.'
            }
            icon={<Building2 className="h-16 w-16 text-muted-foreground" />}
          />
        </Container>
      ) : (
        <CentersGridSection
          items={centers}
          disableInnerContainer={false}
        />
      )}
    </div>
  )
}


