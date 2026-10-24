import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicResearchArticles } from '@/lib/payload/get-public-research'
import { ResearchGridSection } from '@/components/sections/ResearchGrid'
import { ResearchArticlesHero } from '@/components/pages/research-articles'
import { Container } from '@/components/ui/Container'
import { ArticlesListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'المقالات والأبحاث العلمية' : 'Scientific Articles'
  const description = isAr
    ? 'تصفح النتاجات العلمية والمقالات البحثية المحكمة لكادر جامعة الجيل الجديد.'
    : 'Browse peer-reviewed research publications and articles by AAU academic faculty.'
  return { title, description, openGraph: { title, description } }
}

export default async function ResearchArticlesListPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<ArticlesListSkeleton />}>
      <ResearchArticlesListContent locale={locale} />
    </Suspense>
  )
}

async function ResearchArticlesListContent({ locale }: { locale: Locale }) {
  const articles = await getPublicResearchArticles({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background">
      {/* Extracted Hero Banner Section */}
      <ResearchArticlesHero locale={locale} />

      {/* Main Grid Content */}
      <Container className="py-12 md:py-16">
        <ResearchGridSection items={articles} disableInnerContainer />
      </Container>
    </div>
  )
}
