'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { animationPresets, type AnimationPresetName } from './presets'
import { defaultViewport } from './viewport'

interface MotionRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  preset?: AnimationPresetName
}

export function MotionReveal({
  children,
  className,
  delay = 0,
  preset = 'fadeUp',
}: MotionRevealProps) {
  const shouldReduceMotion = useReducedMotion()
  const variants = animationPresets[preset]

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}
