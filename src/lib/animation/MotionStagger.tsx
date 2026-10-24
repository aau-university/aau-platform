'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { animationPresets } from './presets'
import { defaultViewport } from './viewport'

interface MotionStaggerProps {
  children: ReactNode
  className?: string
}

export function MotionStagger({ children, className }: MotionStaggerProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={animationPresets.stagger}
    >
      {children}
    </motion.div>
  )
}
