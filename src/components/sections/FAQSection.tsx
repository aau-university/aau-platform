'use client'

import { Fragment, useId, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HelpCircle, ChevronDown } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { PublicFAQItem } from '@/lib/payload/get-public-faqs'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface FAQSectionProps {
  faqs: PublicFAQItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

function FAQItem({ faq }: { faq: PublicFAQItem }) {
  const [open, setOpen] = useState(false)
  // Respect `prefers-reduced-motion`: skip the height/opacity animation on the
  // accordion panel (a11y / reduced-motion — vestibular-safe).
  const shouldReduceMotion = useReducedMotion()
  // useId guarantees stable, unique ids even when the same FAQ data is rendered
  // multiple times on a page (WAI-ARIA accordion pattern: button ↔ panel link).
  const reactId = useId()
  const buttonId = `faq-button-${reactId}`
  const panelId = `faq-panel-${reactId}`

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-start bg-card hover:bg-muted/40 transition-colors"
        aria-expanded={open}
        aria-controls={panelId}
        id={buttonId}
      >
        <span className="font-semibold">{faq.question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="overflow-hidden"
            role="region"
            aria-labelledby={buttonId}
            id={panelId}
          >
            <p className="px-5 pb-5 pt-2 text-muted-foreground leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQSection({
  faqs,
  sectionContent,
  disableInnerContainer = false,
}: FAQSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (faqs.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions')
  const description = sectionContent?.description || ''

  return (
    <section id="faq" className="py-16 md:py-20 bg-muted/30">
      <Wrapper>
        <SectionHeader
          icon={HelpCircle}
          badge={isAr ? 'الأسئلة الشائعة' : 'FAQ'}
          title={title}
          description={description || undefined}
        />

        <motion.div
          className="max-w-3xl mx-auto space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {faqs.map((faq) => (
            <motion.div key={faq.id} variants={animationPresets.staggerItem}>
              <FAQItem faq={faq} />
            </motion.div>
          ))}
        </motion.div>
      </Wrapper>
    </section>
  )
}
