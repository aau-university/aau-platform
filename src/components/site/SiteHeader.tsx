'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, Menu, X } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageProvider'
import { LanguageToggle } from './LanguageToggle'
import { NavItem } from './header/NavItem'
import { MoreMenu } from './header/MoreMenu'
import { SiteLogo } from './SiteLogo'
import type { PublicNavItem } from '@/lib/site/public-routes'
import type { PublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import type { PublicNavbarSettings } from '@/lib/payload/get-public-navbar-settings'

interface SiteHeaderProps {
  nav: PublicNavItem[]
  settings: PublicSiteSettings
  navbarSettings: PublicNavbarSettings
}

export function SiteHeader({ nav, settings, navbarSettings }: SiteHeaderProps) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [scrolled, setScrolled] = useState(false)
  const [openPathname, setOpenPathname] = useState<string | null>(null)
  const open = openPathname === pathname
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDialogRef = useRef<HTMLElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const mobilePanelId = useId()
  const mobilePanelTitleId = `${mobilePanelId}-title`
  // Respect `prefers-reduced-motion`: when set, the mobile sheet and its
  // staggered items appear instantly without opacity/transform transitions
  // (vestibular-safe — avoids the slide/fade that triggers motion sickness).
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Treat the custom mobile sheet like a modal without adding a dependency.
  useEffect(() => {
    if (!open) return

    const menuButton = menuButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const animationFrame = window.requestAnimationFrame(() => {
      mobilePanelRef.current?.querySelector<HTMLElement>('[data-mobile-focus]')?.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpenPathname(null)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [
        menuButtonRef.current,
        ...Array.from(
          mobilePanelRef.current?.querySelectorAll<HTMLElement>('[data-mobile-focus]') ?? [],
        ),
      ].filter((element): element is HTMLElement => element !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      menuButton?.focus()
    }
  }, [open])

  const brand = settings.siteName
  const tagline = settings.tagline

  // Split nav into main items and "more" items
  const mainItems = nav.filter((item) => !item.showInMore)
  const moreItems = nav.filter((item) => item.showInMore)
  const hasMore = moreItems.length > 0

  const { topBarItems, hideLogin, showLanguagePicker, callToAction } = navbarSettings
  const hasTopBar = topBarItems.length > 0 || !hideLogin
  const ctaVariant = callToAction?.appearance ?? 'default'

  return (
    <header
      ref={mobileDialogRef}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-labelledby={open ? mobilePanelTitleId : undefined}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out',
        !isHome && '[&+.site-main]:[--site-header-offset:4rem] sm:[&+.site-main]:[--site-header-offset:5rem]',
        !isHome && hasTopBar && 'sm:[&+.site-main]:[--site-header-offset:7.25rem]',
        (scrolled || open || !isHome)
          ? 'bg-primary/95 backdrop-blur-md border-b border-border/10 shadow-elegant'
          // At the top of the home page the bar is "transparent", but a
          // top-down dark scrim keeps the nav area readable and guarantees
          // it never appears washed-out/white over a bright or slow-loading
          // hero — the hero still shows through the fading lower edge.
          : 'bg-gradient-to-b from-primary/85 via-primary/40 to-transparent',
      )}
    >
      {/* Top Bar (hidden on mobile, shown on sm+) */}
      {hasTopBar && (
        <div className="hidden sm:block border-b border-border/5 bg-primary/80">
          <Container className="flex items-center justify-between h-9 text-xs text-primary-foreground/70">
            <div className="flex items-center gap-4">
              {topBarItems.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="relative -my-1 inline-flex min-h-11 items-center rounded-sm px-1 transition-colors duration-200 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {!hideLogin && (
              <Link
                href="/admin"
                className="relative -my-1 inline-flex min-h-11 items-center gap-1 rounded-sm px-1 font-medium transition-colors duration-200 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل الدخول' : 'Login'}</span>
              </Link>
            )}
          </Container>
        </div>
      )}

      {/* Main Nav */}
      <Container
        className={cn(
          'flex items-center justify-between gap-4 text-primary-foreground transition-all duration-300',
          scrolled ? 'h-14' : 'h-16 sm:h-20',
        )}
      >
        {/* Brand */}
        <Link href="/" aria-label={brand} className="group flex shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
          <SiteLogo
            logo={settings.logo}
            siteName={brand}
            width={48}
            height={48}
            className="size-10 rounded-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none sm:size-12"
          />
          <div className="text-shadow flex flex-col justify-center">
            <div className="font-display font-bold text-xs sm:text-base md:text-lg leading-tight group-hover:text-secondary transition-colors duration-300 max-w-[140px] sm:max-w-none line-clamp-1">
              {brand}
            </div>
            {tagline && (
              <div className="text-[8px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase text-secondary/90 mt-0.5 opacity-90 line-clamp-1">
                {tagline}
              </div>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8" aria-label={isAr ? 'الرئيسية' : 'Primary'}>
          {mainItems.map((item) => (
            <NavItem key={item.key} item={item} />
          ))}
          {hasMore && <MoreMenu items={moreItems} />}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {showLanguagePicker && (
            <LanguageToggle className="text-primary-foreground border-border/20 hover:border-secondary/50 hover:bg-secondary/10 transition-colors" />
          )}
          {callToAction && callToAction.href ? (
            <Button
              asChild
              variant={ctaVariant}
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link
                href={callToAction.href}
                {...(callToAction.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {callToAction.label ?? (isAr ? 'سجّل الآن' : 'Apply Now')}
              </Link>
            </Button>
          ) : null}
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? (isAr ? 'إغلاق القائمة' : 'Close menu') : (isAr ? 'فتح القائمة' : 'Open menu')}
            aria-expanded={open}
            aria-controls={mobilePanelId}
            data-mobile-focus={open ? true : undefined}
            onClick={() => setOpenPathname((current) => current === pathname ? null : pathname)}
            className="relative z-50 inline-flex size-11 items-center justify-center rounded-full border border-border/20 transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:hidden"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile sheet with Framer Motion */}
      <AnimatePresence>
        {open && (
          <motion.div
            id={mobilePanelId}
            initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-full h-[calc(100dvh-4rem)] lg:hidden',
              hasTopBar ? 'sm:h-[calc(100dvh-7.25rem)]' : 'sm:h-[calc(100dvh-5rem)]',
            )}
          >
            <div
              data-testid="mobile-menu-backdrop"
              aria-hidden="true"
              onPointerDown={() => setOpenPathname(null)}
              className="pointer-events-auto absolute inset-0 bg-primary/35 backdrop-blur-sm"
            />
            <div
              ref={mobilePanelRef}
              onClick={(event) => {
                if ((event.target as Element).closest('a')) setOpenPathname(null)
              }}
              className="pointer-events-auto relative z-10 max-h-full overflow-y-auto border-b border-border/10 bg-primary/95 shadow-elegant backdrop-blur-xl"
            >
              <Container className="py-6">
                <h2 id={mobilePanelTitleId} className="sr-only">
                  {isAr ? 'قائمة التنقل' : 'Navigation menu'}
                </h2>
                <nav className="flex flex-col gap-2 text-primary-foreground" aria-label={isAr ? 'التنقل' : 'Mobile'}>
                {mainItems.map((item, i) => (
                  <motion.div
                    key={item.key}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : i * 0.05 + 0.1 }}
                  >
                    <NavItem item={item} />
                  </motion.div>
                ))}
                {hasMore && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : mainItems.length * 0.05 + 0.1 }}
                  >
                    <MoreMenu items={moreItems} />
                  </motion.div>
                )}
                {/* CTA in mobile menu */}
                {callToAction && callToAction.href && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : (mainItems.length + (hasMore ? 1 : 0)) * 0.05 + 0.1 }}
                    className="mt-4 pt-4 border-t border-border/10"
                  >
                    <Button asChild variant={ctaVariant} size="lg" className="w-full">
                      <Link
                        href={callToAction.href}
                        data-mobile-focus
                        {...(callToAction.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {callToAction.label ?? (isAr ? 'سجّل الآن' : 'Apply Now')}
                      </Link>
                    </Button>
                  </motion.div>
                )}
                {/* Login in mobile menu */}
                {!hideLogin && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : (mainItems.length + (hasMore ? 1 : 0) + (callToAction ? 1 : 0)) * 0.05 + 0.1 }}
                  >
                    <Link
                      href="/admin"
                      data-mobile-focus
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3.5 text-base font-bold transition-all hover:border-secondary/20 hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      <LogIn className="w-5 h-5" />
                      <span>{isAr ? 'تسجيل الدخول' : 'Login'}</span>
                    </Link>
                  </motion.div>
                )}
                </nav>
              </Container>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
