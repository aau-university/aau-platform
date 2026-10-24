import Image from 'next/image'
import { Gift, Users, CheckCircle } from 'lucide-react'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicOfferDetail } from '@/lib/payload/get-public-offers'

export interface OfferContentProps {
  offer: PublicOfferDetail
  locale: Locale
}

export function OfferContent({ offer, locale }: OfferContentProps) {
  const isAr = locale === 'ar'

  return (
    <div className="space-y-8">
      {/* Featured Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-elegant md:aspect-video">
        {offer.image ? (
          <Image
            src={offer.image}
            alt={offer.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/20">
            <Gift className="h-24 w-24 stroke-[1.1]" />
          </div>
        )}
      </div>

      {/* About / Details Section */}
      {offer.details && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <h2 className="mb-6 text-xl font-bold md:text-2xl border-b border-muted pb-4 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'تفاصيل العرض' : 'Offer Details'}
          </h2>
          <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed">
            <RichText content={offer.details} />
          </div>
        </div>
      )}

      {/* Benefits Section */}
      {offer.benefits && (
        <div className="rounded-3xl border border-secondary/20 bg-gradient-to-br from-secondary/5 via-transparent to-transparent p-6 sm:p-8 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-primary md:text-xl">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'المزايا والفوائد' : 'Benefits & Perks'}
          </h2>
          <div className="prose prose-lg max-w-[72ch] text-foreground leading-relaxed">
            <RichText content={offer.benefits} />
          </div>
        </div>
      )}

      {/* Eligibility & Requirements Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {offer.targetAudience && (
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <Users className="h-4.5 w-4.5 text-secondary" />
              {isAr ? 'الفئات المستهدفة' : 'Target Audience'}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{offer.targetAudience}</p>
          </div>
        )}

        {offer.requirements && (
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
              <CheckCircle className="h-4.5 w-4.5 text-secondary" />
              {isAr ? 'الشروط والمتطلبات' : 'Prerequisites & Requirements'}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{offer.requirements}</p>
          </div>
        )}
      </div>
    </div>
  )
}
