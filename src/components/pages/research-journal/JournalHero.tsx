import Link from 'next/link'
import { GraduationCap, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface JournalHeroProps {
  locale: Locale
}

export function JournalHero({ locale }: JournalHeroProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'البحث العلمي' : 'Research' }]}
      badgeIcon={GraduationCap}
      badgeText={isAr ? 'المجلة العلمية المحكّمة' : 'Scientific Peer-Reviewed Journal'}
      title={isAr ? 'مجلة جامعة الجيل الجديد العلمية' : 'Al-Jeel Al-Jadeed University Scientific Journal'}
      description={
        isAr
          ? 'منصة محكمة لأبرز الأبحاث والنتاجات العلمية المتميزة لكوادر الجامعة في مختلف التخصصات الأكاديمية.'
          : 'A peer-reviewed platform for distinguished academic research across multiple disciplines, published by Al-Jeel Al-Jadeed University faculty.'
      }
    >
      <div className="flex flex-wrap gap-4">
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="rounded-2xl font-bold shadow-md bg-secondary text-primary hover:bg-secondary hover:text-white transition-all duration-300"
        >
          <Link href="/research/articles">
            {isAr ? 'تصفح المقالات العلمية' : 'Browse Articles'}
            <ArrowIcon className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </PageHeroLayout>
  )
}
