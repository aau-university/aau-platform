'use client'

import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PublicProgramItem } from '@/lib/payload/get-public-programs'
import { buildAcademicProgramPath } from '@/utilities/collectionRoutes'

export type ProgramCardProps = {
  program: PublicProgramItem
  className?: string
  isAr?: boolean
}

const DEGREE_LABELS_AR: Record<NonNullable<PublicProgramItem['degreeType']>, string> = {
  diploma: 'دبلوم',
  bachelor: 'بكالوريوس',
  master: 'ماجستير',
  phd: 'دكتوراه',
}

const DEGREE_LABELS_EN: Record<NonNullable<PublicProgramItem['degreeType']>, string> = {
  diploma: 'Diploma',
  bachelor: 'Bachelor',
  master: 'Master',
  phd: 'PhD',
}

export function ProgramCard({
  program,
  className,
  isAr = false,
}: ProgramCardProps) {
  const {
    name,
    slug,
    description,
    degreeType,
    studyYears,
    admissionRate,
    image,
    collegeName,
    collegeSlug,
  } = program

  const linkHref = buildAcademicProgramPath(collegeSlug, slug) ?? '#'

  const degreeLabel =
    degreeType != null
      ? isAr
        ? DEGREE_LABELS_AR[degreeType]
        : DEGREE_LABELS_EN[degreeType]
      : null

  const content = (
    <article
      className={cn(
        'group relative bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden border border-border/50 hover:border-secondary/35 shadow-sm hover:shadow-gold transition-all duration-500 h-full flex flex-col',
        className,
      )}
    >
      {/* Top Banner */}
      <div className="relative aspect-[16/10] w-full overflow-hidden shrink-0 bg-primary/10">
        {image ? (
          <>
            <Image
              src={image}
              alt={name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#111] to-primary flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent" />
            <div className="relative z-10 w-16 h-16 bg-card/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border/20 text-secondary group-hover:rotate-[360deg] group-hover:scale-110 transition-all duration-700">
              <GraduationCap className="w-8 h-8 text-secondary" />
            </div>
          </div>
        )}

        {/* Degree Badge */}
        {degreeLabel && (
          <Badge className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-10 bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold shadow-md rounded-full px-3 py-1 text-xs">
            {degreeLabel}
          </Badge>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-grow relative">
        {collegeName && (
          <p className="text-xs text-secondary font-bold mb-2 uppercase tracking-wide">
            {collegeName}
          </p>
        )}
        <h3 className="text-xl font-bold line-clamp-2 mb-3 text-foreground group-hover:text-secondary transition-colors duration-300">
          {name}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-3 flex-grow leading-relaxed mb-4">
            {description}
          </p>
        )}

        {/* Meta row: study years + admission rate */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
          {studyYears && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold text-foreground/80">
                {isAr ? 'مدة الدراسة:' : 'Duration:'}
              </span>{' '}
              {studyYears}
            </span>
          )}
          {admissionRate != null && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold text-foreground/80">
                {isAr ? 'القبول:' : 'Admission:'}
              </span>{' '}
              {admissionRate}%
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center text-sm font-bold text-secondary group-hover:text-secondary-foreground/90 transition-colors duration-300 gap-1 rtl:flex-row-reverse justify-end">
          <span>{isAr ? 'تفاصيل البرنامج' : 'Program Details'}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
            {isAr ? '←' : '→'}
          </span>
        </div>
      </div>
    </article>
  )

  if (linkHref === '#') return content

  return (
    <Link href={linkHref} className="block h-full cursor-pointer" aria-label={name}>
      {content}
    </Link>
  )
}

export default ProgramCard
