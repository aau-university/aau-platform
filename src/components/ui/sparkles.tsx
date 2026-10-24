'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SparklesProps {
  /** Number of sparkle particles (default 20). */
  count?: number
  /** Particle size range in px: [min, max] (default [1, 3]). */
  size?: [number, number]
  /** Particle color (default 'hsl(var(--secondary))'). */
  color?: string
  /** Sparkle area className (position absolute, inset, etc.). */
  className?: string
}

interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

/**
 * Sparkles — Aceternity/Magic UI style sparkle particles.
 *
 * Renders randomly positioned golden sparkles that fade in/out in a loop.
 * Respects `prefers-reduced-motion` (renders nothing).
 *
 * @example
 * <Sparkles count={20} className="absolute inset-0" />
 */
export function Sparkles({
  count = 20,
  size = [1, 3],
  color = 'hsl(var(--secondary))',
  className,
}: SparklesProps) {
  const shouldReduceMotion = useReducedMotion()
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    if (shouldReduceMotion) return
    const generated: Sparkle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (size[1] - size[0]) + size[0],
      delay: Math.random() * 4,
      duration: Math.random() * 2 + 2,
    }))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSparkles(generated)
    // deps use scalar fields of `size` (a tuple default `[1, 3]` is a fresh
    // array reference each render → would loop setState indefinitely).
  }, [count, size[0], size[1], shouldReduceMotion])

  if (shouldReduceMotion || sparkles.length === 0) return null

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${color}`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
