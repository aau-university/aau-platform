import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { ListSkeleton } from '@/components/common/ListSkeleton'
import { EventsHero, EventsListSection } from '@/components/pages/events'

import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicEvents, getPublicEventsPaged } from '@/lib/payload/get-public-events'

const PAGE_SIZE = 9

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'الفعاليات والأنشطة' : 'Events & Activities'
  const description = isAr
    ? 'تابع أحدث الفعاليات والأنشطة في جامعة الجيل الجديد وشارك في تجارب مميزة.'
    : 'Stay updated with the latest events and activities at Al-Jeel Al-Jadeed University.'
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: '/events' },
  }
}

type EventsListPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function EventsListPage({ searchParams }: EventsListPageProps) {
  const locale = await resolveLocale()
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)

  return (
    <>
      <EventsHero locale={locale} />
      <Suspense fallback={<ListSkeleton />}>
        <EventsListBody locale={locale} page={currentPage} />
      </Suspense>
    </>
  )
}

async function EventsListBody({ locale, page }: { locale: Locale; page: number }) {
  // Upcoming events lead the page (soonest first, page 1 only); past
  // events are the paginated list below — mixing them buried upcoming
  // events under the most recent past ones.
  const [upcoming, { events: past, totalPages }] = await Promise.all([
    page === 1
      ? getPublicEvents({ locale, timeframe: 'upcoming', limit: 12 })
      : Promise.resolve([]),
    getPublicEventsPaged({
      locale,
      timeframe: 'past',
      limit: PAGE_SIZE,
      page,
    }),
  ])

  return (
    <EventsListSection
      upcomingEvents={upcoming}
      events={past}
      totalPages={totalPages}
      currentPage={page}
      locale={locale}
    />
  )
}
