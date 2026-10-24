import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import type { BreadcrumbEntry } from '@/components/Breadcrumb'
import type { Locale } from '@/i18n/locale'

/**
 * Shared hero layout for top-level list/detail pages.
 *
 * Consolidates the ~30 lines of duplicated JSX that previously appeared in
 * every `XxxHero.tsx` (background gradient layers + grid texture + breadcrumb
 * + badge pill + title + accent rule + description). Issue #10 — DRY.
 *
 * Theme-token only: uses `bg-primary`, `bg-secondary`, `from-foreground`,
 * `via-primary`, `to-foreground`, `border-border` etc. — no hardcoded hex
 * (see issue #5/#6). Callers pass pre-localized strings (server-side) so
 * this component stays a Server Component (no `'use client'`).
 */
export interface PageHeroLayoutProps {
  /** Active locale — controls breadcrumb chevron direction. */
  locale: Locale
  /** Breadcrumb entries (label already localized by caller). */
  breadcrumbItems: BreadcrumbEntry[]
  /** Lucide icon rendered inside the badge pill. */
  badgeIcon: LucideIcon
  /** Badge text (already localized by caller). */
  badgeText: string
  /** Page H1 title (already localized by caller). */
  title: string
  /** Optional descriptive paragraph (already localized by caller). */
  description?: string
  /** Optional CTA / extra content rendered after the description. */
  children?: ReactNode
}

export function PageHeroLayout({
  locale,
  breadcrumbItems,
  badgeIcon: BadgeIcon,
  badgeText,
  title,
  description,
  children,
}: PageHeroLayoutProps) {
  return (
    <div className="relative overflow-hidden border-b border-secondary/20 bg-primary pb-16 pt-28 text-primary-foreground md:pb-20 md:pt-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-secondary" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-primary to-foreground/80" />

      <Container className="relative z-10">
        <Breadcrumb items={breadcrumbItems} locale={locale} />
        <div className="mt-8 max-w-3xl">
          <span className="pointer-events-none mb-4 inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
            <BadgeIcon className="size-4" />
            {badgeText}
          </span>
          <h1 className="mb-4 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <div className="mb-5 h-1 w-20 rounded-full bg-gradient-to-r from-secondary to-secondary/40" />
          {description ? (
            <p className="max-w-2xl text-lg leading-relaxed text-primary-foreground/85">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </Container>
    </div>
  )
}

export default PageHeroLayout
