'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { ReactNode } from 'react'

interface MotionParallaxProps {
  children: ReactNode
  className?: string
  input?: [number, number]
  output?: [number, number]
}

export function MotionParallax({
  children,
  className,
  input = [0, 500],
  output = [0, 120],
}: MotionParallaxProps) {
  const shouldReduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, input, output)

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}
