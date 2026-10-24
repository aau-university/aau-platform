import Link from 'next/link'
import { Gift, School } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'
import type { PublicOfferDetail } from '@/lib/payload/get-public-offers'

export interface OfferHeroProps {
  offer: PublicOfferDetail
  locale: Locale
}

export function OfferHero({ offer, locale }: OfferHeroProps) {
  const isAr = locale === 'ar'

  const breadcrumbItems = [
    { label: isAr ? 'العروض والخصومات' : 'Offers & Discounts', href: '/offers' },
    { label: offer.title },
  ]

  return (
    <Container>
      <Breadcrumb items={breadcrumbItems} locale={locale} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {offer.categoryName && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Gift className="h-3.5 w-3.5" />
            {offer.categoryName}
          </span>
        )}
        {offer.college && (
          <Link
            href={`/colleges/${offer.college.slug}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <School className="h-3.5 w-3.5 text-secondary" />
            {offer.college.name}
          </Link>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {offer.title}
      </h1>
    </Container>
  )
}
