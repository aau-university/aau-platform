'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProgramCard } from '@/components/cards/ProgramCard'
import { useLanguage } from '@/i18n/LanguageProvider'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicProgramItem } from '@/lib/payload/get-public-programs'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface ProgramsGridSectionProps {
  items: PublicProgramItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function ProgramsGridSection({
  items,
  sectionContent,
  disableInnerContainer = false,
}: ProgramsGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const title =
    sectionContent?.title || (isAr ? 'البرامج الأكاديمية' : 'Academic Programs')
  const description = sectionContent?.description

  const Wrapper = disableInnerContainer ? Fragment : Container

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader
        icon={GraduationCap}
        badge={isAr ? 'برامجنا' : 'Our Programs'}
        title={title}
        description={description || undefined}
      />

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {isAr
              ? 'لا توجد برامج لعرضها حالياً.'
              : 'No programs found to display.'}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {items.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <ProgramCard program={item} isAr={isAr} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-background">
      <Wrapper>{inner}</Wrapper>
    </section>
  )
}

export default ProgramsGridSection
