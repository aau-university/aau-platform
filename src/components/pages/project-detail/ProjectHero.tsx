import { Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'
import type { PublicProjectDetail } from '@/lib/payload/get-public-projects'
import { cn } from '@/lib/utils'

export interface ProjectHeroProps {
  project: PublicProjectDetail
  locale: Locale
}

export function ProjectHero({ project, locale }: ProjectHeroProps) {
  const isAr = locale === 'ar'

  const breadcrumbItems = [
    {
      label: isAr ? 'أستوديو المشاريع' : 'Projects Studio',
      href: '/projects-studio',
    },
    { label: project.title },
  ]

  const statusInfo = {
    completed: {
      label: isAr ? 'منجز بالكامل' : 'Completed',
      class: 'border-secondary/30 bg-secondary/10 text-foreground',
      icon: CheckCircle2,
    },
    current: {
      label: isAr ? 'جاري التنفيذ' : 'Active Development',
      class: 'border-primary/20 bg-primary/5 text-primary',
      icon: Clock,
    },
    planned: {
      label: isAr ? 'مخطط له' : 'Planned',
      class: 'border-border bg-muted text-muted-foreground',
      icon: Calendar,
    },
  }

  const status =
    project.projectStatus && statusInfo[project.projectStatus]
      ? statusInfo[project.projectStatus]
      : statusInfo.planned
  const StatusIcon = status.icon

  return (
    <Container>
      <Breadcrumb items={breadcrumbItems} locale={locale} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold shadow-sm',
            status.class,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
        {project.year && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            {isAr ? `العام الدراسي: ${project.year}` : `Academic Year: ${project.year}`}
          </span>
        )}
      </div>

      <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {project.title}
      </h1>
    </Container>
  )
}
