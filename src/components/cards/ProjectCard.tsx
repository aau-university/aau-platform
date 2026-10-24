'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { PublicProjectItem } from '@/lib/payload/get-public-projects'

export type ProjectCardProps = {
  project: PublicProjectItem
  className?: string
}

function AnimatedCounter({
  value,
  reduceMotion,
  duration = 1.2,
}: {
  value: number
  reduceMotion: boolean
  duration?: number
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (reduceMotion) return

    let start = 0
    const end = value
    if (start === end) {
      return
    }

    const totalMiliseconds = duration * 1000
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 16)

    const timer = setInterval(() => {
      start += 1
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [value, duration, reduceMotion])

  return <span>{reduceMotion || value === 0 ? value : count}</span>
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const shouldReduceMotion = useReducedMotion() ?? false

  const { title, slug, description, image, progress, projectStatus, year } = project

  const linkHref = `/projects-studio/${slug}`

  // SVG Radial Progress parameters
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const validProgress = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0
  const strokeDashoffset = circumference - (validProgress / 100) * circumference

  // Status mapping
  const statusInfo = {
    completed: {
      label: isAr ? 'منجز' : 'Completed',
      class: 'border-secondary/35 bg-secondary/15 text-foreground',
    },
    current: {
      label: isAr ? 'جاري التنفيذ' : 'Active',
      class: 'border-primary/25 bg-primary/10 text-foreground',
    },
    planned: {
      label: isAr ? 'مخطط له' : 'Planned',
      class: 'border-border bg-muted text-muted-foreground',
    },
  }

  const status =
    projectStatus && statusInfo[projectStatus] ? statusInfo[projectStatus] : statusInfo.planned

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-elegant backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
    >
      {/* Thumbnail Area */}
      <div className="relative h-48 w-full overflow-hidden bg-muted/40 shrink-0">
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
            <FolderOpen className="h-12 w-12 stroke-[1.2]" />
          </div>
        )}

        {/* Floating Badges */}
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md',
              status.class,
            )}
          >
            {status.label}
          </span>
          {year && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-primary/85 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm backdrop-blur-md">
              <Calendar className="h-3 w-3 text-secondary" />
              {year}
            </span>
          )}
        </div>
      </div>

      {/* Body & Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary flex-1">
            <Link
              href={linkHref}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {title}
            </Link>
          </h3>

          {/* SVG Circular Radial Progress Dashboard Style */}
          {projectStatus !== 'planned' && progress !== null && (
            <div className="relative flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors duration-300 group-hover:border-secondary/30">
              <svg className="w-12 h-12 transform -rotate-90">
                {/* Background track circle */}
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-muted"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                {/* Active progress circle */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-secondary"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={
                    shouldReduceMotion ? { strokeDashoffset } : { strokeDashoffset: circumference }
                  }
                  whileInView={shouldReduceMotion ? undefined : { strokeDashoffset }}
                  viewport={{ once: true }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }
                  }
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-foreground">
                <AnimatedCounter value={validProgress} reduceMotion={shouldReduceMotion} />%
              </span>
            </div>
          )}
        </div>

        {description && (
          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="border-t border-muted/40 bg-muted/10 p-5 pt-4 mt-auto shrink-0">
        <Button asChild variant="secondary" className="w-full">
          <Link
            href={linkHref}
            aria-label={`${isAr ? 'عرض تفاصيل المشروع' : 'View project details'}: ${title}`}
          >
            <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
            {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Link>
        </Button>
      </div>
    </article>
  )
}

export default ProjectCard
