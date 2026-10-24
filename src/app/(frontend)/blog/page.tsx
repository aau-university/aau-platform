import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { ListSkeleton } from '@/components/common/ListSkeleton'
import { BlogHero, BlogListSection } from '@/components/pages/blog'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicBlogPostsPaged } from '@/lib/payload/get-public-blog-posts'

const PAGE_SIZE = 9

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'المدونة الأكاديمية' : 'Academic Blog'
  const description = isAr
    ? 'مقالات وأبحاث ونصائح أكاديمية من جامعة الجيل الجديد.'
    : 'Articles, research insights and academic tips from Al-Jeel Al-Jadeed University.'
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: '/blog' },
  }
}

type BlogListPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function BlogListPage({ searchParams }: BlogListPageProps) {
  const locale = await resolveLocale()
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)

  return (
    <>
      <BlogHero locale={locale} />
      <Suspense fallback={<ListSkeleton />}>
        <BlogListBody locale={locale} page={currentPage} />
      </Suspense>
    </>
  )
}

export async function BlogListBody({ locale, page }: { locale: Locale; page: number }) {
  const result = await getPublicBlogPostsPaged({ locale, limit: PAGE_SIZE, page })

  return (
    <BlogListSection
      posts={result.items}
      totalPages={result.totalPages}
      currentPage={result.page}
      locale={locale}
    />
  )
}
