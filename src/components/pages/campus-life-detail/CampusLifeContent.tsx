import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Card, CardContent } from '@/components/ui/card'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicCampusLifeDetail } from '@/lib/payload/get-public-campus-life'

export interface CampusLifeContentProps {
  item: PublicCampusLifeDetail
  locale: Locale
  sidebar: ReactNode
}

export function CampusLifeContent({ item, locale, sidebar }: CampusLifeContentProps) {
  const isAr = locale === 'ar'
  const hasContent = !!item.content && typeof item.content === 'object' && 'root' in item.content

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Decorative Brand Accent */}
      <div className="absolute top-0 rtl:left-0 ltr:right-0 w-1/4 h-full bg-secondary/5 rounded-br-[100px] rtl:rounded-br-none rtl:rounded-bl-[100px] z-0 pointer-events-none" />

      <DetailPageShell className="relative z-10" sidebar={sidebar}>
        <div className="space-y-8">
          {/* About/Content */}
          {hasContent ? (
            <Card className="border-border/80 bg-card shadow-sm rounded-[2rem] overflow-hidden hover:shadow-elegant transition-all duration-500">
              <CardContent className="p-6 sm:p-10">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground">
                  <div className="h-6 w-1.5 rounded-full bg-secondary"></div>
                  <Info className="w-6 h-6 text-secondary shrink-0" />
                  {isAr ? 'عن المرفق / النشاط' : 'About the Facility / Activity'}
                </h2>
                <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg prose-headings:font-bold prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground prose-strong:font-extrabold prose-ul:list-disc prose-ul:marker:text-secondary prose-ul:my-4 prose-li:my-2 prose-li:leading-relaxed prose-li:ps-1 prose-blockquote:border-s-4 prose-blockquote:border-secondary prose-blockquote:bg-secondary/5 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-e-xl prose-blockquote:italic prose-a:text-secondary prose-a:no-underline hover:prose-a:underline hover:prose-a:text-secondary/80 transition-colors duration-200">
                  <RichText content={item.content} />
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Empty state fallback */
            <Card className="border-border/80 bg-card shadow-sm rounded-[2rem] p-12 text-center">
              <CardContent>
                <p className="text-muted-foreground text-lg">
                  {isAr
                    ? 'لا يوجد محتوى تفصيلي متوفر حالياً.'
                    : 'No detailed content available at the moment.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DetailPageShell>
    </section>
  )
}

export default CampusLifeContent
