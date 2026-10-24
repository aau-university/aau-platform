'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { PublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface ContactInfoSectionProps {
  settings: PublicSiteSettings
  content?: HomeSectionText
  disableInnerContainer?: boolean
}

const DEFAULTS_AR = {
  badge: 'تواصل معنا',
  heading: 'نسعد بالتواصل معك',
  description:
    'فريقنا متاح للإجابة عن استفساراتكم بخصوص القبول والبرامج الأكاديمية وأي شؤون إدارية.',
}

const DEFAULTS_EN = {
  badge: 'Contact',
  heading: 'We are happy to hear from you',
  description:
    'Our team is available to answer your questions about admissions, academic programmes, and administrative matters.',
}

export function ContactInfoSection({
  settings,
  content,
  disableInnerContainer = false,
}: ContactInfoSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const Wrapper = disableInnerContainer ? Fragment : Container
  const defaults = isAr ? DEFAULTS_AR : DEFAULTS_EN
  // Issue #14 — `badge` and `heading` previously both read `content?.title`,
  // which duplicated the editor-supplied title into BOTH the badge and the
  // heading (e.g., "تواصل معنا لإرسال شكوى" appeared twice). The badge is
  // a short label, so it now always falls back to the curated default
  // ("Contact" / "تواصل معنا"); only the heading honors `content?.title`.
  const badge = defaults.badge
  const heading = content?.title ?? defaults.heading
  const description = content?.description ?? defaults.description
  const address = settings.address

  return (
    <section id="contact" data-block="home-contact-info" className="py-16 md:py-20 bg-card">
      <Wrapper>
        <SectionHeader icon={Mail} badge={badge} title={heading} description={description} />

        <motion.div
          className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {settings.contactPhone && (
            <motion.a
              href={`tel:${settings.contactPhone}`}
              className="group flex flex-col items-center gap-3 p-6 bg-background rounded-2xl border border-border/50 shadow-sm hover:shadow-elegant transition-all"
              variants={animationPresets.staggerItem}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-primary transition-colors">
                <Phone className="w-6 h-6" />
              </div>
              <div className="text-sm text-muted-foreground">{isAr ? 'هاتف' : 'Phone'}</div>
              <div className="font-bold text-foreground text-base sm:text-lg" dir="ltr">
                {settings.contactPhone}
              </div>
            </motion.a>
          )}

          {settings.contactEmail && (
            <motion.a
              href={`mailto:${settings.contactEmail}`}
              className="group flex flex-col items-center gap-3 p-6 bg-background rounded-2xl border border-border/50 shadow-sm hover:shadow-elegant transition-all"
              variants={animationPresets.staggerItem}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-primary transition-colors">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-sm text-muted-foreground">
                {isAr ? 'البريد الإلكتروني' : 'Email'}
              </div>
              <div className="font-bold text-foreground text-base sm:text-lg" dir="ltr">
                {settings.contactEmail}
              </div>
            </motion.a>
          )}

          {address && (
            <motion.div
              className="group flex flex-col items-center gap-3 p-6 bg-background rounded-2xl border border-border/50 shadow-sm"
              variants={animationPresets.staggerItem}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-sm text-muted-foreground">{isAr ? 'العنوان' : 'Address'}</div>
              <div className="font-bold text-foreground text-base sm:text-lg text-center">
                {address}
              </div>
            </motion.div>
          )}
        </motion.div>
      </Wrapper>
    </section>
  )
}
