import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { StudyPlan } from '@/payload-types'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface StudyPlansGridSectionProps {
  items: StudyPlan[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function StudyPlansGridSection({
  items,
  sectionContent,
  disableInnerContainer,
}: StudyPlansGridSectionProps) {
  const title = sectionContent?.title || 'الخطط الدراسية'
  const description = sectionContent?.description

  const inner = (
    <div className="flex flex-col gap-12">
      <SectionHeader title={title} description={description || undefined} />
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center">لا توجد خطط دراسية حالياً.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-xl overflow-hidden border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <h3 className="font-semibold">{item.name}</h3>
                {/* The "الحالة: فعال / غير فعال" line that used to sit here read
                    the collection's own `isActive` checkbox. Study plans now use
                    Payload's draft workflow and this grid is fed by a loader
                    that filters to `_status: 'published'`, so the line could
                    only ever have rendered "فعال" — it told a visitor nothing
                    and would misreport the moment the field was removed. */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-950">
      <Container>{inner}</Container>
    </section>
  )
}
