'use client'

import { motion } from 'framer-motion'
import { Newspaper } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { NewsCard } from '@/components/cards/NewsCard'
import { Pagination } from '@/components/Pagination'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicNewsItem } from '@/lib/payload/get-public-news'
import type { Locale } from '@/i18n/locale'

export interface NewsListSectionProps {
  items: PublicNewsItem[]
  totalPages: number
  currentPage: number
  locale: Locale
}

/**
 * News list section (Issue #16).
 *
 * Extracted from `/news/page.tsx` so the page component stays minimal
 * (fetch + compose), matching the 4-layer hierarchy used by every other
 * list route (`/blog`, `/events`, ...). Mirrors the structure of
 * `BlogListSection`:
 *
 *   - `<Container>` wrapper
 *   - `<EmptyState>` fallback when the loader returns no items
 *   - `motion.div` grid with staggered reveal (`sm:grid-cols-2 lg:grid-cols-3`)
 *   - `<Pagination>` underneath
 *
 * Stays a Client Component because framer-motion `whileInView` requires it.
 * Data is fully resolved by the server before being handed in as props.
 */
export function NewsListSection({ items, totalPages, currentPage, locale }: NewsListSectionProps) {
  const isAr = locale === 'ar'

  return (
    <Container className="py-12">
      {items.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد أخبار' : 'No news yet'}
          message={
            isAr
              ? 'لا توجد أخبار متاحة حالياً. تابعنا قريباً.'
              : 'No news articles are available right now. Please check back soon.'
          }
          icon={<Newspaper className="h-16 w-16 text-muted-foreground" aria-hidden="true" />}
        />
      ) : (
        <motion.div
          className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {items.map((item) => (
            <motion.div key={item.id} variants={animationPresets.staggerItem} className="h-full">
              <NewsCard news={item} isAr={isAr} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="overflow-x-auto pb-2">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/news"
          locale={locale}
          className="min-w-max justify-start px-1 sm:justify-center"
        />
      </div>
    </Container>
  )
}
