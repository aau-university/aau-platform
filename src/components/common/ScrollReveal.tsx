'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  yOffset?: number
  duration?: number
  once?: boolean
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  yOffset = 40,
  duration = 0.6,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{
        type: 'spring',
        stiffness: 70,
        damping: 20,
        mass: 1,
        delay,
        duration,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
