import Link from 'next/link'
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Locale } from '@/i18n/locale'
import type { PublicOfferDetail } from '@/lib/payload/get-public-offers'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

export interface OfferSidebarProps {
  offer: PublicOfferDetail
  locale: Locale
}

export function OfferSidebar({ offer, locale }: OfferSidebarProps) {
  const isAr = locale === 'ar'
  const ChevronIcon = isAr ? ChevronLeft : ChevronRight

  const formattedValidUntil = offer.validUntil ? formatDateTimeSync(offer.validUntil, locale) : null

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-md transition-colors duration-300 hover:border-secondary/30">
      {/* Application Call to Action */}
      <div className="text-center mb-6">
        <h2 className="mb-2 text-lg font-extrabold text-foreground">
          {offer.interestTitle || (isAr ? 'الاستفادة من العرض' : 'Claim Offer')}
        </h2>
        {offer.interestSubtitle && (
          <p className="text-xs text-muted-foreground">{offer.interestSubtitle}</p>
        )}
      </div>

      {/* Quick Info Grid */}
      <div className="space-y-4 border-t border-muted/50 pt-5">
        {formattedValidUntil && (
          <div className="flex items-start gap-3 text-sm">
            <Calendar className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                {isAr ? 'تاريخ الانتهاء' : 'Valid Until'}
              </p>
              <p className="text-xs text-muted-foreground">{formattedValidUntil}</p>
            </div>
          </div>
        )}

        {offer.duration && (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isAr ? 'المدة' : 'Duration'}</p>
              <p className="text-xs text-muted-foreground">{offer.duration}</p>
            </div>
          </div>
        )}

        {offer.location && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isAr ? 'الموقع' : 'Location'}</p>
              <p className="text-xs text-muted-foreground">{offer.location}</p>
            </div>
          </div>
        )}

        {offer.categoryName && (
          <div className="flex items-start gap-3 text-sm">
            <Award className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isAr ? 'التصنيف' : 'Category'}</p>
              <p className="text-xs text-muted-foreground">{offer.categoryName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Highlights Bullet Points */}
      {offer.interestHighlights && offer.interestHighlights.length > 0 && (
        <div className="mt-6 border-t border-muted/50 pt-5">
          <h4 className="font-bold text-sm text-foreground mb-3">
            {offer.interestHighlightsTitle || (isAr ? 'النقاط الرئيسية' : 'Quick Highlights')}
          </h4>
          <ul className="space-y-2.5">
            {offer.interestHighlights.map((entry, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-muted-foreground leading-normal"
              >
                <CheckCircle className="h-4.5 w-4.5 text-secondary flex-shrink-0 mt-0.5" />
                <span>{entry.highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Notice */}
      {offer.interestNotice && (
        <div className="mt-6 rounded-2xl border border-secondary/20 bg-secondary/5 p-4 text-foreground">
          <div className="flex gap-2 text-xs leading-relaxed">
            <Info className="h-4.5 w-4.5 text-secondary flex-shrink-0 mt-0.5" />
            <span>{offer.interestNotice}</span>
          </div>
        </div>
      )}

      {/* Apply / CTA Button */}
      <div className="mt-8">
        {offer.applyLink ? (
          <a
            href={offer.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-center text-sm font-bold text-primary-foreground shadow-lg transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span>
              {offer.interestOpenTitle || (isAr ? 'التقديم على العرض' : 'Apply for Offer')}
            </span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <Link
            href="/contact"
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-center text-sm font-bold text-primary-foreground shadow-lg transition-colors duration-300 hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span>{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
            <ChevronIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  )
}
