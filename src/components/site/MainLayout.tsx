'use client'

import { MotionConfig } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  // Bfcache-restore remount key.
  //
  // Framer Motion's `whileInView` (used across every section component,
  // see `src/lib/animation/viewport.ts`) is IntersectionObserver-driven
  // and evaluated once per mount. When the browser restores a page from
  // the back/forward cache (bfcache) — e.g. the user navigates to a
  // detail page and presses Back — React does NOT remount anything, so
  // any section that never scrolled into view before the user left stays
  // permanently at its `hidden` (opacity:0, non-interactive) variant.
  // `router.refresh()` does not fix this either: it re-fetches Server
  // Component data but does not force a client remount.
  //
  // Bumping a `key` on the wrapper below on `pageshow` (`event.persisted
  // === true`) forces React to unmount and remount the whole page
  // subtree, which recreates every `whileInView` observer fresh — it
  // immediately re-evaluates current scroll position on mount, so
  // in-view sections animate in correctly and off-screen ones correctly
  // reset to `hidden` (to reveal again on scroll). Normal client-side
  // navigation is untouched since this only fires on bfcache restores.
  const [remountKey, setRemountKey] = useState(0)

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setRemountKey((key) => key + 1)
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return (
    <main className={isHome ? 'site-main' : 'site-main pt-[var(--site-header-offset,5rem)]'}>
      <MotionConfig reducedMotion="user">
        <div key={remountKey}>{children}</div>
      </MotionConfig>
    </main>
  )
}
