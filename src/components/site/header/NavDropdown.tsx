'use client'

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageProvider'
import type { PublicNavChild } from '@/lib/site/public-routes'

export interface NavDropdownProps {
  /** The top-level item label. */
  label: string
  /** The top-level item href (clicking the label navigates here). */
  href: string
  /** Whether the top-level link opens in a new tab. */
  openInNewTab?: boolean
  /** Child items rendered inside the dropdown. */
  dropdownItems: PublicNavChild[]
}

/**
 * NavDropdown — hover-triggered dropdown for desktop, tap-to-expand accordion
 * for mobile.
 *
 * Desktop behaviour:
 *   - Hovering the trigger reveals the dropdown panel (200ms fade + slide).
 *   - A 150ms close delay avoids accidental dismissal when the cursor
 *     briefly leaves the trigger.
 *   - Clicking the trigger label navigates to `href` (the parent page).
 *
 * Mobile behaviour:
 *   - A chevron toggles an expandable accordion.
 *   - Clicking the label navigates to `href`.
 */
export function NavDropdown({
  label,
  href,
  openInNewTab = false,
  dropdownItems: childItems,
}: NavDropdownProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [open, setOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const desktopMenuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const disclosureOpenRef = useRef(false)
  const panelId = useId()
  const mobilePanelId = `${panelId}-mobile`

  const linkProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  useEffect(() => {
    if (!open) return

    function handleOutsidePointer(event: PointerEvent) {
      if (desktopMenuRef.current?.contains(event.target as Node)) return
      if (closeTimer.current) clearTimeout(closeTimer.current)
      disclosureOpenRef.current = false
      setOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [open])

  function closeDesktopMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    disclosureOpenRef.current = false
    setOpen(false)
  }

  function toggleDesktopMenu() {
    if (disclosureOpenRef.current) {
      closeDesktopMenu()
      return
    }
    if (closeTimer.current) clearTimeout(closeTimer.current)
    disclosureOpenRef.current = true
    setOpen(true)
  }

  function handleDisclosureKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleDesktopMenu()
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) closeDesktopMenu()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    triggerRef.current?.focus()
    closeDesktopMenu()
  }

  return (
    <>
      {/* Desktop (lg+) — hover dropdown */}
      <div
        ref={desktopMenuRef}
        className="hidden lg:relative lg:flex lg:items-center"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => {
          if (!disclosureOpenRef.current) {
            closeTimer.current = setTimeout(() => setOpen(false), 150)
          }
        }}
      >
        <div className="relative inline-flex min-h-11 items-center">
          <Link
            href={href}
            {...linkProps}
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current)
              setOpen(true)
            }}
            className="group inline-flex min-h-11 items-center py-2 font-bold text-sm text-primary-foreground/90 transition-colors duration-300 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary xl:text-base"
          >
            {label}
            <span className="absolute inset-x-0 bottom-0 h-0.5 origin-start scale-x-0 rounded-full bg-secondary transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
          </Link>
          <button
            ref={triggerRef}
            type="button"
            aria-label={isAr ? `قائمة ${label}` : `${label} menu`}
            aria-expanded={open}
            aria-controls={panelId}
            onKeyDown={handleDisclosureKeyDown}
            onClick={toggleDesktopMenu}
            className="inline-flex size-11 items-center justify-center rounded-lg text-primary-foreground/90 transition-colors hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-300 motion-reduce:transition-none',
                open && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        {open && (
            <motion.div
              id={panelId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'absolute top-full z-50 min-w-[16rem] pt-2',
                isAr ? 'right-0' : 'left-0',
              )}
            >
              <div className="bg-primary/95 backdrop-blur-xl border border-border/10 shadow-elegant rounded-2xl overflow-hidden">
                <ul className="flex flex-col p-2">
                  {childItems.map((child) => {
                    const childLinkProps = child.openInNewTab
                      ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                      : {}
                    return (
                      <li key={child.key}>
                        <Link
                          href={child.href}
                          {...childLinkProps}
                          onClick={closeDesktopMenu}
                          className="block px-4 py-3 rounded-xl hover:bg-secondary/10 transition-colors group/item"
                        >
                          <div className="font-bold text-sm text-primary-foreground group-hover/item:text-secondary transition-colors">
                            {child.label}
                          </div>
                          {child.description && (
                            <div className="text-xs text-primary-foreground/60 mt-0.5 line-clamp-2">
                              {child.description}
                            </div>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </motion.div>
        )}
      </div>

      {/* Mobile (<lg) — accordion */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={href}
            {...linkProps}
            onClick={() => setMobileExpanded(false)}
            data-mobile-focus
            className="flex-1 block px-4 py-3.5 rounded-xl font-bold text-base hover:bg-secondary/10 hover:text-secondary border border-transparent hover:border-secondary/20 transition-all"
          >
            {label}
          </Link>
          <button
            type="button"
            aria-label={isAr ? `توسيع ${label}` : `Expand ${label}`}
            aria-expanded={mobileExpanded}
            aria-controls={mobilePanelId}
            onClick={() => setMobileExpanded((v) => !v)}
            data-mobile-focus
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/20 transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <ChevronDown
              className={cn(
                'w-5 h-5 transition-transform duration-300',
                mobileExpanded && 'rotate-180',
              )}
            />
          </button>
        </div>
        <AnimatePresence>
          {mobileExpanded && (
            <motion.div
              id={mobilePanelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <ul className="flex flex-col gap-1 ps-4 mt-1 border-s border-border/10">
                {childItems.map((child) => {
                  const childLinkProps = child.openInNewTab
                    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                    : {}
                  return (
                    <li key={child.key}>
                      <Link
                        href={child.href}
                        {...childLinkProps}
                        onClick={() => setMobileExpanded(false)}
                        data-mobile-focus
                        className="block px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 transition-colors"
                      >
                        {child.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default NavDropdown
