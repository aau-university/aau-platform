import Image from 'next/image'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Locale } from '@/i18n/locale'
import type { PublicResearchArticleDetail } from '@/lib/payload/get-public-research'

export interface ResearchSidebarProps {
  article: PublicResearchArticleDetail
  locale: Locale
}

export function ResearchSidebar({ article, locale }: ResearchSidebarProps) {
  const isAr = locale === 'ar'

  return (
    <div className="space-y-6">
      {/* Featured Image Widget */}
      {article.image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        </div>
      )}

      {/* Article Meta / Classification Card */}
      <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-md">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-foreground">
          <FileText className="h-4.5 w-4.5 text-secondary" />
          {isAr ? 'تصنيف المقال' : 'Classification'}
        </h2>
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          {article.categoryName || (isAr ? 'غير مصنف' : 'Uncategorized')}
        </p>

        {/* Tags/Keywords badge list */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-6 border-t border-muted/50 pt-5">
            <h4 className="mb-3 text-xs font-bold text-foreground uppercase tracking-widest">
              {isAr ? 'الكلمات المفتاحية' : 'Keywords / Tags'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-muted-foreground/20 hover:border-secondary/50 bg-card/50 text-xs px-2.5 py-1"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
