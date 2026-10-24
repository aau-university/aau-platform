import Image from 'next/image'
import { Calendar, Clock, Eye, BookOpen } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'
import type { PublicBlogPostDetail } from '@/lib/payload/get-public-blog-posts'

export interface BlogDetailHeroProps {
  post: PublicBlogPostDetail
  locale: Locale
}

export function BlogDetailHero({ post, locale }: BlogDetailHeroProps) {
  const isAr = locale === 'ar'
  const formattedDate = post.publishedAt ? formatDateTimeSync(post.publishedAt, locale) : ''
  const tagList = post.tags ? post.tags.split(',').filter(Boolean) : []

  const breadcrumbItems = [
    { label: isAr ? 'المدونة' : 'Blog', href: '/blog' },
    { label: post.title },
  ]

  return (
    <div className="relative overflow-hidden border-b border-border/10 bg-primary pb-14 pt-32 text-primary-foreground shadow-lg md:pb-16">
      {/* Backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-primary/95 to-secondary/20" />
      <div className="absolute -right-16 -top-16 h-[500px] w-[500px] rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />
      <div className="absolute -left-20 -bottom-10 h-[400px] w-[400px] rounded-full bg-secondary/8 blur-[120px] pointer-events-none" />

      <Container className="relative z-10">
        <Breadcrumb items={breadcrumbItems} locale={locale} />

        <div className="mt-8 max-w-4xl">
          {/* Category + tags */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {post.category && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                <BookOpen className="h-3 w-3" />
                {post.category}
              </span>
            )}
            {tagList.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-border/15 bg-card/10 px-3 py-1 text-xs font-medium text-primary-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight drop-shadow-sm">
            {post.title}
          </h1>

          {/* Author + meta row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-primary-foreground/75">
            {/* Author */}
            {post.authorName && (
              <div className="flex items-center gap-2.5">
                {post.authorAvatarUrl ? (
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-secondary/40">
                    <Image
                      src={post.authorAvatarUrl}
                      alt={post.authorName}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-secondary">
                    {post.authorName[0]}
                  </div>
                )}
                <span className="font-semibold">{post.authorName}</span>
              </div>
            )}

            {formattedDate && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary" />
                {formattedDate}
              </span>
            )}

            {post.readTime != null && post.readTime > 0 && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-secondary" />
                {post.readTime} {isAr ? 'دقائق قراءة' : 'min read'}
              </span>
            )}

            {post.views > 0 && (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-secondary" />
                {post.views} {isAr ? 'مشاهدة' : 'views'}
              </span>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
