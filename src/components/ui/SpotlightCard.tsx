'use client'

import React, { useRef } from 'react'
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  spotlightColor?: string
  spotlightSize?: number
}

/**
 * SpotlightCard — Aceternity UI style mouse-tracking card.
 * Projects a glowing gold radial spotlight following mouse coordinates.
 * Employs hardware-accelerated Framer Motion values to prevent state re-renders.
 */
export function SpotlightCard({
  children,
  spotlightColor = 'rgba(212, 175, 55, 0.08)', // Transparent gold tint
  spotlightSize = 450,
  className,
  ...props
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ clientX, clientY, currentTarget }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-border/50 bg-background/50',
        className,
      )}
      {...props}
    >
      {/* Dynamic Radial Spotlight Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${spotlightSize}px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default SpotlightCard
