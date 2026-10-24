import type { ReactNode } from 'react'
import { CheckCircle2, Bookmark, Info } from 'lucide-react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Card, CardContent } from '@/components/ui/card'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicCenterDetail } from '@/lib/payload/get-public-centers'

export interface CenterContentProps {
  center: PublicCenterDetail
  locale: Locale
  sidebar: ReactNode
}

export function CenterContent({ center, locale, sidebar }: CenterContentProps) {
  const isAr = locale === 'ar'

  const hasServices =
    !!center.services && typeof center.services === 'object' && 'root' in center.services
  const hasPrograms =
    !!center.programs && typeof center.programs === 'object' && 'root' in center.programs

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Decorative Brand Accent (Linking this section visually to the rest of the site) */}
      <div className="absolute top-0 rtl:left-0 ltr:right-0 w-1/4 h-full bg-secondary/5 rounded-br-[100px] rtl:rounded-br-none rtl:rounded-bl-[100px] z-0 pointer-events-none" />

      <DetailPageShell className="relative z-10" sidebar={sidebar}>
        <div className="space-y-8">
          {/* Description/About */}
          {center.description && (
            <Card className="border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden hover:shadow-elegant transition-all duration-500">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground">
                  <div className="h-6 w-1.5 rounded-full bg-secondary"></div>
                  <Info className="w-6 h-6 text-secondary shrink-0" />
                  {isAr ? 'نبذة عن المركز' : 'About the Center'}
                </h2>
                <p className="max-w-[72ch] text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {center.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Services */}
          {hasServices && (
            <Card className="border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden hover:shadow-elegant transition-all duration-500">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground">
                  <div className="h-6 w-1.5 rounded-full bg-primary"></div>
                  <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                  {isAr ? 'الخدمات المقدمة' : 'Our Services'}
                </h2>
                <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg prose-headings:font-bold prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground prose-strong:font-extrabold prose-ul:list-disc prose-ul:marker:text-secondary prose-ul:my-4 prose-li:my-2 prose-li:leading-relaxed prose-li:ps-1 prose-blockquote:border-s-4 prose-blockquote:border-secondary prose-blockquote:bg-secondary/5 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-e-xl prose-blockquote:italic prose-a:text-secondary prose-a:no-underline hover:prose-a:underline hover:prose-a:text-secondary/80 transition-colors duration-200">
                  <RichText content={center.services} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Programs */}
          {hasPrograms && (
            <Card className="border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden hover:shadow-elegant transition-all duration-500">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground">
                  <div className="h-6 w-1.5 rounded-full bg-secondary"></div>
                  <Bookmark className="w-6 h-6 text-secondary shrink-0" />
                  {isAr ? 'البرامج والأنشطة' : 'Programs & Activities'}
                </h2>
                <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg prose-headings:font-bold prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground prose-strong:font-extrabold prose-ul:list-disc prose-ul:marker:text-secondary prose-ul:my-4 prose-li:my-2 prose-li:leading-relaxed prose-li:ps-1 prose-blockquote:border-s-4 prose-blockquote:border-secondary prose-blockquote:bg-secondary/5 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-e-xl prose-blockquote:italic prose-a:text-secondary prose-a:no-underline hover:prose-a:underline hover:prose-a:text-secondary/80 transition-colors duration-200">
                  <RichText content={center.programs} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state fallback */}
          {!center.description && !hasServices && !hasPrograms && (
            <Card className="border-border/80 bg-card shadow-sm rounded-2xl p-12 text-center">
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
export default CenterContent
