import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'
import type { HomeFallbackNewsItem } from '@/lib/fallback/home-fallback-data'

export interface NewsDetailSidebarProps {
  related: HomeFallbackNewsItem[]
  locale: Locale
}

export function NewsDetailSidebar({ related, locale }: NewsDetailSidebarProps) {
  const isAr = locale === 'ar'
  const ChevronIcon = isAr ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-6">
      {/* Related News Card */}
      {related.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-md">
          <h2 className="mb-6 text-lg font-extrabold text-foreground flex items-center gap-2 border-b border-muted pb-4">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'أخبار ذات صلة' : 'Related News'}
          </h2>

          <div className="space-y-4">
            {related.map((item) => {
              const formattedDate = item.publishDate
                ? formatDateTimeSync(item.publishDate, locale)
                : ''
              return (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="group block min-h-11 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-border hover:bg-card/50 hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h4>
                  {formattedDate && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-secondary" />
                      <span>{formattedDate}</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Directory Back Button */}
      <Link
        href="/news"
        className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-4 py-4 text-center text-sm font-bold text-foreground shadow-elegant transition-all duration-300 hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span>{isAr ? 'العودة لجميع الأخبار' : 'Back to News'}</span>
        <ChevronIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  )
}
