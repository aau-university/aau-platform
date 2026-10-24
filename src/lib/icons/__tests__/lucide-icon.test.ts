import { describe, expect, it } from 'vitest'
import { Briefcase, Cpu, Heart, Stethoscope } from 'lucide-react'

import { resolveLucideIcon } from '../lucide-icon'

describe('resolveLucideIcon', () => {
  it('maps the seeded college icon names to lucide components', () => {
    expect(resolveLucideIcon('Stethoscope')).toBe(Stethoscope)
    expect(resolveLucideIcon('Heart')).toBe(Heart)
    expect(resolveLucideIcon('Cpu')).toBe(Cpu)
    expect(resolveLucideIcon('Briefcase')).toBe(Briefcase)
  })

  it('is case-insensitive and tolerant of separators', () => {
    expect(resolveLucideIcon('stethoscope')).toBe(Stethoscope)
    expect(resolveLucideIcon('graduation-cap')).toBeTruthy()
    expect(resolveLucideIcon('book open')).toBeTruthy()
  })

  it('returns null for empty or unknown names so callers can fall back', () => {
    expect(resolveLucideIcon('')).toBeNull()
    expect(resolveLucideIcon(null)).toBeNull()
    expect(resolveLucideIcon(undefined)).toBeNull()
    expect(resolveLucideIcon('definitely-not-an-icon')).toBeNull()
  })
})
