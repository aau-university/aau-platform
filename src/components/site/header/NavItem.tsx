'use client'

import Link from 'next/link'

import type { PublicNavItem } from '@/lib/site/public-routes'
import { NavDropdown } from './NavDropdown'

export interface NavItemProps {
  item: PublicNavItem
}

/**
 * NavItem — renders a single top-level navigation item.
 *
 * If the item has `children`, renders a {@link NavDropdown} (hover dropdown
 * on desktop, accordion on mobile). Otherwise renders a plain link.
 *
 * Desktop-only styling — the mobile version is handled inside SiteHeader's
 * mobile sheet (which renders items in a vertical list). The `lg:hidden`
 * class on the plain-link branch ensures the desktop horizontal layout is
 * separate from the mobile vertical layout.
 */
export function NavItem({ item }: NavItemProps) {
  // Items with children → dropdown
  if (item.children && item.children.length > 0) {
    return (
      <NavDropdown
        label={item.label ?? ''}
        href={item.href}
        openInNewTab={item.openInNewTab}
        dropdownItems={item.children}
      />
    )
  }

  // Plain link (no children)
  const linkProps = item.openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <>
      {/* Desktop */}
      <Link
        href={item.href}
        {...linkProps}
        className="hidden lg:relative lg:inline-flex lg:min-h-11 lg:items-center lg:font-bold lg:text-sm lg:xl:text-base lg:text-primary-foreground/90 lg:hover:text-secondary lg:transition-colors lg:duration-300 lg:group lg:py-2 lg:focus-visible:outline-none lg:focus-visible:ring-2 lg:focus-visible:ring-secondary"
      >
        {item.label}
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full rounded-full" />
      </Link>

      {/* Mobile */}
      <Link
        href={item.href}
        {...linkProps}
        data-mobile-focus
        className="block min-h-11 rounded-xl border border-transparent px-4 py-3.5 text-base font-bold transition-all hover:border-secondary/20 hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:hidden"
      >
        {item.label}
      </Link>
    </>
  )
}

export default NavItem
