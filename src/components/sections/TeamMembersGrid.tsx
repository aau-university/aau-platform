'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TeamMemberCard } from '@/components/cards/TeamMemberCard'
import type { PublicTeamMemberItem } from '@/lib/payload/get-public-team-members'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface TeamMembersGridSectionProps {
  members: PublicTeamMemberItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function TeamMembersGridSection({
  members,
  sectionContent,
  disableInnerContainer = false,
}: TeamMembersGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (members.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'فريق العمل' : 'Our Team')
  const description = sectionContent?.description || ''

  return (
    <section id="team" className="py-16 md:py-20 bg-background">
      <Wrapper>
        <SectionHeader
          icon={Users}
          badge={isAr ? 'فريقنا' : 'Our Team'}
          title={title}
          description={description || undefined}
        />

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {members.map((member) => (
            <motion.div
              key={member.id}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <TeamMemberCard member={member} />
            </motion.div>
          ))}
        </motion.div>
      </Wrapper>
    </section>
  )
}
