'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Calendar, Clock, User, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { PublicResearchArticleItem } from '@/lib/payload/get-public-research'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

export type ResearchCardProps = {
  research: PublicResearchArticleItem
  className?: string
}

export function ResearchCard({ research, className }: ResearchCardProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const { title, slug, summary, author, image, categoryName, publishDate, tags } = research

  const linkHref = `/research/articles/${slug}`
  const formattedPublishDate = publishDate ? formatDateTimeSync(publishDate, language) : ''

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-elegant backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
    >
      {/* Article Image area */}
      <div className="relative h-48 w-full overflow-hidden bg-muted/40 shrink-0">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/30">
            <BookOpen className="h-12 w-12 stroke-[1.2]" />
          </div>
        )}

        {/* Floating Category Badge */}
        {categoryName && (
          <span className="pointer-events-none absolute start-4 top-4 z-10 inline-flex w-fit items-center gap-1 rounded-xl bg-primary/85 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm backdrop-blur-md">
            <BookOpen className="h-3 w-3 text-secondary" />
            {categoryName}
          </span>
        )}
      </div>

      {/* Body & Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Article Meta row */}
        <div className="mb-3.5 flex items-center gap-4 text-xs text-muted-foreground">
          {publishDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-secondary" />
              {formattedPublishDate}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-secondary" />
            {isAr ? '10 دقائق قراءة' : '10 min read'}
          </span>
        </div>

        <h3 className="mb-3.5 line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          <Link
            href={linkHref}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {title}
          </Link>
        </h3>

        {summary && (
          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground flex-1">
            {summary}
          </p>
        )}

        {/* Display Tags */}
        {tags && tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author details footer */}
        {author && (
          <div className="mt-auto border-t border-muted/50 pt-4 flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-primary/5 select-none text-primary">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">{author}</div>
              <div className="text-[10px] text-muted-foreground">
                {isAr ? 'باحث أكاديمي' : 'Academic Researcher'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="border-t border-muted/40 bg-muted/10 p-5 pt-4 shrink-0">
        <Button asChild variant="secondary" className="w-full">
          <Link
            href={linkHref}
            aria-label={`${isAr ? 'تفاصيل البحث' : 'Research details'}: ${title}`}
          >
            <span>{isAr ? 'تفاصيل البحث' : 'Research Details'}</span>
            {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Link>
        </Button>
      </div>
    </article>
  )
}

export default ResearchCard
