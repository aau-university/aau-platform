'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Newspaper, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { NewsCard } from '@/components/cards/NewsCard'
import type { HomeFallbackNewsItem } from '@/lib/fallback/home-fallback-data'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface NewsGridSectionProps {
  news: HomeFallbackNewsItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

/**
 * NewsGrid — Client UI section displaying news cards in a responsive grid.
 *
 * Issue #13 — the grid now uses `sm:grid-cols-2 lg:grid-cols-3` to match
 * the other grid sections on the site (was `md:grid-cols-2` which made
 * news cards visually inconsistent). The `slice(0, 4)` was also removed
 * — the block loader already controls how many items to fetch via
 * `maxItems` (1–8); slicing again here silently dropped items the editor
 * explicitly configured.
 */
export function NewsGridSection({
  news,
  sectionContent,
  disableInnerContainer = false,
}: NewsGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (news.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'الأخبار' : 'News')
  const description =
    sectionContent?.description ||
    (isAr ? 'تابع آخر أخبار الجامعة ومستجداتها' : 'Follow the latest university news and updates')

  return (
    <section id="news" className="py-16 md:py-20 bg-background">
      <Wrapper>
        <SectionHeader
          icon={Newspaper}
          badge={isAr ? 'آخر المستجدات' : 'Latest Updates'}
          title={title}
          description={description}
        />

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {news.map((item) => (
            <motion.div
              key={item.id}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <NewsCard news={item} isAr={isAr} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-10 md:mt-12"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.fadeUp}
        >
          <Link href="/news">
            <Button size="lg" className="group">
              {isAr ? 'عرض جميع الأخبار' : 'View All News'}
              <Arrow className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </Wrapper>
    </section>
  )
}
