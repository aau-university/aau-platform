import Link from 'next/link'
import { Building2, Mail, Phone, ArrowRight, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import type { Locale } from '@/i18n/locale'
import type { PublicCenterItem } from '@/lib/payload/get-public-centers'

export interface CenterSidebarProps {
  relatedCenters: PublicCenterItem[]
  locale: Locale
  contactInfo: {
    email?: string | null
    phone?: string | null
  }
}

export function CenterSidebar({ relatedCenters, locale, contactInfo }: CenterSidebarProps) {
  const isAr = locale === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight

  return (
    <div className="space-y-6">
      {/* Other Centers List */}
      {relatedCenters.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/95 p-5 text-center">
            <Building2 className="motion-ambient mx-auto mb-2 h-7 w-7 animate-pulse text-primary-foreground/80" />
            <h2 className="text-base font-bold text-primary-foreground">
              {isAr ? 'مراكز وأقسام أخرى' : 'Other Centers & Departments'}
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-8 rounded-full bg-secondary"></div>
          </div>

          <div className="max-h-[350px] space-y-2 overflow-y-auto p-4 scrollbar-thin">
            {relatedCenters.map((item) => (
              <Link
                key={item.id}
                href={`/centers/${item.slug}`}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex gap-3 rounded-xl border border-transparent p-2.5 transition-all duration-300 hover:border-secondary/20 hover:bg-secondary/5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 transition-colors group-hover:from-primary/20 group-hover:to-secondary/20">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-xs sm:text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-secondary">
                      {item.title}
                    </h4>
                    {item.description ? (
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-4 pt-0">
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-border/80 text-foreground hover:bg-muted group/btn text-xs"
            >
              <Link href="/centers" className="flex items-center justify-center gap-2">
                <span>{isAr ? 'تصفح جميع المراكز' : 'Browse All Centers'}</span>
                <Arrow className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Contact Card */}
      {(contactInfo.email || contactInfo.phone) && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
          <h2 className="mb-3 flex items-center justify-center gap-2 text-base font-bold text-foreground">
            {isAr ? 'معلومات التواصل' : 'Contact Info'}
          </h2>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            {isAr
              ? 'تواصل مع إدارة المركز للاستفسار والحصول على المزيد من المعلومات.'
              : "Contact the center's administration for inquiries and more information."}
          </p>
          <div className="space-y-2">
            {contactInfo.phone && (
              <Button
                asChild
                variant="secondary"
                className="w-full rounded-full gap-2 font-bold shadow-sm py-2.5"
              >
                <a href={`tel:${contactInfo.phone}`} className="flex items-center justify-center">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span dir="ltr">{contactInfo.phone}</span>
                </a>
              </Button>
            )}
            {contactInfo.email && (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full gap-2 font-semibold border-secondary/25 hover:border-secondary hover:bg-secondary/5 py-2.5"
              >
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center justify-center"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{contactInfo.email}</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default CenterSidebar
