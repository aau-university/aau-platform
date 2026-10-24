import { describe, expect, it } from 'vitest'

import { canAccessAdmin } from '..'

/**
 * canAccessAdmin — hardened in the stabilization pass to honor:
 *   - isUserActive
 *   - isRoleActive
 *   - role.canAccessPayloadAdmin (when role is populated)
 *   - roleCanAccessPayloadAdmin snapshot (when role is not populated)
 *   - hasRoleLevelAtLeast(user, 2) fallback only for legacy users without role
 *
 * Test ordering: degenerate / denial cases first, happy path last.
 */

describe('canAccessAdmin (hardened)', () => {
  // ── Degenerate ─────────────────────────────────────────────────────────
  it('denies anonymous (null user)', () => {
    expect(canAccessAdmin(null)).toBe(false)
  })

  it('denies empty object as user', () => {
    expect(canAccessAdmin({})).toBe(false)
  })

  // ── Inactive user ──────────────────────────────────────────────────────
  it('denies an inactive user even with a privileged role', () => {
    expect(
      canAccessAdmin({
        isActive: false,
        role: { slug: 'admin', canAccessPayloadAdmin: true, isActive: true },
      }),
    ).toBe(false)
  })

  it('denies an inactive user on the roleLevel fallback path', () => {
    expect(canAccessAdmin({ isActive: false, roleLevel: 4 })).toBe(false)
  })

  // ── Inactive role ──────────────────────────────────────────────────────
  it('denies when the populated role is inactive', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'admin', canAccessPayloadAdmin: true, isActive: false },
      }),
    ).toBe(false)
  })

  // ── Role explicitly forbids admin ──────────────────────────────────────
  it('denies when the populated role has canAccessPayloadAdmin=false', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'student', canAccessPayloadAdmin: false, isActive: true },
      }),
    ).toBe(false)
  })

  it('denies a high-level user whose role.canAccessPayloadAdmin is false', () => {
    // Pathological config: someone manually flipped the role's flag.
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'admin', canAccessPayloadAdmin: false, isActive: true },
      }),
    ).toBe(false)
  })

  // ── Happy paths (populated role) ───────────────────────────────────────
  it('allows when populated role explicitly grants admin access', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'admin', canAccessPayloadAdmin: true, isActive: true },
      }),
    ).toBe(true)
  })

  it('allows super_admin via populated role', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'super_admin', canAccessPayloadAdmin: true, isActive: true },
      }),
    ).toBe(true)
  })

  it('allows coordinator via populated role.canAccessPayloadAdmin', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: { slug: 'coordinator', canAccessPayloadAdmin: true, isActive: true },
      }),
    ).toBe(true)
  })

  it('allows admin access via roleCanAccessPayloadAdmin snapshot', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: 4,
        roleIsActive: true,
        roleCanAccessPayloadAdmin: true,
      }),
    ).toBe(true)
  })

  it('denies admin access when the roleCanAccessPayloadAdmin snapshot is false', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        role: 4,
        roleIsActive: true,
        roleLevel: 4,
        roleCanAccessPayloadAdmin: false,
      }),
    ).toBe(false)
  })

  it('fails CLOSED when the snapshot is missing (no level-based fallback)', () => {
    // A role relationship exists but the snapshot fields are not yet
    // populated. The gate now fails closed: an absent
    // roleCanAccessPayloadAdmin means "no admin UI", never "assume yes" —
    // the old level>=2 fallback ignored the role's real capability flag.
    expect(canAccessAdmin({ isActive: true, role: 4, roleLevel: 4, systemRole: 'admin' })).toBe(
      false,
    )
  })

  // ── No fallback path: systemRole alone never grants the admin UI ────────
  it('denies systemRole-only users regardless of level (no capability flag)', () => {
    expect(canAccessAdmin({ isActive: true, systemRole: 'coordinator' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'admin' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'student' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'doctor' })).toBe(false)
  })
})
