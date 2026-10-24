import { BookOpen, Calendar, User } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'
import type { PublicResearchArticleDetail } from '@/lib/payload/get-public-research'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

export interface ResearchHeroProps {
  article: PublicResearchArticleDetail
  locale: Locale
}

export function ResearchHero({ article, locale }: ResearchHeroProps) {
  const isAr = locale === 'ar'

  const breadcrumbItems = [
    { label: isAr ? 'البحث العلمي' : 'Research', href: '/research/journal' },
    {
      label: isAr ? 'المقالات والأبحاث' : 'Articles',
      href: '/research/articles',
    },
    { label: article.title },
  ]

  return (
    <Container>
      <Breadcrumb items={breadcrumbItems} locale={locale} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {article.categoryName && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {article.categoryName}
          </span>
        )}
      </div>

      <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {article.title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-muted py-5 text-muted-foreground">
        {article.author ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">
                {article.author}
              </div>
            </div>
          </div>
        ) : null}

        {article.publishDate ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4.5 w-4.5 text-secondary" />
            <span>{formatDateTimeSync(article.publishDate, locale)}</span>
          </div>
        ) : null}
      </div>
    </Container>
  )
}
