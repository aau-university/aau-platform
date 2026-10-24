'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight, ArrowLeft, Newspaper } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Media as MediaType } from '@/payload-types'

export type NewsCardProps = {
  news: {
    id?: string | number
    title: string
    slug: string
    summary?: string | null
    publishedAt?: string | null
    publishDate?: string | null // For legacy view-models
    image?: string | MediaType | null
    featuredImage?: string | MediaType | null
  }
  href?: string
  formattedDate?: string
  readTime?: string
  className?: string
  isAr?: boolean
}

export function NewsCard({
  news,
  href,
  formattedDate,
  readTime,
  className,
  isAr = false,
}: NewsCardProps) {
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const { title, slug, summary, image, featuredImage, publishedAt, publishDate } = news
  const linkHref = href ?? (slug ? `/news/${slug}` : '#')

  // Resolve cover image safely
  const mediaResource = featuredImage ?? image

  // Format date using unified formatDateTimeSync helper
  const dateValue = publishDate || publishedAt
  const resolvedDateLabel =
    formattedDate || (dateValue ? formatDateTimeSync(dateValue, isAr ? 'ar' : 'en') : '')

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/75 shadow-elegant backdrop-blur-md transition-all duration-500 hover:-translate-y-1.5 hover:border-secondary/40 hover:shadow-gold/20 hover:shadow-2xl',
        className,
      )}
    >
      {/* Thumbnail Area */}
      <div className="relative h-52 w-full overflow-hidden bg-muted/40 shrink-0">
        {mediaResource && typeof mediaResource === 'string' ? (
          <Image
            src={mediaResource}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : mediaResource && typeof mediaResource === 'object' ? (
          <Media
            resource={mediaResource}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/30">
            <Newspaper className="h-12 w-12 stroke-[1.2]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />

        {/* Floating Category/News Badge */}
        <span className="absolute top-4 left-4 right-4 inline-flex items-center gap-1 rounded-xl bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md w-fit pointer-events-none z-10">
          <Newspaper className="h-3 w-3 text-secondary" />
          {isAr ? 'الأخبار' : 'News'}
        </span>
      </div>

      {/* Body & Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Article Meta row */}
        <div className="mb-3.5 flex items-center gap-4 text-xs text-muted-foreground">
          {resolvedDateLabel && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-secondary" />
              {resolvedDateLabel}
            </span>
          )}
          {readTime && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-secondary" />
              {readTime}
            </span>
          )}
        </div>

        <h3 className="mb-3.5 line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          <Link href={linkHref}>{title}</Link>
        </h3>

        {summary && (
          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground flex-1">
            {summary}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="border-t border-muted/40 bg-muted/10 p-5 pt-4 shrink-0">
        <Link
          href={linkHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 px-4 text-center text-sm font-bold text-primary-foreground shadow-sm transition-all duration-300 hover:bg-secondary hover:text-white"
        >
          <span>{isAr ? 'تفاصيل الخبر' : 'Read Article'}</span>
          <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </div>
    </article>
  )
}

export default NewsCard
