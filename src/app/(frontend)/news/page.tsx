import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { ListSkeleton } from '@/components/common/ListSkeleton'
import { NewsHero, NewsListSection } from '@/components/pages/news'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicNewsList } from '@/lib/payload/get-public-news'

const PAGE_SIZE = 9

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'الأخبار' : 'News'
  const description = isAr
    ? 'آخر أخبار وإعلانات جامعة الجيل الجديد.'
    : 'Latest news and announcements from Al-Jeel Al-Jadeed University.'
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: '/news' },
  }
}

type NewsListPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function NewsListPage({
  searchParams,
}: NewsListPageProps) {
  const locale = await resolveLocale()
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)

  return (
    <div className="min-h-screen bg-background">
      <NewsHero locale={locale} />
      <Suspense fallback={<ListSkeleton />}>
        <NewsListBody locale={locale} page={currentPage} />
      </Suspense>
    </div>
  )
}

async function NewsListBody({
  locale,
  page,
}: {
  locale: Locale
  page: number
}) {
  const { items: news, totalPages } = await getPublicNewsList({
    locale,
    page,
    limit: PAGE_SIZE,
  })

  return (
    <NewsListSection
      items={news}
      totalPages={totalPages}
      currentPage={page}
      locale={locale}
    />
  )
}
