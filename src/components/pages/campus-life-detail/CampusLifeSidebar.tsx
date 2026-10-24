import {
  BookOpen,
  Users,
  Sparkles,
  Trophy,
  Home,
  Flame,
  Activity,
  Award,
  ShieldCheck,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import type { Locale } from '@/i18n/locale'
import type { PublicCampusLifeDetail } from '@/lib/payload/get-public-campus-life'

export interface CampusLifeSidebarProps {
  item: PublicCampusLifeDetail
  locale: Locale
}

function getHighlightIcon(text: string): LucideIcon {
  const normalized = text.toLowerCase()
  if (
    normalized.includes('طالب') ||
    normalized.includes('طلاب') ||
    normalized.includes('student') ||
    normalized.includes('شباب')
  ) {
    return Users
  }
  if (
    normalized.includes('دراسة') ||
    normalized.includes('أكاديم') ||
    normalized.includes('تعليم') ||
    normalized.includes('academic') ||
    normalized.includes('study') ||
    normalized.includes('learn') ||
    normalized.includes('فصل') ||
    normalized.includes('قاعة') ||
    normalized.includes('مكتبة') ||
    normalized.includes('library')
  ) {
    return BookOpen
  }
  if (
    normalized.includes('رياض') ||
    normalized.includes('نشاط') ||
    normalized.includes('sport') ||
    normalized.includes('activit') ||
    normalized.includes('ملعب') ||
    normalized.includes('جم') ||
    normalized.includes('gym')
  ) {
    return Trophy
  }
  if (
    normalized.includes('سكن') ||
    normalized.includes('غرفة') ||
    normalized.includes('dorm') ||
    normalized.includes('housing') ||
    normalized.includes('مرفق') ||
    normalized.includes('مبنى') ||
    normalized.includes('building')
  ) {
    return Home
  }
  if (
    normalized.includes('صحة') ||
    normalized.includes('علاج') ||
    normalized.includes('health') ||
    normalized.includes('medical') ||
    normalized.includes('عياد')
  ) {
    return Activity
  }
  if (
    normalized.includes('جائزة') ||
    normalized.includes('تفوق') ||
    normalized.includes('أفضل') ||
    normalized.includes('award') ||
    normalized.includes('best') ||
    normalized.includes('مميز') ||
    normalized.includes('فوز')
  ) {
    return Award
  }
  if (
    normalized.includes('أمن') ||
    normalized.includes('سلام') ||
    normalized.includes('أمان') ||
    normalized.includes('safety') ||
    normalized.includes('security') ||
    normalized.includes('safe')
  ) {
    return ShieldCheck
  }
  if (
    normalized.includes('ترفيه') ||
    normalized.includes('ألعاب') ||
    normalized.includes('ترفيهي') ||
    normalized.includes('game') ||
    normalized.includes('play')
  ) {
    return Flame
  }
  return Sparkles
}

export function CampusLifeSidebar({ item, locale }: CampusLifeSidebarProps) {
  const isAr = locale === 'ar'

  const title = item.sidebarTitle || (isAr ? 'تفاصيل المرفق' : 'Facility Details')
  const highlightsTitle = item.highlightsTitle || (isAr ? 'ما يميز المرفق' : 'Highlights')

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-sm hover:shadow-elegant transition-all duration-500">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/95 p-6 text-center border-b border-border/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,97,0.15),transparent_70%)]" />
          <Building2 className="motion-ambient mx-auto mb-2 h-7 w-7 animate-pulse text-secondary" />
          <h2 className="relative z-10 text-base font-bold tracking-wide text-primary-foreground">
            {title}
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-8 rounded-full bg-secondary"></div>
        </div>

        <div className="p-6 space-y-8">
          {/* Highlights */}
          {item.highlights && item.highlights.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {highlightsTitle}
              </h4>
              <ul className="space-y-3.5">
                {item.highlights.map((entry, idx) => {
                  const Icon = getHighlightIcon(entry.highlight)
                  return (
                    <li
                      key={idx}
                      className="group/item flex items-center gap-3.5 p-2 rounded-xl border border-transparent hover:border-secondary/15 hover:bg-secondary/5 transition-all duration-300"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-secondary/20 bg-secondary/5 text-secondary group-hover/item:bg-secondary group-hover/item:text-secondary-foreground transition-all duration-300">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-relaxed text-foreground/90 group-hover/item:text-foreground transition-colors duration-200">
                        {entry.highlight}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Stats */}
          {item.stats && item.stats.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'إحصائيات وأرقام' : 'Stats & Numbers'}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {item.stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="group/stat relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card to-muted/20 p-5 text-center transition-all duration-300 hover:border-secondary/35 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 mb-1 font-display text-3xl font-extrabold text-secondary tracking-tight">
                      {stat.value}
                    </div>
                    <div className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover/stat:text-foreground transition-colors duration-200">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar Note */}
          {item.sidebarNote && (
            <div className="pt-4 border-t border-border/60 text-center">
              <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                {item.sidebarNote}
              </p>
            </div>
          )}
        </div>

        {/* Footer Accent Line */}
        <div className="h-1.5 bg-gradient-to-r from-secondary/80 via-secondary to-secondary/80" />
      </div>
    </div>
  )
}

export default CampusLifeSidebar
