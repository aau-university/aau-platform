'use client'

import type { ComponentType, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  /** Optional pill icon (lucide icon component). */
  icon?: ComponentType<{ className?: string }>
  /** Pill text. */
  badge?: string
  /** Main heading. */
  title: string
  /** Optional sub-heading. */
  description?: string
  className?: string
  children?: ReactNode
}

/**
 * SectionHeader — pill + gradient heading + description.
 *
 * Ported from the repeated pattern in the legacy `CollegesSection`,
 * `NewsSection`, `EventsSection`, etc. Centralising it keeps every
 * section visually consistent.
 */
export function SectionHeader({
  icon: Icon,
  badge,
  title,
  description,
  className,
  children,
}: SectionHeaderProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('text-center mb-10 md:mb-12', className)}
      initial={shouldReduceMotion ? false : 'hidden'}
      whileInView={shouldReduceMotion ? undefined : 'visible'}
      viewport={defaultViewport}
      variants={animationPresets.fadeUp}
    >
      {badge && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-foreground/25 bg-secondary/10 px-4 py-2 text-xs font-bold tracking-wide text-gold-foreground shadow-sm sm:text-sm">
          {Icon && <Icon className="w-4 h-4" />}
          <span>{badge}</span>
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6 text-foreground leading-tight">
        {title}
      </h2>
      {description && (
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </motion.div>
  )
}
