import { describe, expect, it, vi } from 'vitest'

import type { Role } from '@/payload-types'

import { roleFixtures } from '../fixtures/roles'
import type { SeedOperations } from '../lib/local-api'
import type { SeedStageContext } from '../lib/types'
import { rolesStage } from '../stages/roles'

function contextWith(operations: SeedOperations) {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('roles stage', () => {
  it('does no writes when every authoritative role and locale already matches', async () => {
    let call = 0
    const find = vi.fn(async () => {
      const fixture = roleFixtures[Math.floor(call++ / 2)]
      const locale = call % 2 === 1 ? fixture.ar : fixture.en
      const role = {
        ...fixture.shared,
        ...locale,
        createdAt: '',
        id: call,
        permissions: fixture.shared.permissions.map(({ key }) => ({ key })),
        updatedAt: '',
      } satisfies Role
      return {
        docs: [role],
        totalDocs: 1,
      }
    })
    const operations = {
      create: vi.fn(),
      find,
      update: vi.fn(),
    } as unknown as SeedOperations

    const result = await rolesStage.run(contextWith(operations))

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 6, updated: 0 })
    expect(operations.create).not.toHaveBeenCalled()
    expect(operations.update).not.toHaveBeenCalled()
  })

  it('serializes locale reads on one operations boundary and remains a no-op', async () => {
    let activeOperation = false
    let call = 0
    const find = vi.fn(async () => {
      if (activeOperation) throw new Error('Overlapping seed Local API operations detected.')
      activeOperation = true
      try {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const fixture = roleFixtures[Math.floor(call / 2)]
        const locale = call % 2 === 0 ? 'ar' : 'en'
        call += 1
        return {
          docs: [matchingRole(fixture, locale, call)],
          totalDocs: 1,
        }
      } finally {
        activeOperation = false
      }
    })
    const operations = {
      create: vi.fn(),
      find,
      update: vi.fn(),
    } as unknown as SeedOperations

    const result = await rolesStage.run(contextWith(operations))

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 6, updated: 0 })
    expect(find).toHaveBeenCalledTimes(12)
    expect(operations.create).not.toHaveBeenCalled()
    expect(operations.update).not.toHaveBeenCalled()
  })

  it('preserves permission row IDs by key while reconciling a changed role', async () => {
    let call = 0
    const find = vi.fn(async () => {
      const fixture = roleFixtures[Math.floor(call++ / 2)]
      const locale = call % 2 === 1 ? fixture.ar : fixture.en
      const role = {
        ...fixture.shared,
        ...locale,
        createdAt: '',
        id: call,
        level: fixture.shared.slug === 'super_admin' ? 4 : fixture.shared.level,
        permissions: fixture.shared.permissions.map(({ key }, index) => ({
          id: `row-${index}`,
          key,
        })),
        updatedAt: '',
      } satisfies Role
      return {
        docs: [role],
        totalDocs: 1,
      }
    })
    const update = vi.fn().mockResolvedValue({ id: 1 })
    const operations = { create: vi.fn(), find, update } as unknown as SeedOperations

    const result = await rolesStage.run(contextWith(operations))

    const reconciliation = update.mock.calls.find(([args]) => args.locale === 'ar')?.[0]
    expect(result.updated).toBe(1)
    expect(reconciliation.data).toMatchObject({
      canAccessDoctorPortal: false,
      canAccessPayloadAdmin: true,
      canAccessRefine: false,
      canAccessStudentPortal: false,
      isActive: true,
      isSystemRole: true,
      level: 5,
      slug: 'super_admin',
    })
    expect(reconciliation.data.permissions[0]).toMatchObject({ id: 'row-0' })
  })
})

function matchingRole(
  fixture: (typeof roleFixtures)[number],
  locale: 'ar' | 'en',
  id: number,
): Role {
  return {
    ...fixture.shared,
    ...fixture[locale],
    createdAt: '',
    id,
    permissions: fixture.shared.permissions.map(({ key }) => ({ key })),
    updatedAt: '',
  }
}
