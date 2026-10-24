export const transitions = {
  quick: { duration: 0.2, ease: 'easeOut' },
  section: { duration: 0.4, ease: 'easeOut' },
  elegant: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  ambient: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
} as const

export type TransitionName = keyof typeof transitions
