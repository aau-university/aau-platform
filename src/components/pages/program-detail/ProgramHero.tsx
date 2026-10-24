'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import type { Locale } from '@/i18n/locale'
import type { AcademicProgram } from '@/payload-types'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'
import { getDegreeLabel } from './ProgramStats'

export function ProgramHero({
  program,
  college,
  locale,
  studyPlanHref,
}: {
  program: AcademicProgram
  college: PublicCollegeDetail
  locale: Locale
  studyPlanHref?: string
}) {
  const isAr = locale === 'ar'
  const degreeLabel = program.degreeType ? getDegreeLabel(program.degreeType, locale) : null

  return (
    <header className="relative flex min-h-[50vh] flex-col justify-end overflow-hidden bg-black pb-24 pt-32">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-foreground" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-black/80 to-transparent" />
        {/* Subtle Gold Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <Container className="relative z-10 flex flex-col">
        <Breadcrumb
          locale={locale}
          className="min-w-0 max-w-full [&_ol]:flex-wrap [&_ol]:gap-y-2 [&_li]:min-w-0 [&_a]:!max-w-full [&_a]:!overflow-visible [&_a]:!whitespace-normal [&_a]:[overflow-wrap:anywhere] [&_[aria-current=page]]:!max-w-full [&_[aria-current=page]]:!overflow-visible [&_[aria-current=page]]:!whitespace-normal [&_[aria-current=page]]:[overflow-wrap:anywhere]"
          items={[
            { label: isAr ? 'الكليات' : 'Colleges', href: '/colleges' },
            { label: college.name, href: `/colleges/${college.slug}` },
            { label: program.name },
          ]}
        />

        <motion.div
          className="mt-8 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="mb-6 flex flex-wrap gap-3">
            <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 hover:bg-secondary/30 py-1.5 px-4 rounded-full text-sm">
              <GraduationCap className="me-2 h-4 w-4" />
              {college.name}
            </Badge>
            {degreeLabel ? (
              <Badge variant="outline" className="border-border text-muted-foreground py-1.5 px-4 rounded-full text-sm bg-black/40 backdrop-blur-md">
                {isAr ? 'الدرجة العلمية' : 'Degree'}: {degreeLabel}
              </Badge>
            ) : null}
          </div>
          
          <h1 className="mb-8 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            {program.name}
          </h1>

          {/* Application is intentionally deferred until the approved route
              exists; the study plan links out when the program has one. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" disabled aria-disabled="true" title={isAr ? 'التقديم الإلكتروني غير متاح من هذه الصفحة حالياً' : 'Online application is not available from this page yet'} className="min-h-11 rounded-full px-8 font-bold sm:w-auto">
              {isAr ? 'سجل في هذا البرنامج' : 'Apply for this Program'}
            </Button>
            {studyPlanHref ? (
              <Button asChild size="lg" variant="outline" className="min-h-11 rounded-full border-secondary/40 px-8 text-white hover:bg-secondary/10 sm:w-auto">
                <Link href={studyPlanHref}>{isAr ? 'الخطة الدراسية' : 'Study Plan'}</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" disabled aria-disabled="true" title={isAr ? 'الخطة الدراسية غير متوفرة لهذا البرنامج حالياً' : 'No study plan is available for this program yet'} className="min-h-11 rounded-full border-border px-8 text-white sm:w-auto">
                {isAr ? 'الخطة الدراسية' : 'Study Plan'}
              </Button>
            )}
          </div>
        </motion.div>
      </Container>
    </header>
  )
}
