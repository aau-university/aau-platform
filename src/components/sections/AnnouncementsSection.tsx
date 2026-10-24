import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locale'
import type { Announcement } from '@/payload-types'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface AnnouncementsSectionProps {
  items: Announcement[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
  /** Active locale — controls date formatting + bilingual fallback strings. */
  locale?: Locale
}

export function AnnouncementsSection({
  items,
  sectionContent,
  disableInnerContainer,
  locale = DEFAULT_LOCALE,
}: AnnouncementsSectionProps) {
  const isAr = locale === 'ar'
  const title = sectionContent?.title || (isAr ? 'الإعلانات والتعاميم' : 'Announcements')
  const description = sectionContent?.description
  const emptyText = isAr ? 'لا توجد إعلانات حالياً.' : 'No announcements available.'

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader title={title} description={description || undefined} />
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-lg border bg-card text-card-foreground shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              {item.publishDate && (
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTimeSync(item.publishDate, locale)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-12 bg-white dark:bg-slate-950">
      <Container>{inner}</Container>
    </section>
  )
}
