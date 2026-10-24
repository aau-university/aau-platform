import Image from 'next/image'
import { RichText } from '@/components/RichText'
import type { PublicBlogPostDetail } from '@/lib/payload/get-public-blog-posts'
import type { Locale } from '@/i18n/locale'

export interface BlogDetailContentProps {
  post: PublicBlogPostDetail
  locale: Locale
}

export function BlogDetailContent({ post, locale }: BlogDetailContentProps) {
  const isAr = locale === 'ar'

  return (
    <div>
      {/* Featured image */}
      {post.image && (
        <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-2xl shadow-elegant md:aspect-video">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
        </div>
      )}

      {/* Excerpt lead paragraph */}
      {post.excerpt && (
        <p className="mb-8 max-w-[72ch] border-s-4 border-secondary ps-5 text-lg font-medium leading-relaxed text-foreground/85">
          {post.excerpt}
        </p>
      )}

      {/* Rich text body */}
      {post.content ? (
        <div className="prose prose-lg max-w-[72ch] text-foreground/90 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-secondary prose-a:underline-offset-4 prose-blockquote:border-secondary prose-blockquote:text-foreground/80">
          <RichText content={post.content} />
        </div>
      ) : (
        <p className="text-muted-foreground italic">
          {isAr ? 'لا يوجد محتوى متاح.' : 'No content available.'}
        </p>
      )}
    </div>
  )
}
