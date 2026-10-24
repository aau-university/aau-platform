import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicResearchArticleDetail } from '@/lib/payload/get-public-research'

export interface ResearchContentProps {
  article: PublicResearchArticleDetail
  locale: Locale
}

export function ResearchContent({ article, locale }: ResearchContentProps) {
  const isAr = locale === 'ar'

  return (
    <div className="space-y-8">
      {/* Abstract Block */}
      {article.summary && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2 text-primary font-bold border-b border-muted pb-4">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            <span>{isAr ? 'ملخص الدراسة (Abstract)' : 'Study Abstract'}</span>
          </div>
          <p className="max-w-[72ch] text-lg font-medium italic leading-relaxed text-foreground">
            {article.summary}
          </p>
        </div>
      )}

      {/* Rich Content Details Block */}
      {article.content && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <h2 className="mb-6 text-xl font-bold md:text-2xl border-b border-muted pb-4 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'النص الكامل للبحث' : 'Full Text Publication'}
          </h2>
          <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed">
            <RichText content={article.content} />
          </div>
        </div>
      )}
    </div>
  )
}
