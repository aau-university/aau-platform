'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EventCard } from '@/components/cards/EventCard'
import type { PublicEventItem } from '@/lib/payload/get-public-events'
import type { HomeSectionText } from '@/lib/payload/get-home-data'
import type { Locale } from '@/i18n/locale'

export interface EventsGridSectionProps {
  events: PublicEventItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function EventsGridSection({
  events,
  sectionContent,
  disableInnerContainer = false,
}: EventsGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const locale = language as Locale
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (events.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'الفعاليات' : 'Events')
  const description = sectionContent?.description || ''

  return (
    <section id="events" className="py-16 md:py-20 bg-muted/30">
      <Wrapper>
        <SectionHeader
          icon={CalendarDays}
          badge={isAr ? 'الفعاليات القادمة' : 'Upcoming Events'}
          title={title}
          description={description || undefined}
        />

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {events.map((event) => (
            <motion.div
              key={event.id}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <EventCard event={event} locale={locale} />
            </motion.div>
          ))}
        </motion.div>
      </Wrapper>
    </section>
  )
}
