import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock } from 'lucide-react'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { PublicBlogPostItem } from '@/lib/payload/get-public-blog-posts'
import type { Locale } from '@/i18n/locale'

export interface BlogDetailSidebarProps {
  authorName: string
  authorAvatarUrl: string | null
  tags: string
  related: PublicBlogPostItem[]
  locale: Locale
  currentSlug: string
}

export function BlogDetailSidebar({
  authorName,
  authorAvatarUrl,
  tags,
  related,
  locale,
  currentSlug,
}: BlogDetailSidebarProps) {
  const isAr = locale === 'ar'
  const tagList = tags ? tags.split(',').filter(Boolean) : []
  const filteredRelated = related.filter((p) => p.slug !== currentSlug).slice(0, 4)

  return (
    <div className="space-y-5">
      {/* Author card */}
      {authorName && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="h-4 w-1 rounded-full bg-secondary" />
            {isAr ? 'الكاتب' : 'Author'}
          </h3>
          <div className="flex items-center gap-3">
            {authorAvatarUrl ? (
              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-secondary/30">
                <Image src={authorAvatarUrl} alt={authorName} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-lg font-bold text-secondary">
                {authorName[0]}
              </div>
            )}
            <div>
              <p className="font-semibold">{authorName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {tagList.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="h-4 w-1 rounded-full bg-secondary" />
            {isAr ? 'الوسوم' : 'Tags'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related posts */}
      {filteredRelated.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="h-4 w-1 rounded-full bg-secondary" />
            {isAr ? 'مقالات ذات صلة' : 'Related Articles'}
          </h3>
          <div className="space-y-3">
            {filteredRelated.map((item) => {
              const formattedDate = item.publishedAt
                ? formatDateTimeSync(item.publishedAt, locale)
                : ''

              return (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="group flex min-h-11 gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.image && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-secondary">
                      {item.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {formattedDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formattedDate}
                        </span>
                      )}
                      {item.readTime != null && item.readTime > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.readTime}
                            {isAr ? 'د' : 'm'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <Link
            href="/blog"
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isAr ? 'عرض جميع المقالات' : 'View All Articles'}
          </Link>
        </div>
      )}
    </div>
  )
}
