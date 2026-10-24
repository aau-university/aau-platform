import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { NewsCard } from '@/components/cards/NewsCard'
import type { Locale } from '@/i18n/locale'
import {
  PUBLIC_CONTENT_READ_CONTEXT,
  type ContentReadContext,
} from '@/lib/payload/content-read-context'
import { getCollegeNews, type PublicCollegeNewsItem } from '@/lib/payload/get-public-colleges'

export async function CollegeNews({
  collegeSlug,
  locale,
  readContext = PUBLIC_CONTENT_READ_CONTEXT,
}: {
  collegeSlug: string
  locale: Locale
  readContext?: ContentReadContext
}) {
  const news: PublicCollegeNewsItem[] = await getCollegeNews(
    collegeSlug,
    readContext.draft
      ? { locale, draft: true, user: readContext.user }
      : { locale },
  )

  if (news.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {locale === 'ar' ? 'أحدث الأخبار' : 'Latest News'}
          </h2>
          <Button variant="outline" className="rounded-full">
            {locale === 'ar' ? 'تصفح كل الأخبار' : 'View All News'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => {
             const adaptedNews = {
                id: item.id,
                title: item.title,
                slug: item.slug,
                summary: item.summary,
                publishedAt: item.publishDate,
             }
             return <NewsCard key={item.id} news={adaptedNews as any} isAr={locale === 'ar'} />
          })}
        </div>
      </Container>
    </section>
  )
}
