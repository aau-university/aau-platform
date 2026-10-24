import type { Variants } from 'framer-motion'

import { transitions } from './transitions'

export const animationPresets = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.section },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: transitions.section },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0, transition: transitions.section },
  },
  // These legacy names describe physical left/right travel, not locale-aware inline direction.
  slideStart: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: transitions.section },
  },
  slideEnd: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: transitions.section },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: transitions.section },
  },
  stagger: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: transitions.section },
  },
} satisfies Record<string, Variants>

export type AnimationPresetName = keyof typeof animationPresets
