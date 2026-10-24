'use client'

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageProvider'
import type { PublicNavItem } from '@/lib/site/public-routes'

export interface MoreMenuProps {
  /** Items that have been moved into the "More" overflow menu. */
  items: PublicNavItem[]
}

/**
 * MoreMenu — overflow dropdown that collects nav items flagged with
 * `showInMore: true`.
 *
 * Desktop: a "⋯" button that opens a hover/click dropdown.
 * Mobile: rendered as part of the mobile accordion (the parent SiteHeader
 * passes the items directly into the mobile sheet, so this component is
 * desktop-only).
 */
export function MoreMenu({ items }: MoreMenuProps) {
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

  const label = isAr ? 'المزيد' : 'More'

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

  if (items.length === 0) return null

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
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current)
          setOpen(true)
        }}
        onMouseLeave={() => {
          if (!disclosureOpenRef.current) {
            closeTimer.current = setTimeout(() => setOpen(false), 150)
          }
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={panelId}
          onKeyDown={handleDisclosureKeyDown}
          onClick={toggleDesktopMenu}
          className="group relative inline-flex min-h-11 items-center gap-1 rounded-lg py-2 font-bold text-sm text-primary-foreground/90 transition-colors duration-300 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary xl:text-base"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="hidden xl:inline">{label}</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-300',
              open && 'rotate-180',
            )}
          />
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full rounded-full" />
        </button>

        {open && (
            <motion.div
              id={panelId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'absolute top-full z-50 min-w-[14rem] pt-2',
                isAr ? 'right-0' : 'left-0',
              )}
            >
              <div className="bg-primary/95 backdrop-blur-xl border border-border/10 shadow-elegant rounded-2xl overflow-hidden">
                <ul className="flex flex-col p-2">
                  {items.map((item) => {
                    const linkProps = item.openInNewTab
                      ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                      : {}
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          {...linkProps}
                          onClick={closeDesktopMenu}
                          className="block px-4 py-3 rounded-xl hover:bg-secondary/10 transition-colors group/item"
                        >
                          <div className="font-bold text-sm text-primary-foreground group-hover/item:text-secondary transition-colors">
                            {item.label}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </motion.div>
        )}
      </div>

      {/* Mobile (<lg) — accordion (no children, just links) */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileExpanded}
          aria-controls={mobilePanelId}
          onClick={() => setMobileExpanded((v) => !v)}
          data-mobile-focus
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-transparent px-4 py-3.5 text-base font-bold transition-all hover:border-secondary/20 hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <span>{label}</span>
          <ChevronDown
            className={cn(
              'w-5 h-5 transition-transform duration-300',
              mobileExpanded && 'rotate-180',
            )}
          />
        </button>
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
                {items.map((item) => {
                  const linkProps = item.openInNewTab
                    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                    : {}
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        {...linkProps}
                        onClick={() => setMobileExpanded(false)}
                        data-mobile-focus
                        className="block px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 transition-colors"
                      >
                        {item.label}
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

export default MoreMenu
