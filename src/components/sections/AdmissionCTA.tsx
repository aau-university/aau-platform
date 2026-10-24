'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PageLayoutBlock } from '@/blocks/types'

type AdmissionCTABlock = Extract<PageLayoutBlock, { blockType: 'admissionCTA' }>

export interface AdmissionCTASectionProps {
  content?: AdmissionCTABlock
  disableInnerContainer?: boolean
}

const DEFAULTS_AR = {
  badge: 'القبول والتسجيل',
  heading: 'انضم إلى مجتمع الأكاديمية',
  description:
    'نقدم برامج أكاديمية متميزة تؤهلك لسوق العمل وتمنحك فرصة بناء مستقبل مشرق.',
  buttonLabel: 'سجّل الآن',
  buttonHref: '/admission',
}

const DEFAULTS_EN = {
  badge: 'Admissions',
  heading: 'Join the Academy Community',
  description:
    'We offer distinguished academic programmes that prepare you for the job market and help you build a bright future.',
  buttonLabel: 'Register Now',
  buttonHref: '/admission',
}

export function AdmissionCTASection({
  content,
  disableInnerContainer = false,
}: AdmissionCTASectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Wrapper = disableInnerContainer ? Fragment : Container

  const defaults = isAr ? DEFAULTS_AR : DEFAULTS_EN
  const badge = content?.badge ?? defaults.badge
  const heading = content?.heading ?? defaults.heading
  const description = content?.description ?? defaults.description
  const buttonLabel = content?.buttonLabel ?? defaults.buttonLabel
  const buttonHref = content?.buttonHref ?? defaults.buttonHref

  return (
    <section
      id="admission-cta"
      data-block="home-admission-cta"
      className="py-20 md:py-28 bg-gradient-to-br from-secondary via-yellow-500 to-yellow-600 text-primary relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
      <Wrapper>
        <motion.div
          className="relative z-10 max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.fadeUp}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary px-5 py-2.5 rounded-full text-sm font-bold mb-8 shadow-sm border border-primary/10">
            <GraduationCap className="w-5 h-5" />
            {badge}
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6 drop-shadow-sm leading-tight">
            {heading}
          </h2>
          <p className="text-lg sm:text-xl font-medium opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
          <Link href={buttonHref}>
            <Button
              size="lg"
              className="group bg-primary text-secondary hover:bg-primary/90 text-lg px-10 py-7 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              {buttonLabel}
              <Arrow className="w-6 h-6 rtl:mr-3 ltr:ml-3 transition-transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2" />
            </Button>
          </Link>
        </motion.div>
      </Wrapper>
    </section>
  )
}
