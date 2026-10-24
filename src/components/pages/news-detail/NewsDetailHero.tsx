import { Calendar, Eye, Newspaper } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'
import type { PublicNewsDetail } from '@/lib/payload/get-public-news'

export interface NewsDetailHeroProps {
  news: PublicNewsDetail
  locale: Locale
}

export function NewsDetailHero({ news, locale }: NewsDetailHeroProps) {
  const isAr = locale === 'ar'
  const formattedDate = news.publishDate ? formatDateTimeSync(news.publishDate, locale) : ''

  const breadcrumbItems = [
    { label: isAr ? 'الأخبار' : 'News', href: '/news' },
    { label: news.title },
  ]

  return (
    <div className="relative overflow-hidden border-b border-border/10 bg-primary pb-14 pt-32 text-primary-foreground shadow-lg md:pb-16">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-primary/95 to-secondary/20" />
      <div className="pointer-events-none absolute -right-16 -top-16 aspect-square w-[min(24rem,80vw)] rounded-full bg-secondary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 aspect-square w-[min(24rem,80vw)] rounded-full bg-primary-foreground/5 blur-3xl" />

      <Container className="relative z-10">
        <Breadcrumb items={breadcrumbItems} locale={locale} />

        <div className="mt-8 max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/15 px-4 py-1.5 text-sm font-semibold text-secondary mb-6 pointer-events-none">
            <Newspaper className="h-4 w-4" />
            {isAr ? 'أخبار الجامعة' : 'University News'}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight drop-shadow-sm">
            {news.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-primary-foreground/75">
            {formattedDate && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-secondary" />
                {formattedDate}
              </span>
            )}

            {typeof news.views === 'number' && news.views > 0 && (
              <span className="flex items-center gap-2">
                <Eye className="h-4.5 w-4.5 text-secondary" />
                {news.views} {isAr ? 'مشاهدة' : 'views'}
              </span>
            )}

            {news.collegeName && (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                {news.collegeName}
              </span>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
