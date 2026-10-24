import Image from 'next/image'
import { Users, Library, BookOpen, GraduationCap } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import type { Locale } from '@/i18n/locale'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'
import { resolveLucideIcon } from '@/lib/icons/lucide-icon'

export function CollegeHero({ college, locale }: { college: PublicCollegeDetail; locale: Locale }) {
  // Brand Colors: Black & Gold (Primary)
  // The `icon` field stores a lucide icon *name* (e.g. "Stethoscope"),
  // not display text — map it to the component, falling back to a
  // graduation cap so an unknown/blank value never renders as raw text.
  // Held on an object and rendered via member access (`glyph.Icon`) to
  // match the established icon pattern in ProgramStats/CollegeHero stats.
  const glyph = { Icon: resolveLucideIcon(college.icon) ?? GraduationCap }
  return (
    <div className="relative min-h-[60vh] flex flex-col justify-end overflow-hidden pb-16 pt-32 md:pb-32 md:pt-40 bg-black">
      <div className="absolute inset-0 z-0">
        {college.image ? (
          <Image
            src={college.image}
            alt={college.name}
            fill
            sizes="100vw"
            className="object-cover scale-105 animate-in zoom-in duration-1000 ease-out opacity-60"
            preload
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-black/80 to-transparent" />
        {/* Subtle Gold Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <Container className="relative z-10 flex flex-col items-center text-center">
        <Breadcrumb
          locale={locale}
          items={[
            { label: locale === 'ar' ? 'كلياتنا' : 'Our Colleges', href: '/colleges' },
            { label: college.name },
          ]}
        />
        
        <div className="mt-8 max-w-4xl mx-auto">
          {college.icon && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-8 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)] border border-secondary/30 text-secondary animate-in slide-in-from-bottom-4 duration-700">
              <glyph.Icon className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true" />
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-white drop-shadow-2xl">
            {college.name}
          </h1>
        </div>
      </Container>

      <dl className="relative z-20 mx-auto mt-12 flex max-w-md flex-wrap justify-center gap-3 px-4 md:absolute md:inset-x-0 md:bottom-8 md:mt-0 md:max-w-none md:gap-4">
        {[
          { label: locale === 'ar' ? 'أعضاء التدريس' : 'Faculty', value: college.facultyCount, icon: Users },
          { label: locale === 'ar' ? 'الأقسام' : 'Departments', value: college.departmentsCount, icon: Library },
          { label: locale === 'ar' ? 'البرامج' : 'Programs', value: college.programsCount, icon: BookOpen },
        ].map((stat, i) => (
          <div
            key={i} 
            className="flex items-center gap-3 sm:gap-4 bg-black/60 backdrop-blur-xl border border-secondary/20 rounded-2xl sm:rounded-full py-2.5 px-4 sm:py-3 sm:px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-black/80 hover:border-secondary/50 transition-all duration-300 hover:-translate-y-1 w-[calc(50%-6px)] md:w-auto shrink-0"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center text-primary shadow-[0_0_15px_rgba(234,179,8,0.4)] shrink-0">
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-start rtl:text-right min-w-0">
              <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">{stat.label}</dt>
              <dd className="mt-1 truncate text-lg font-black leading-none text-white sm:text-xl">{stat.value || 0}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
