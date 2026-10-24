import { CollegeCard } from '@/components/cards/CollegeCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { Locale } from '@/i18n/locale'
import { getPublicCollegesList } from '@/lib/payload/get-public-colleges'

export async function CollegesList({ locale }: { locale: Locale }) {
  const colleges = await getPublicCollegesList({ locale, limit: 50 })

  if (colleges.length === 0) {
    return (
      <EmptyState
        title={locale === 'ar' ? 'لا توجد كليات' : 'No colleges found'}
        message={
          locale === 'ar'
            ? 'لم نتمكن من العثور على كليات في الوقت الحالي. حاول مرة أخرى لاحقًا.'
            : 'We could not find any colleges right now. Please check back later.'
        }
      />
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {colleges.map((college) => (
        <CollegeCard key={college.id} college={college} isAr={locale === 'ar'} />
      ))}
    </div>
  )
}
