import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { Locale } from '@/i18n/locale'

export interface PaginationProps {
  /** 1-indexed current page number. */
  currentPage: number
  /** Total number of pages. */
  totalPages: number
  /**
   * Base path used to build page URLs. A `?page=N` query string is
   * appended for pages > 1; page 1 links to the bare base path.
   *
   * Example: `basePath="/news"` produces `/news` (page 1) and
   * `/news?page=2` (page 2+).
   */
  basePath: string
  /** Active locale — controls chevron direction (RTL vs LTR). */
  locale?: Locale
  /** Optional visible label overrides. */
  labels?: {
    previous?: string
    next?: string
  }
  className?: string
}

/**
 * Pagination control.
 *
 * Wraps the shadcn `Pagination` primitive with the same page-number
 * math the legacy frontend used in `frontend/components/NewsPageContent.tsx`
 * (window of pages around the current page, with ellipsis on either side).
 *
 * Renders as a Server Component — locale and labels are threaded in as
 * props, no `useLanguage` / `useRouter` needed.
 */
export function Pagination({
  currentPage,
  totalPages,
  basePath,
  locale = 'ar',
  labels,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const isRTL = locale === 'ar'
  const PreviousIcon = isRTL ? ChevronRight : ChevronLeft
  const NextIcon = isRTL ? ChevronLeft : ChevronRight
  const previousLabel = labels?.previous ?? (isRTL ? 'السابق' : 'Previous')
  const nextLabel = labels?.next ?? (isRTL ? 'التالي' : 'Next')
  const previousAria = isRTL ? 'الصفحة السابقة' : 'Go to previous page'
  const nextAria = isRTL ? 'الصفحة التالية' : 'Go to next page'

  const pages = buildPageWindow(currentPage, totalPages)

  const pageHref = (page: number) =>
    page <= 1 ? basePath : `${basePath}?page=${page}`

  return (
    <PaginationRoot
      aria-label={isRTL ? 'ترقيم الصفحات' : 'Pagination'}
      className={cn('mt-10', className, 'min-w-0 max-w-full')}
    >
      <PaginationContent className="w-full max-w-[390px] flex-wrap justify-center gap-y-2 sm:w-auto sm:max-w-none sm:flex-nowrap">
        {currentPage > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={pageHref(currentPage - 1)} aria-label={previousAria}>
              <PreviousIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{previousLabel}</span>
            </PaginationPrevious>
          </PaginationItem>
        ) : null}

        {pages.map((entry, index) => {
          if (entry === 'ellipsis') {
            return (
              <PaginationItem key={`ellipsis-${index}`} aria-hidden>
                <PaginationEllipsis />
              </PaginationItem>
            )
          }
          return (
            <PaginationItem key={`page-${entry}`}>
              <PaginationLink
                href={pageHref(entry)}
                isActive={entry === currentPage}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        {currentPage < totalPages ? (
          <PaginationItem>
            <PaginationNext href={pageHref(currentPage + 1)} aria-label={nextAria}>
              <span className="hidden sm:inline">{nextLabel}</span>
              <NextIcon className="h-4 w-4" />
            </PaginationNext>
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </PaginationRoot>
  )
}

/**
 * Compute the page-number window to render.
 *
 * Strategy: always include page 1 and the last page. Around the current
 * page, include a one-page radius. Insert an `'ellipsis'` marker wherever
 * a gap of more than 1 page opens up.
 *
 * Example: currentPage=5, totalPages=10 → [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 */
function buildPageWindow(
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  const windowSize = 1
  const pages: Array<number | 'ellipsis'> = []
  let lastPushed = 0

  for (let page = 1; page <= totalPages; page++) {
    const isEdge = page === 1 || page === totalPages
    const inWindow =
      page >= currentPage - windowSize && page <= currentPage + windowSize

    if (isEdge || inWindow) {
      if (lastPushed && page - lastPushed > 1) {
        pages.push('ellipsis')
      }
      pages.push(page)
      lastPushed = page
    }
  }

  return pages
}

export default Pagination
