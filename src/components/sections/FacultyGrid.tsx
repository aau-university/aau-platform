'use client'

import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { FacultyCard } from '@/components/cards/FacultyCard'
import { useLanguage } from '@/i18n/LanguageProvider'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { FacultyMember, College } from '@/payload-types'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface FacultyGridSectionProps {
  members: FacultyMember[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

/**
 * Type guard for the populated-college branch of `FacultyMember['college']`.
 * Payload's Local API returns either a raw ID (string/number) or a fully
 * populated doc; this narrows to the populated case so we can read
 * `.id` / `.name` without an `as College` cast (Issue #20).
 */
function isPopulatedCollege(value: FacultyMember['college']): value is College {
  return typeof value === 'object' && value !== null
}

export function FacultyGridSection({
  members,
  sectionContent,
  disableInnerContainer = false,
}: FacultyGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [activeCollegeId, setActiveCollegeId] = useState<string>('all')

  const title = sectionContent?.title || (isAr ? 'أعضاء هيئة التدريس' : 'Faculty Members')
  const description = sectionContent?.description

  // Extract unique colleges from the members
  const collegesMap = new Map<string, { id: string; name: string }>()
  members.forEach((m) => {
    if (isPopulatedCollege(m.college)) {
      collegesMap.set(String(m.college.id), {
        id: String(m.college.id),
        name: m.college.name,
      })
    }
  })
  const uniqueColleges = Array.from(collegesMap.values())

  const filteredMembers = activeCollegeId === 'all'
    ? members
    : members.filter((m) => {
        if (!isPopulatedCollege(m.college)) return false
        return String(m.college.id) === activeCollegeId
      })

  const Wrapper = disableInnerContainer ? Fragment : Container

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader
        icon={GraduationCap}
        badge={isAr ? 'الكادر التعليمي' : 'Faculty'}
        title={title}
        description={description || undefined}
      />

      {/* College Filter Tabs */}
      {members.length > 0 && uniqueColleges.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setActiveCollegeId('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-all duration-300 cursor-pointer ${
              activeCollegeId === 'all'
                ? 'bg-secondary border-secondary text-secondary-foreground shadow-gold'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          
          {uniqueColleges.map((col) => {
            const isActive = activeCollegeId === col.id
            return (
              <button
                key={col.id}
                onClick={() => setActiveCollegeId(col.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-secondary border-secondary text-secondary-foreground shadow-gold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                {col.name}
              </button>
            )
          })}
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {isAr ? 'لا يوجد أعضاء هيئة تدريس لعرضهم حالياً.' : 'No faculty members found to display.'}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {filteredMembers.map((member, idx) => (
            <motion.div
              key={member.id || idx}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <FacultyCard member={member} isAr={isAr} />
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

export default FacultyGridSection
