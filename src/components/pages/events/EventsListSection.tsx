'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { EventCard } from '@/components/cards/EventCard'
import { Pagination } from '@/components/Pagination'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicEventItem } from '@/lib/payload/get-public-events'
import type { Locale } from '@/i18n/locale'

export interface EventsListSectionProps {
  /** Future events (soonest first) — shown in their own section above the list. */
  upcomingEvents?: PublicEventItem[]
  /** Past events (most recent first) — the paginated main list. */
  events: PublicEventItem[]
  totalPages: number
  currentPage: number
  locale: Locale
}

export function EventsListSection({
  upcomingEvents = [],
  events,
  totalPages,
  currentPage,
  locale,
}: EventsListSectionProps) {
  const isAr = locale === 'ar'

  // Unique categories from the data
  const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean)))
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered =
    activeCategory === 'all' ? events : events.filter((e) => e.category === activeCategory)

  return (
    <Container className="py-14">
      {/* Upcoming events — lead the page so future events aren't buried
          under the most recent past ones */}
      {upcomingEvents.length > 0 && (
        <div className="mb-14">
          <h2 className="mb-6 text-2xl font-bold">
            {isAr ? 'الفعاليات القادمة' : 'Upcoming Events'}
          </h2>
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            variants={animationPresets.stagger}
          >
            {upcomingEvents.map((event) => (
              <motion.div key={event.id} variants={animationPresets.staggerItem} className="h-full">
                <EventCard event={event} locale={locale} />
              </motion.div>
            ))}
          </motion.div>
          <h2 className="mt-14 text-2xl font-bold">{isAr ? 'فعاليات سابقة' : 'Past Events'}</h2>
        </div>
      )}

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={[
              'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
              activeCategory === 'all'
                ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                : 'border-border/60 text-muted-foreground hover:border-secondary/50 hover:text-foreground',
            ].join(' ')}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
                activeCategory === cat
                  ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                  : 'border-border/60 text-muted-foreground hover:border-secondary/50 hover:text-foreground',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <CalendarRange className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">{isAr ? 'لا توجد فعاليات' : 'No Events'}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isAr
              ? 'لا توجد فعاليات متاحة حالياً في هذا التصنيف. تابعنا قريباً.'
              : 'No events are available in this category right now. Check back soon.'}
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            variants={animationPresets.stagger}
          >
            {filtered.map((event) => (
              <motion.div key={event.id} variants={animationPresets.staggerItem} className="h-full">
                <EventCard event={event} locale={locale} />
              </motion.div>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <div className="mt-12 overflow-x-auto pb-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/events"
                locale={locale}
                className="min-w-max justify-start px-1 sm:justify-center"
              />
            </div>
          )}
        </>
      )}
    </Container>
  )
}
