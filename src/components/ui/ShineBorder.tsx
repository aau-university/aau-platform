'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ShineBorderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  borderRadius?: number
  borderWidth?: number
  duration?: number
  color?: string | string[]
  children: React.ReactNode
}

/**
 * ShineBorder — Magic UI style glowing border card wrapper.
 * Cycles an animated gradient glow around card container boundaries.
 */
export function ShineBorder({
  borderRadius = 24,
  borderWidth = 2,
  duration = 10,
  color = ['hsl(var(--secondary))', 'transparent', 'hsl(var(--gold-light))', 'transparent', 'hsl(var(--secondary))'],
  className,
  children,
  ...props
}: ShineBorderProps) {
  const colorString = Array.isArray(color) ? color.join(', ') : color

  return (
    <div
      style={
        {
          '--border-radius': `${borderRadius}px`,
          '--border-width': `${borderWidth}px`,
          '--shine-duration': `${duration}s`,
          '--shine-color': colorString.includes(',')
            ? `linear-gradient(90deg, ${colorString})`
            : colorString,
        } as React.CSSProperties
      }
      className={cn(
        'relative rounded-[var(--border-radius)] p-[var(--border-width)] overflow-hidden shadow-elegant bg-muted/20',
        className,
      )}
      {...props}
    >
      {/* Shine Rotating Background */}
      <div
        style={{
          background: `conic-gradient(from 0deg, ${colorString})`,
          width: '250%',
          height: '250%',
        }}
        className="shine-border-rotate absolute inset-0 -z-10 left-1/2 top-1/2 opacity-95 blur-[2px]"
      />

      {/* Main Content Area - glassmorphism bg-card/75 */}
      <div className="relative size-full rounded-[calc(var(--border-radius)-var(--border-width))] bg-card/75 backdrop-blur-2xl">
        {children}
      </div>
    </div>
  )
}

export default ShineBorder
