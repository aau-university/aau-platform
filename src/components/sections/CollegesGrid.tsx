'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CollegeCard } from '@/components/cards/CollegeCard'
import type { HomeFallbackCollege } from '@/lib/fallback/home-fallback-data'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface CollegesGridSectionProps {
  colleges: HomeFallbackCollege[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function CollegesGridSection({
  colleges,
  sectionContent,
  disableInnerContainer = false,
}: CollegesGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (colleges.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'كلياتنا' : 'Our Colleges')
  const description =
    sectionContent?.description ||
    (isAr
      ? 'نقدم مجموعة متنوعة من البرامج الأكاديمية المتميزة في مختلف التخصصات'
      : 'We offer a diverse range of distinguished academic programmes in various specialisations')

  return (
    <section id="colleges" className="py-16 md:py-20 bg-background">
      <Wrapper>
        <SectionHeader
          icon={GraduationCap}
          badge={isAr ? 'التميز الأكاديمي' : 'Academic Excellence'}
          title={title}
          description={description}
        />

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {colleges.map((college) => (
            <motion.div
              key={college.id}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <CollegeCard college={college} isAr={isAr} />
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
          <Link href="/colleges">
            <Button variant="outline" size="lg" className="group">
              {isAr ? 'عرض جميع الكليات' : 'View All Colleges'}
              <Arrow className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </Wrapper>
    </section>
  )
}
