'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ShimmerTextProps {
  children: React.ReactNode
  /** Shimmer color (default 'hsl(var(--secondary))'). */
  color?: string
  /** Animation duration in seconds (default 3). */
  duration?: number
  className?: string
}

/**
 * ShimmerText — Magic UI style shimmering text.
 *
 * Applies a moving golden gradient sweep across the text content.
 * Respects `prefers-reduced-motion` (renders static text).
 *
 * @example
 * <ShimmerText>جامعة الجيل الجديد</ShimmerText>
 */
export function ShimmerText({
  children,
  color = 'hsl(var(--secondary))',
  duration = 3,
  className,
}: ShimmerTextProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <span className={className}>{children}</span>
  }

  return (
    <motion.span
      className={cn('relative inline-block', className)}
      style={{
        background: `linear-gradient(110deg, transparent 30%, ${color} 50%, transparent 70%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  )
}
