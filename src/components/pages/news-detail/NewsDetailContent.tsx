import Image from 'next/image'
import { Image as ImageIcon } from 'lucide-react'
import { RichText } from '@/components/RichText'
import type { PublicNewsDetail } from '@/lib/payload/get-public-news'

export interface NewsDetailContentProps {
  news: PublicNewsDetail
}

export function NewsDetailContent({ news }: NewsDetailContentProps) {
  return (
    <div className="space-y-8">
      {/* Featured Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-elegant md:aspect-video">
        {news.image ? (
          <Image
            src={news.image}
            alt={news.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/20">
            <ImageIcon className="h-24 w-24 stroke-[1.1]" />
          </div>
        )}
      </div>

      {/* Summary Abstract Block */}
      {news.summary && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md border-l-4 border-l-secondary rtl:border-l-0 rtl:border-r-4 rtl:border-r-secondary">
          <p className="max-w-[72ch] text-lg font-medium leading-relaxed text-muted-foreground italic md:text-xl">
            &ldquo;{news.summary}&rdquo;
          </p>
        </div>
      )}

      {/* Full Rich Text Content */}
      {news.content && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed prose-headings:font-bold prose-headings:text-foreground prose-a:text-secondary hover:prose-a:underline">
            <RichText content={news.content} />
          </div>
        </div>
      )}
    </div>
  )
}
