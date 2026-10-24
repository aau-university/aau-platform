'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronDown, GraduationCap } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { containerStagger, fadeUpItem } from '@/lib/animation'
import { cn } from '@/lib/utils'

import logoHero from '@/assets/logo-hero.png'
import heroBg from '@/assets/hero-bg.jpg'

export interface HeroContent {
  badge?: string | null
  titlePrimary?: string | null
  titleSecondary?: string | null
  tagline?: string | null
  description?: string | null
  primaryCtaLabel?: string | null
  primaryCtaHref?: string | null
  secondaryCtaLabel?: string | null
  secondaryCtaHref?: string | null
}

interface HeroSectionProps {
  content?: HeroContent
  disableInnerContainer?: boolean
  /**
   * Editor-uploaded logo from Site Settings (see `getPublicSiteSettings`).
   * Falls back to the bundled asset when the CMS has no logo yet.
   */
  logo?: { url: string; alt?: string; mimeType?: string }
}

const DEFAULTS_AR = {
  badge: 'مرحباً بكم في جامعة الجيل الجديد',
  titlePrimary: 'جامعة الجيل الجديد',
  titleSecondary: 'الجامعة',
  tagline: 'لأجيال واعدة',
  description:
    'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا لخدمة المجتمع.',
  primaryCtaLabel: 'ابدأ رحلتك',
  primaryCtaHref: '/admission',
  secondaryCtaLabel: 'استكشف الكليات',
  secondaryCtaHref: '/colleges',
} satisfies Record<keyof HeroContent, string>

const DEFAULTS_EN = {
  badge: 'Welcome to ALJEEL AL JADEED UNIVERSITY',
  titlePrimary: 'ALJEEL AL JADEED',
  titleSecondary: 'UNIVERSITY',
  tagline: 'FOR PROMISING GENERATIONS',
  description:
    'A leading educational institution aiming to prepare specialized and scientifically qualified graduates to serve the community.',
  primaryCtaLabel: 'Start Your Journey',
  primaryCtaHref: '/admission',
  secondaryCtaLabel: 'Explore Colleges',
  secondaryCtaHref: '/colleges',
} satisfies Record<keyof HeroContent, string>

export function HeroSection({ content, disableInnerContainer = false, logo }: HeroSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const shouldReduceMotion = useReducedMotion()

  const defaults = isAr ? DEFAULTS_AR : DEFAULTS_EN
  const badge = content?.badge ?? defaults.badge
  const titlePrimary = content?.titlePrimary ?? defaults.titlePrimary
  const titleSecondary = content?.titleSecondary ?? defaults.titleSecondary
  const tagline = content?.tagline ?? defaults.tagline
  const description = content?.description ?? defaults.description
  const primaryCtaLabel = content?.primaryCtaLabel ?? defaults.primaryCtaLabel
  const primaryCtaHref = content?.primaryCtaHref ?? defaults.primaryCtaHref
  const secondaryCtaLabel = content?.secondaryCtaLabel ?? defaults.secondaryCtaLabel
  const secondaryCtaHref = content?.secondaryCtaHref ?? defaults.secondaryCtaHref
  const Arrow = isAr ? ArrowLeft : ArrowRight

  function scrollToAbout() {
    document
      .querySelector('#about')
      ?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <section
      id="hero"
      data-testid="home-hero"
      className="relative isolate flex min-h-[44rem] items-center overflow-hidden bg-primary text-primary-foreground sm:min-h-[48rem] lg:min-h-[52rem]"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src={heroBg}
          alt=""
          fill
          preload
          quality={75}
          className="object-cover"
          sizes="100vw"
        />
        {/* Layered treatment: darken the photo, drop a soft gold glow behind
            the crest, add a top scrim so the fixed header stays readable,
            a bottom fade into the next section, and a subtle inset vignette
            to draw the eye to the centre. */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/95" />
        <div className="absolute left-1/2 top-[22%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-secondary/15 blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-primary to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,0.65)]" />
      </div>

      <motion.div
        className={cn(
          'mx-auto w-full px-4 pb-28 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8',
          disableInnerContainer ? 'max-w-none' : 'max-w-7xl',
        )}
        variants={shouldReduceMotion ? undefined : containerStagger}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        animate={shouldReduceMotion ? undefined : 'visible'}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Logo medallion — the exact sized frame is preserved; a gold ring
              + glow + gentle float turns the bare logo into a crest. */}
          <motion.div
            className="mb-8 flex items-center justify-center"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            <motion.div
              className="relative rounded-full border border-secondary/30 bg-primary/40 p-3 shadow-[0_0_50px_-8px_rgba(234,179,8,0.45)] ring-1 ring-inset ring-white/10 backdrop-blur-sm"
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-secondary/10 blur-xl"
              />
              <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                {logo?.url ? (
                  <Image
                    src={logo.url}
                    alt={
                      logo.alt ??
                      (isAr ? 'شعار جامعة الجيل الجديد' : 'Al-Jeel Al-Jadeed University Logo')
                    }
                    fill
                    preload
                    unoptimized
                    className="object-contain"
                    sizes="(max-width: 640px) 96px, 112px"
                  />
                ) : (
                  <Image
                    src={logoHero}
                    alt={isAr ? 'شعار جامعة الجيل الجديد' : 'Al-Jeel Al-Jadeed University Logo'}
                    fill
                    preload
                    quality={75}
                    className="object-contain"
                    sizes="(max-width: 640px) 96px, 112px"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>

          <motion.p
            className="mx-auto inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-5 py-2 text-sm font-semibold leading-5 text-secondary backdrop-blur-sm"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-secondary" />
            {badge}
          </motion.p>

          <motion.h1
            className="mt-6 text-balance font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            <span className="block break-words text-primary-foreground [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]">
              {titlePrimary}
            </span>
            <span className="mt-3 block break-words bg-gradient-to-r from-secondary via-amber-300 to-secondary bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl md:text-4xl lg:text-5xl">
              {titleSecondary}
            </span>
          </motion.h1>

          {/* Decorative gold divider framing the tagline. */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-3"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-secondary/70 sm:w-12" />
            <p className="text-sm font-semibold leading-relaxed text-secondary sm:text-base md:text-lg ltr:tracking-[0.18em]">
              {tagline}
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-gradient-to-l from-transparent to-secondary/70 sm:w-12" />
          </motion.div>

          <motion.p
            className="text-pretty mx-auto mt-6 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg sm:leading-8"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            {description}
          </motion.p>

          <motion.div
            className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center"
            variants={shouldReduceMotion ? undefined : fadeUpItem}
          >
            <Button
              asChild
              size="lg"
              className="w-full border border-secondary bg-secondary px-8 text-primary shadow-[0_12px_40px_-12px_rgba(234,179,8,0.65)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-secondary/90 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
            >
              <Link href={primaryCtaHref || '/admission'}>
                {primaryCtaLabel}
                <Arrow className="h-5 w-5 rtl:order-first" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary-foreground/25 bg-white/5 px-8 text-primary-foreground shadow-none backdrop-blur-sm transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-secondary sm:w-auto"
            >
              <Link href={secondaryCtaHref || '/colleges'}>
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
                {secondaryCtaLabel}
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        type="button"
        onClick={scrollToAbout}
        className="absolute bottom-4 left-1/2 z-20 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary/30 px-4 text-sm font-medium text-primary-foreground/70 backdrop-blur-sm transition-colors hover:border-secondary/50 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transition-none sm:bottom-6"
        initial={shouldReduceMotion ? undefined : { opacity: 0 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1 }}
        transition={shouldReduceMotion ? undefined : { delay: 0.6, duration: 0.3 }}
        aria-label={isAr ? 'اكتشف المزيد' : 'Discover More'}
      >
        <span>{isAr ? 'اكتشف المزيد' : 'Discover More'}</span>
        <motion.span
          animate={shouldReduceMotion ? undefined : { y: [0, 4, 0] }}
          transition={shouldReduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
        >
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
        </motion.span>
      </motion.button>
    </section>
  )
}
