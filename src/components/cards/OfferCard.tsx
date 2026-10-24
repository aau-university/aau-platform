'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Tag, Calendar, MapPin, Clock, ArrowLeft, ArrowRight, School } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { PublicOfferItem } from '@/lib/payload/get-public-offers'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

export type OfferCardProps = {
  offer: PublicOfferItem
  className?: string
}

export function OfferCard({ offer, className }: OfferCardProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const { title, slug, description, categoryName, duration, location, validUntil, image, college } =
    offer

  const formattedValidUntil = validUntil ? formatDateTimeSync(validUntil, language) : null

  const linkHref = `/offers/${slug}`

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-elegant backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
    >
      {/* Image Header */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-muted/40">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/30">
            <Tag className="h-12 w-12 stroke-[1.2]" />
          </div>
        )}

        {/* Floating Badges */}
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap gap-2">
          {categoryName && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-primary/85 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
              <Tag className="h-3 w-3 text-secondary" />
              {categoryName}
            </span>
          )}
          {college && (
            <span className="inline-flex items-center gap-1 rounded-xl border border-secondary/30 bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
              <School className="h-3 w-3 text-secondary" />
              {college.name}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          <Link
            href={linkHref}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {title}
          </Link>
        </h3>

        {description && (
          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {/* Metadata Details */}
        <div className="mt-auto space-y-3 border-t border-muted/50 pt-5 text-sm">
          {formattedValidUntil && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                <strong className="font-semibold text-foreground">
                  {isAr ? 'صالح حتى:' : 'Valid until:'}
                </strong>{' '}
                {formattedValidUntil}
              </span>
            </div>
          )}

          {duration && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                <strong className="font-semibold text-foreground">
                  {isAr ? 'المدة:' : 'Duration:'}
                </strong>{' '}
                {duration}
              </span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-secondary" />
              <span>
                <strong className="font-semibold text-foreground">
                  {isAr ? 'الموقع:' : 'Location:'}
                </strong>{' '}
                {location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-muted/40 bg-muted/10 p-5 pt-4">
        <Button asChild variant="secondary" className="w-full">
          <Link href={linkHref} aria-label={`${isAr ? 'تفاصيل العرض' : 'Offer details'}: ${title}`}>
            <span>{isAr ? 'تفاصيل العرض' : 'Offer Details'}</span>
            {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Link>
        </Button>
      </div>
    </article>
  )
}

export default OfferCard
