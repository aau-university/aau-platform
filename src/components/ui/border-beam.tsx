"use client"

import { motion, useReducedMotion, type MotionStyle, type Transition } from 'framer-motion'

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number
  /**
   * The duration of the border beam.
   */
  duration?: number
  /**
   * The delay of the border beam.
   */
  delay?: number
  /**
   * The color of the border beam from.
   */
  colorFrom?: string
  /**
   * The color of the border beam to.
   */
  colorTo?: string
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition
  /**
   * The class name of the border beam.
   */
  className?: string
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number
  /**
   * The border width of the beam.
   */
  borderWidth?: number
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = 'hsl(var(--secondary))',
  colorTo = 'hsl(var(--gold-light))',
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] border-secondary/50',
          className,
        )}
        style={{ borderStyle: 'solid', borderWidth, ...style }}
      />
    )
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={
        {
          padding: borderWidth,
          maskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
          maskClip: 'content-box, border-box',
          maskComposite: 'exclude',
          WebkitMaskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
          WebkitMaskClip: 'content-box, border-box',
          WebkitMaskComposite: 'xor',
        } as React.CSSProperties
      }
    >
      <motion.div
        className={cn(
          'absolute aspect-square bg-[linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]',
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  )
}
