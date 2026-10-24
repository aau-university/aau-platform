import { Fragment } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { Locale } from '@/i18n/locale'

/**
 * A single breadcrumb entry.
 *
 * `label` is the pre-resolved string for the active locale. The route-bound
 * pages that render this component fetch Payload-localized data themselves
 * (server-side, with `locale: opts.locale`) before passing strings down —
 * the Breadcrumb itself never reads cookies or calls `useLanguage`, so it
 * can render as a Server Component and stay in sync with `cacheComponents`.
 */
export interface BreadcrumbEntry {
  /** Visible label, already localized by the caller. */
  label: string
  /** Optional internal route. Omit for the current (last) page. */
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbEntry[]
  /** Active locale — controls chevron direction (RTL vs LTR). */
  locale?: Locale
  /** Optional href for the leading "home" link. Defaults to `/`. */
  homeHref?: string
  /** Optional visible label for the home link. Defaults to "Home" / "الرئيسية". */
  homeLabel?: string
  className?: string
}

/**
 * Breadcrumb navigation.
 *
 * Ported from the legacy `frontend/components/common/Breadcrumb.tsx`, with
 * the `useLanguage` hook replaced by an explicit `locale` prop. The legacy
 * version was a client component because it depended on the language
 * context; this port is a Server Component — locale is threaded in from
 * the route's `resolveLocale()` server helper.
 *
 * Uses the shadcn Breadcrumb primitive as the structural base so the
 * markup stays aligned with the rest of the design system.
 */
export function Breadcrumb({
  items,
  locale = 'ar',
  homeHref = '/',
  homeLabel,
  className,
}: BreadcrumbProps) {
  const isRTL = locale === 'ar'
  const HomeIcon = Home
  const Chevron = isRTL ? ChevronLeft : ChevronRight
  const resolvedHomeLabel = homeLabel ?? (isRTL ? 'الرئيسية' : 'Home')

  return (
    <BreadcrumbRoot className={cn('mb-6', className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={homeHref}
              className="flex items-center gap-1.5 transition-colors hover:text-secondary"
            >
              <HomeIcon className="h-3 w-3 text-secondary" />
              <span className="hidden sm:inline">{resolvedHomeLabel}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          // `BreadcrumbSeparator` and `BreadcrumbItem` BOTH render as `<li>`
          // (see `src/components/ui/breadcrumb.tsx`). Nesting one inside the
          // other produces `<li><li>…</li></li>` — invalid HTML and a React
          // hydration mismatch. Render them as siblings inside a Fragment so
          // the `<ol>` (BreadcrumbList) has only `<li>` children.
          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbSeparator>
                <Chevron className="h-3 w-3 opacity-40" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={item.href}
                      className="truncate transition-colors hover:text-secondary sm:max-w-none max-w-[120px]"
                    >
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate font-bold sm:max-w-none max-w-[150px]">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  )
}

export default Breadcrumb
