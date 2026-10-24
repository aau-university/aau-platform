'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Link2,
  GraduationCap,
  Mail,
  Calendar,
  FileText,
  BookOpen,
  ClipboardList,
  User,
  Globe,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useLanguage } from '@/i18n/LanguageProvider'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

// Icon registry — maps the icon select value to a lucide component.
const ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  Mail,
  Calendar,
  FileText,
  BookOpen,
  ClipboardList,
  User,
  Globe,
}

export interface QuickLinkItem {
  id?: string | null
  title?: string | null
  description?: string | null
  icon?: string | null
  href?: string | null
  comingSoon?: boolean | null
}

export interface QuickLinksSectionProps {
  links: QuickLinkItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function QuickLinksSection({
  links,
  sectionContent,
  disableInnerContainer = false,
}: QuickLinksSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const title =
    sectionContent?.title || (isAr ? 'روابط سريعة' : 'Quick Links')
  const description = sectionContent?.description

  const Wrapper = disableInnerContainer ? Fragment : Container

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader
        icon={Link2}
        badge={isAr ? 'وصول سريع' : 'Quick Access'}
        title={title}
        description={description || undefined}
      />

      {links.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {isAr ? 'لا توجد روابط لعرضها.' : 'No links to display.'}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {links.map((link, idx) => {
            const IconComp = link.icon ? ICONS[link.icon] ?? Link2 : Link2
            const isComingSoon = Boolean(link.comingSoon)
            const href = !isComingSoon && link.href ? link.href : '#'

            const cardInner = (
              <motion.div
                key={link.id || idx}
                variants={animationPresets.staggerItem}
                className="h-full"
              >
                <article
                  className={cn(
                    'group relative bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border/50 hover:border-secondary/35 shadow-sm hover:shadow-gold transition-all duration-500 h-full flex flex-col items-start text-start',
                    isComingSoon && 'opacity-70',
                  )}
                >
                  {/* Icon */}
                  <div className="w-14 h-14 mb-5 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground group-hover:rotate-[360deg] transition-all duration-700 shrink-0">
                    <IconComp className="w-7 h-7" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-foreground group-hover:text-secondary transition-colors duration-300 mb-2 line-clamp-2">
                    {link.title || (isAr ? 'رابط' : 'Link')}
                  </h3>

                  {/* Description */}
                  {link.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-grow">
                      {link.description}
                    </p>
                  )}

                  {/* Footer: coming soon badge or arrow */}
                  <div className="mt-4 pt-2 w-full flex items-center justify-between">
                    {isComingSoon ? (
                      <Badge variant="secondary" className="text-xs">
                        {isAr ? 'قريباً' : 'Coming Soon'}
                      </Badge>
                    ) : (
                      <span className="text-sm font-bold text-secondary inline-flex items-center gap-1 rtl:flex-row-reverse">
                        {isAr ? 'افتح' : 'Open'}
                        <span className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                          {isAr ? '←' : '→'}
                        </span>
                      </span>
                    )}
                  </div>
                </article>
              </motion.div>
            )

            if (href === '#' || isComingSoon) return cardInner

            return (
              <Link
                key={link.id || idx}
                href={href}
                className="block h-full cursor-pointer"
                aria-label={link.title || ''}
              >
                {cardInner}
              </Link>
            )
          })}
        </motion.div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <Wrapper>{inner}</Wrapper>
    </section>
  )
}

export default QuickLinksSection
