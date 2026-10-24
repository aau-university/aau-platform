import { Calendar, CheckCircle2 } from 'lucide-react'
import type { Locale } from '@/i18n/locale'
import type { PublicProjectDetail } from '@/lib/payload/get-public-projects'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

export interface ProjectSidebarProps {
  project: PublicProjectDetail
  locale: Locale
}

export function ProjectSidebar({ project, locale }: ProjectSidebarProps) {
  const isAr = locale === 'ar'
  const progress = typeof project.progress === 'number' ? project.progress : null

  // SVG Radial parameters
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const validProgress = progress !== null ? Math.min(100, Math.max(0, progress)) : 0
  const strokeDashoffset = circumference - (validProgress / 100) * circumference

  // Gregorian dates via the shared formatter — `toLocaleDateString('ar-SA')`
  // defaults to the Hijri (Umm al-Qura) calendar, which clashed with the
  // Gregorian dates the rest of the site renders (e.g. NewsCard).
  const formatDate = (dateString: string) => formatDateTimeSync(dateString, locale)

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-md transition-colors duration-300 hover:border-secondary/30">
      {/* Dashboard Radial Progress Widget */}
      {project.projectStatus !== 'planned' && progress !== null ? (
        <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl border border-muted/50 mb-6">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
            {isAr ? 'معدل التقدم والإنجاز' : 'Completion Rate'}
          </span>

          <div className="relative flex items-center justify-center select-none">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-muted/40"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-secondary"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-black text-foreground">{progress}%</span>
          </div>

          <span className="text-xs font-bold text-foreground mt-4">
            {progress === 100
              ? isAr
                ? 'مكتمل بنسبة 100%'
                : 'Fully Completed'
              : isAr
                ? 'قيد التطوير والتنفيذ'
                : 'Under Development'}
          </span>
        </div>
      ) : (
        // If planned
        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-secondary/10 bg-gradient-to-br from-secondary/5 to-transparent py-6">
          <Calendar className="mb-3 h-10 w-10 text-secondary" />
          <span className="text-sm font-extrabold text-foreground">
            {isAr ? 'مرحلة التخطيط' : 'Planning Phase'}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            {isAr ? 'لم يبدأ العمل الفعلي بعد' : 'Development has not started yet'}
          </span>
        </div>
      )}

      {/* Timeframes and Dates */}
      <div className="space-y-4 border-t border-muted/50 pt-5">
        {project.startDate && (
          <div className="flex items-start gap-3 text-sm">
            <Calendar className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isAr ? 'تاريخ البدء' : 'Start Date'}</p>
              <p className="text-xs text-muted-foreground">{formatDate(project.startDate)}</p>
            </div>
          </div>
        )}

        {project.endDate && (
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                {isAr ? 'تاريخ الانتهاء المتوقع' : 'Target/Completion Date'}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(project.endDate)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
