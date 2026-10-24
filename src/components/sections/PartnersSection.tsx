'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PartnerCard, type PartnerCardItem } from '@/components/cards/PartnerCard'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export type InlinePartner = Pick<PartnerCardItem, 'id' | 'name' | 'logo' | 'website'>

export interface PartnersSectionProps {
  partners: InlinePartner[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function PartnersSection({
  partners,
  sectionContent,
  disableInnerContainer = false,
}: PartnersSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (!partners || partners.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'شركاؤنا' : 'Our Partners')
  const description = sectionContent?.description || ''

  return (
    <section id="partners" className="py-16 md:py-20 bg-muted/30">
      <Wrapper>
        <SectionHeader
          icon={Handshake}
          badge={isAr ? 'شراكاتنا' : 'Partnerships'}
          title={title}
          description={description || undefined}
        />

        <motion.div
          className="flex flex-wrap justify-center gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {partners.map((partner, i) => (
            <motion.div key={partner.id ?? i} variants={animationPresets.staggerItem}>
              <PartnerCard partner={partner} />
            </motion.div>
          ))}
        </motion.div>
      </Wrapper>
    </section>
  )
}
