'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, Eye, ArrowUpRight, BookOpen } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { PublicBlogPostItem } from '@/lib/payload/get-public-blog-posts'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'

export type BlogCardProps = {
  post: PublicBlogPostItem
  locale?: Locale
  /** Display as a featured (large) card */
  featured?: boolean
  className?: string
}

export function BlogCard({ post, locale = 'ar', featured = false, className }: BlogCardProps) {
  const { title, slug, excerpt, image, authorName, authorAvatarUrl, category, publishedAt, readTime, views, tags } = post
  const linkHref = slug ? `/blog/${slug}` : '#'
  const formattedDate = publishedAt ? formatDateTimeSync(publishedAt, locale) : ''
  const isAr = locale === 'ar'
  const tagList = tags ? tags.split(',').filter(Boolean).slice(0, 3) : []

  if (featured) {
    return (
      <Link href={linkHref} className="group block h-full" aria-label={title}>
        <article
          className={cn(
            'relative overflow-hidden rounded-3xl border border-border/8 bg-card/50 backdrop-blur-sm transition-all duration-500 cursor-pointer',
            'hover:border-secondary/30 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-1',
            'grid md:grid-cols-2 gap-0 h-full',
            className,
          )}
        >
          {/* Image — left half */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/80 to-secondary/20 min-h-[260px] md:min-h-[380px]">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
            {category && (
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/90 px-3 py-1.5 text-xs font-bold text-secondary-foreground shadow-md">
                <BookOpen className="h-3 w-3" />
                {category}
              </div>
            )}
          </div>

          {/* Content — right half */}
          <div className="flex flex-col justify-between p-7">
            <div>
              {/* Tag chips */}
              {tagList.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="mb-3 text-2xl font-bold leading-snug transition-colors duration-200 group-hover:text-secondary line-clamp-3">
                {title}
              </h2>

              {excerpt && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  {excerpt}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
              <div className="flex items-center gap-3">
                {authorAvatarUrl ? (
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-secondary/30">
                    <Image
                      src={authorAvatarUrl}
                      alt={authorName || ''}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : authorName ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-secondary">
                    {authorName[0]}
                  </div>
                ) : null}
                <div className="flex flex-col gap-0.5">
                  {authorName && <span className="text-xs font-semibold">{authorName}</span>}
                  {formattedDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {readTime != null && readTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readTime} {isAr ? 'د' : 'min'}
                  </span>
                )}
                {views > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {views}
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={linkHref} className="group block h-full" aria-label={title}>
      <article
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/8 bg-card/50 backdrop-blur-sm transition-all duration-500 h-full flex flex-col cursor-pointer',
          'hover:border-secondary/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:-translate-y-1',
          className,
        )}
      >
        {/* Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-gradient-to-br from-primary/80 to-secondary/20">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />
          {category && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full border border-secondary/50 bg-secondary/90 px-2.5 py-1 text-xs font-bold text-secondary-foreground shadow-md">
              {category}
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-secondary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
            <ArrowUpRight className="h-3.5 w-3.5 text-secondary-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          {/* Tag chips */}
          {tagList.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug transition-colors duration-200 group-hover:text-secondary">
            {title}
          </h3>

          {excerpt && (
            <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
          {!excerpt && <div className="flex-1" />}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              {authorAvatarUrl ? (
                <div className="relative h-6 w-6 overflow-hidden rounded-full border border-secondary/30">
                  <Image
                    src={authorAvatarUrl}
                    alt={authorName || ''}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : authorName ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-secondary">
                  {authorName[0]}
                </div>
              ) : null}
              {authorName && (
                <span className="text-xs font-medium text-foreground/80">{authorName}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              )}
              {readTime != null && readTime > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readTime}{isAr ? 'د' : 'm'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default BlogCard
