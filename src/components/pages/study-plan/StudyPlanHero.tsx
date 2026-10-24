'use client'

import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Layers, ListChecks } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import type { Locale } from '@/i18n/locale'

export interface StudyPlanHeroProps {
  locale: Locale
  planName: string
  collegeName: string
  collegeSlug: string
  programName: string
  programHref: string
  totalCredits: number
  courseCount: number
  yearCount: number
}

export function StudyPlanHero({
  locale,
  planName,
  collegeName,
  collegeSlug,
  programName,
  programHref,
  totalCredits,
  courseCount,
  yearCount,
}: StudyPlanHeroProps) {
  const isAr = locale === 'ar'

  const stats = [
    { icon: Layers, label: isAr ? 'السنوات' : 'Years', value: yearCount },
    { icon: ListChecks, label: isAr ? 'المقررات' : 'Courses', value: courseCount },
    { icon: BookOpen, label: isAr ? 'الساعات المعتمدة' : 'Credit Hours', value: totalCredits },
  ]

  return (
    <header className="relative flex min-h-[45vh] flex-col justify-end overflow-hidden bg-black pb-16 pt-32 md:pb-20">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-black/80 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      <Container className="relative z-10 flex flex-col">
        <Breadcrumb
          locale={locale}
          className="min-w-0 max-w-full [&_ol]:flex-wrap [&_ol]:gap-y-2 [&_li]:min-w-0 [&_a]:!max-w-full [&_a]:!overflow-visible [&_a]:!whitespace-normal [&_a]:[overflow-wrap:anywhere] [&_[aria-current=page]]:!max-w-full [&_[aria-current=page]]:!overflow-visible [&_[aria-current=page]]:!whitespace-normal [&_[aria-current=page]]:[overflow-wrap:anywhere]"
          items={[
            { label: isAr ? 'الكليات' : 'Colleges', href: '/colleges' },
            { label: collegeName, href: `/colleges/${collegeSlug}` },
            { label: programName, href: programHref },
            { label: isAr ? 'الخطة الدراسية' : 'Study Plan' },
          ]}
        />

        <motion.div
          className="mt-8 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Badge
            variant="secondary"
            className="mb-6 rounded-full border-secondary/30 bg-secondary/20 px-4 py-1.5 text-sm text-secondary hover:bg-secondary/30"
          >
            <GraduationCap className="me-2 h-4 w-4" />
            {programName}
          </Badge>

          <h1 className="mb-8 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            {planName}
          </h1>

          <dl className="flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-secondary/20 bg-black/50 px-4 py-2.5 backdrop-blur-md sm:px-5 sm:py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                  <stat.icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {stat.label}
                  </dt>
                  <dd className="text-lg font-black leading-none text-white">{stat.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </motion.div>
      </Container>
    </header>
  )
}
