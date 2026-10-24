'use client'

import { Calendar, GraduationCap, Target, BookOpen } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'
import type { AcademicProgram } from '@/payload-types'

interface ProgramStat {
  icon: typeof GraduationCap
  label: string
  value: string
}

export function getDegreeLabel(
  degreeType: NonNullable<AcademicProgram['degreeType']> | string,
  locale: Locale,
) {
  const degreeLabels: Record<NonNullable<AcademicProgram['degreeType']>, string> = {
    diploma: locale === 'ar' ? 'دبلوم' : 'Diploma',
    bachelor: locale === 'ar' ? 'بكالوريوس' : 'Bachelor',
    master: locale === 'ar' ? 'ماجستير' : 'Master',
    phd: locale === 'ar' ? 'دكتوراه' : 'PhD',
  }

  return degreeType in degreeLabels
    ? degreeLabels[degreeType as keyof typeof degreeLabels]
    : degreeType
}

function buildProgramStats(program: AcademicProgram, locale: Locale): ProgramStat[] {
  const stats: ProgramStat[] = []

  if (program.degreeType) {
    stats.push({
      icon: GraduationCap,
      label: locale === 'ar' ? 'الدرجة العلمية' : 'Degree',
      value: getDegreeLabel(program.degreeType, locale),
    })
  }

  if (program.duration) {
    stats.push({
      icon: Calendar,
      label: locale === 'ar' ? 'المدة' : 'Duration',
      value: program.duration,
    })
  }

  if (program.studyYears) {
    stats.push({
      icon: Calendar,
      label: locale === 'ar' ? 'سنوات الدراسة' : 'Study Years',
      value: program.studyYears,
    })
  }

  if (program.highSchoolType) {
    stats.push({
      icon: BookOpen,
      label: locale === 'ar' ? 'نوع الثانوية' : 'High School Type',
      value: program.highSchoolType,
    })
  }

  if (typeof program.admissionRate === 'number') {
    stats.push({
      icon: Target,
      label: locale === 'ar' ? 'نسبة القبول' : 'Admission Rate',
      value: `${program.admissionRate}%`,
    })
  }

  return stats
}

export function ProgramStats({
  program,
  locale,
}: {
  program: AcademicProgram
  locale: Locale
}) {
  const stats = buildProgramStats(program, locale)

  if (stats.length === 0) return null

  return (
    <div className="relative -mt-10 z-20">
      <Container>
        <dl className="grid grid-cols-1 gap-2 rounded-3xl border border-border bg-card p-3 shadow-elegant sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-2xl p-4 text-start sm:flex-col sm:text-center"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <stat.icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-lg font-bold text-foreground">{stat.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  )
}
