import type { Transition, Variants } from 'framer-motion'

import { transitions } from './transitions'

export function delayedFadeUp(delay = 0, y = 16): Variants {
  return {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...transitions.section, delay },
    },
  }
}

export const motionEffects = {
  ambientOrbPrimary: {
    animate: { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] },
    transition: transitions.ambient,
  },
  ambientOrbSecondary: {
    animate: { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] },
    transition: { ...transitions.ambient, duration: 5, delay: 1 },
  },
  scrollBounce: {
    animate: { y: [0, 8, 0] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
  spotlightBeam: {
    animate: { x: ['-55vw', '55vw'] },
    transition: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
  },
  headlineGradient: {
    animate: { backgroundPosition: ['0% center', '100% center', '0% center'] },
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
  },
  iconSpin: {
    transition: transitions.section,
  },
} satisfies Record<string, { animate?: Record<string, unknown>; transition?: Transition }>

export const reducedMotionEffects = {
  ambientOrbPrimary: { animate: { scale: 1, opacity: 0.3 } },
  ambientOrbSecondary: { animate: { scale: 1, opacity: 0.3 } },
  scrollBounce: { animate: { y: 0 } },
  spotlightBeam: { animate: { x: 0 } },
  headlineGradient: { animate: { backgroundPosition: '0% center' } },
  iconSpin: {},
} satisfies Record<string, { animate?: Record<string, unknown> }>

export const containerStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  }
}

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.section,
  },
}

export function generateRandomParticle() {
  return {
    initial: {
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.5 + 0.2,
      scale: Math.random() * 0.5 + 0.5,
    },
    animate: {
      y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
      x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
      opacity: [0.2, 0.5, 0.2],
    },
    transition: {
      duration: Math.random() * 10 + 10,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  }
}
