import { describe, expect, it } from 'vitest'

import { hideBelowLevel, hideUnlessPermission } from '../admin-nav'

const coordinator = (permissions: string[], extra: Record<string, unknown> = {}) => ({
  isActive: true,
  roleIsActive: true,
  roleSlug: 'coordinator',
  roleLevel: 2,
  rolePermissions: permissions.map((key) => ({ key })),
  ...extra,
})

const contentManager = { isActive: true, roleIsActive: true, roleSlug: 'content_manager', roleLevel: 3 }
const admin = { isActive: true, roleIsActive: true, roleSlug: 'admin', roleLevel: 4 }
const superAdmin = { isActive: true, roleIsActive: true, roleSlug: 'super_admin', roleLevel: 5 }

describe('hideUnlessPermission', () => {
  const hiddenForNews = hideUnlessPermission('news.manage')

  it('shows the collection to a coordinator whose role holds the key', () => {
    expect(hiddenForNews({ user: coordinator(['news.manage']) })).toBe(false)
  })

  it('hides the collection from a coordinator lacking the key', () => {
    expect(hiddenForNews({ user: coordinator(['events.manage']) })).toBe(true)
    expect(hiddenForNews({ user: coordinator([]) })).toBe(true)
  })

  it('always shows the collection to content manager and above', () => {
    for (const user of [contentManager, admin, superAdmin]) {
      expect(hiddenForNews({ user })).toBe(false)
    }
  })

  it('hides the collection from anonymous and from lower roles', () => {
    expect(hiddenForNews({ user: null })).toBe(true)
    expect(hiddenForNews({ user: undefined })).toBe(true)
    expect(
      hiddenForNews({ user: { isActive: true, roleIsActive: true, roleSlug: 'student', roleLevel: 1 } }),
    ).toBe(true)
  })

  it('hides the collection from an inactive coordinator even with the key', () => {
    // hasPermission requires an active user AND an active role.
    expect(hiddenForNews({ user: coordinator(['news.manage'], { isActive: false }) })).toBe(true)
    expect(hiddenForNews({ user: coordinator(['news.manage'], { roleIsActive: false }) })).toBe(true)
  })

  it('hides the collection from an inactive content manager or admin', () => {
    // The level short-circuit goes through hasRoleLevelAtLeast, so a
    // deactivated account or a deactivated role loses the full panel too.
    expect(hiddenForNews({ user: { ...contentManager, isActive: false } })).toBe(true)
    expect(hiddenForNews({ user: { ...admin, roleIsActive: false } })).toBe(true)
    expect(hiddenForNews({ user: { ...superAdmin, isActive: false } })).toBe(true)
  })

  it('is synchronous — Payload treats a Promise as "hidden"', () => {
    expect(hiddenForNews({ user: coordinator(['news.manage']) })).not.toBeInstanceOf(Promise)
  })
})

describe('hideBelowLevel', () => {
  it('hides system areas from coordinators but shows them to content manager+', () => {
    const hidden = hideBelowLevel(3)
    expect(hidden({ user: coordinator(['news.manage']) })).toBe(true)
    expect(hidden({ user: contentManager })).toBe(false)
    expect(hidden({ user: admin })).toBe(false)
    expect(hidden({ user: superAdmin })).toBe(false)
  })

  it('supports an admin-only threshold', () => {
    const hidden = hideBelowLevel(4)
    expect(hidden({ user: contentManager })).toBe(true)
    expect(hidden({ user: admin })).toBe(false)
  })

  it('hides from anonymous users', () => {
    expect(hideBelowLevel(3)({ user: null })).toBe(true)
  })

  it('hides system areas from inactive privileged users', () => {
    const hidden = hideBelowLevel(3)
    expect(hidden({ user: { ...contentManager, isActive: false } })).toBe(true)
    expect(hidden({ user: { ...admin, roleIsActive: false } })).toBe(true)
  })
})
