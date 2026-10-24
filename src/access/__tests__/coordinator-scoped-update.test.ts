import { describe, expect, it } from 'vitest'

import { coordinatorScopedCreate, coordinatorScopedUpdate } from '../coordinator-scoped-update'

/**
 * Unit tests for coordinator college-scoped access.
 *
 * `coordinatorScopedUpdate({ permission })` builds a Payload Access function:
 * - Content manager+ (level ≥ 3): returns true (full access, no key check)
 * - Coordinator (level 2) whose role holds `permission` and has a matching
 *   collegeScope: returns a Where query
 * - Coordinator missing the permission key: returns false (role
 *   `permissions` are enforced, not decorative)
 * - Coordinator with no collegeScope: returns false
 * - Anyone unauthenticated: returns false
 * - Student/Doctor (level 1): returns false
 *
 * We test denial/degenerate cases first per PDCA anti-pattern #7.
 */

const PERMISSION = 'news.manage'
const update = coordinatorScopedUpdate({ permission: PERMISSION })
const create = coordinatorScopedCreate({ permission: PERMISSION })

function makeReq(user: unknown) {
  return { req: { user } } as any
}

function coordinatorWith(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    role: {
      slug: 'coordinator',
      isActive: true,
      permissions: [{ key: PERMISSION }],
    },
    collegeScope: { id: 42 },
    ...overrides,
  }
}

describe('coordinatorScopedUpdate access', () => {
  // ── Degenerate: unauthenticated ──────────────────────────────────────────

  it('denies unauthenticated access', () => {
    expect(update(makeReq(null))).toBe(false)
  })

  it('denies access when user object is empty', () => {
    expect(update(makeReq({}))).toBe(false)
  })

  // ── Exception: low-privilege roles ──────────────────────────────────────

  it('denies student access', () => {
    const student = { isActive: true, role: { slug: 'student', isActive: true } }
    expect(update(makeReq(student))).toBe(false)
  })

  it('denies doctor access', () => {
    const doctor = { isActive: true, role: { slug: 'doctor', isActive: true } }
    expect(update(makeReq(doctor))).toBe(false)
  })

  it('denies coordinator with no collegeScope', () => {
    expect(update(makeReq(coordinatorWith({ collegeScope: undefined })))).toBe(false)
  })

  it('denies inactive coordinator even with collegeScope', () => {
    expect(update(makeReq(coordinatorWith({ isActive: false })))).toBe(false)
  })

  it('denies inactive content_manager full access', () => {
    const cm = { isActive: false, role: { slug: 'content_manager' } }
    expect(update(makeReq(cm))).toBe(false)
  })

  // ── Permission-key enforcement ───────────────────────────────────────────

  it('denies a coordinator whose role does not hold the permission key', () => {
    const coordinator = coordinatorWith({
      role: { slug: 'coordinator', isActive: true, permissions: [{ key: 'events.manage' }] },
    })
    expect(update(makeReq(coordinator))).toBe(false)
    expect(create(makeReq(coordinator))).toBe(false)
  })

  it('denies a coordinator whose role holds no permissions at all', () => {
    const coordinator = coordinatorWith({
      role: { slug: 'coordinator', isActive: true, permissions: [] },
    })
    expect(update(makeReq(coordinator))).toBe(false)
  })

  // ── Coordinator: scoped access ───────────────────────────────────────────

  it('returns a Where query for a permitted coordinator with collegeScope', () => {
    expect(update(makeReq(coordinatorWith()))).toMatchObject({
      college: { equals: 42 },
    })
  })

  it('handles string collegeScope id', () => {
    const result = update(makeReq(coordinatorWith({ collegeScope: 'college-id-99' })))
    expect(result).toMatchObject({
      college: { equals: 'college-id-99' },
    })
  })

  it('allows create for a permitted coordinator and denies without scope', () => {
    expect(create(makeReq(coordinatorWith()))).toBe(true)
    expect(create(makeReq(coordinatorWith({ collegeScope: undefined })))).toBe(false)
  })

  // ── Happy path: content manager and above (no key required) ─────────────

  it('allows content_manager full access (returns true)', () => {
    const cm = { isActive: true, role: { slug: 'content_manager', isActive: true } }
    expect(update(makeReq(cm))).toBe(true)
    expect(create(makeReq(cm))).toBe(true)
  })

  it('allows admin full access (returns true)', () => {
    const admin = { isActive: true, role: { slug: 'admin', isActive: true } }
    expect(update(makeReq(admin))).toBe(true)
  })

  it('allows super_admin full access (returns true)', () => {
    const sa = { isActive: true, role: { slug: 'super_admin', isActive: true } }
    expect(update(makeReq(sa))).toBe(true)
  })
})
