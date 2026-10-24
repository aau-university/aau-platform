import { describe, expect, it } from 'vitest'

import { checkRoleEscalation } from '../enforceRoleHierarchy'

/**
 * Unit tests for the role escalation guard logic.
 *
 * Per PDCA testing discipline: denial cases (exception/degenerate) first,
 * then happy-path allowed cases. See testing-anti-patterns.md #7.
 *
 * `checkRoleEscalation` is a pure, testable function extracted from the hook.
 * It receives the acting user's role slug and the target role level.
 * Returns true if allowed, throws (or returns false) if escalation denied.
 */

describe('checkRoleEscalation', () => {
  // ── Degenerate / zero cases ─────────────────────────────────────────────

  it('returns false (denies) when acting user has no role', () => {
    expect(checkRoleEscalation(null, 2)).toBe(false)
    expect(checkRoleEscalation(undefined, 2)).toBe(false)
    expect(checkRoleEscalation('', 2)).toBe(false)
  })

  // ── Exception cases: denied assignments ─────────────────────────────────

  it('denies student (level 1) from assigning coordinator (level 2)', () => {
    expect(checkRoleEscalation('student', 2)).toBe(false)
  })

  it('denies coordinator (level 2) from assigning content_manager (level 3)', () => {
    expect(checkRoleEscalation('coordinator', 3)).toBe(false)
  })

  it('denies content_manager (level 3) from assigning admin (level 4)', () => {
    expect(checkRoleEscalation('content_manager', 4)).toBe(false)
  })

  it('denies admin (level 4) from assigning super_admin (level 5)', () => {
    expect(checkRoleEscalation('admin', 5)).toBe(false)
  })

  it('denies admin (level 4) from assigning same-level admin (level 4)', () => {
    expect(checkRoleEscalation('admin', 4)).toBe(false)
  })

  it('denies doctor (level 1) from assigning any role at or above level 1', () => {
    expect(checkRoleEscalation('doctor', 1)).toBe(false)
    expect(checkRoleEscalation('doctor', 2)).toBe(false)
  })

  // ── Happy path: allowed assignments ─────────────────────────────────────

  it('allows super_admin (level 5) to assign any role level', () => {
    expect(checkRoleEscalation('super_admin', 5)).toBe(true)
    expect(checkRoleEscalation('super_admin', 4)).toBe(true)
    expect(checkRoleEscalation('super_admin', 1)).toBe(true)
  })

  it('allows admin (level 4) to assign roles below their level', () => {
    expect(checkRoleEscalation('admin', 3)).toBe(true)
    expect(checkRoleEscalation('admin', 2)).toBe(true)
    expect(checkRoleEscalation('admin', 1)).toBe(true)
  })

  it('allows content_manager (level 3) to assign roles below their level', () => {
    expect(checkRoleEscalation('content_manager', 2)).toBe(true)
    expect(checkRoleEscalation('content_manager', 1)).toBe(true)
  })
})
