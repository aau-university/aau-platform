import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Role, User } from '@/payload-types'

import type { SeedOperations } from '../lib/local-api'
import type { SeedStageContext } from '../lib/types'
import { bootstrapAdminStage } from '../stages/bootstrap-admin'

const originalEmail = process.env.INITIAL_ADMIN_EMAIL
const originalPassword = process.env.INITIAL_ADMIN_PASSWORD

afterEach(() => {
  if (originalEmail === undefined) delete process.env.INITIAL_ADMIN_EMAIL
  else process.env.INITIAL_ADMIN_EMAIL = originalEmail
  if (originalPassword === undefined) delete process.env.INITIAL_ADMIN_PASSWORD
  else process.env.INITIAL_ADMIN_PASSWORD = originalPassword
})

function contextWith(operations: Partial<SeedOperations>, createBootstrapUser = vi.fn()) {
  return {
    createBootstrapUser,
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('bootstrap admin stage', () => {
  it('requires both configured credentials before any read', async () => {
    delete process.env.INITIAL_ADMIN_EMAIL
    delete process.env.INITIAL_ADMIN_PASSWORD
    const find = vi.fn()

    await expect(bootstrapAdminStage.run(contextWith({ find }))).rejects.toThrow(
      'INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required',
    )
    expect(find).not.toHaveBeenCalled()
  })

  it.each([
    ['fewer than 12 characters', 'Aa1!'.repeat(2)],
    ['no uppercase character', `${'a'.repeat(12)}1!`],
    ['no lowercase character', `${'A'.repeat(12)}1!`],
    ['no numeric character', `${'Aa'.repeat(6)}!`],
    ['no special character', `${'Aa1'.repeat(4)}`],
  ])('rejects a bootstrap password with %s before reads or writes', async (_reason, password) => {
    process.env.INITIAL_ADMIN_EMAIL = 'configured-admin@example.test'
    process.env.INITIAL_ADMIN_PASSWORD = password
    const find = vi.fn()
    const createBootstrapUser = vi.fn()

    await expect(
      bootstrapAdminStage.run(contextWith({ find }, createBootstrapUser)),
    ).rejects.toThrow('INITIAL_ADMIN_PASSWORD')
    expect(find).not.toHaveBeenCalled()
    expect(createBootstrapUser).not.toHaveBeenCalled()
  })

  it('finds only by configured email and preserves an existing password and role', async () => {
    process.env.INITIAL_ADMIN_EMAIL = 'configured-admin@example.test'
    const runtimePassword = ['Runtime', 'Only', '7', '!'].join('')
    process.env.INITIAL_ADMIN_PASSWORD = runtimePassword
    const role = {
      canAccessPayloadAdmin: true,
      createdAt: '',
      id: 10,
      isActive: true,
      level: 5,
      name: 'Super Admin',
      permissions: [{ key: 'users.manage' }],
      slug: 'super_admin',
      updatedAt: '',
    } satisfies Role
    const user = {
      collection: 'users',
      createdAt: '',
      email: process.env.INITIAL_ADMIN_EMAIL,
      id: 20,
      isActive: true,
      role: role.id,
      roleCanAccessPayloadAdmin: true,
      roleIsActive: true,
      roleLevel: role.level,
      rolePermissions: ['users.manage'],
      roleSlug: role.slug,
      systemRole: 'super_admin',
      updatedAt: '',
    } satisfies User
    const find = vi.fn(async (args: { collection: string; where?: unknown }) => ({
      docs: args.collection === 'roles' ? [role] : [user],
      totalDocs: 1,
    }))
    const createBootstrapUser = vi.fn()

    const result = await bootstrapAdminStage.run(
      contextWith({ find } as unknown as Partial<SeedOperations>, createBootstrapUser),
    )

    expect(find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'users',
        where: { email: { equals: 'configured-admin@example.test' } },
      }),
    )
    expect(createBootstrapUser).not.toHaveBeenCalled()
    expect(result).toEqual({ conflict: 0, created: 0, skipped: 1, updated: 0 })
  })

  it('creates an absent admin only through the one-shot bootstrap capability', async () => {
    process.env.INITIAL_ADMIN_EMAIL = 'configured-admin@example.test'
    const runtimePassword = ['Runtime', 'Only', '7', '!'].join('')
    process.env.INITIAL_ADMIN_PASSWORD = runtimePassword
    const role = {
      canAccessPayloadAdmin: true,
      createdAt: '',
      id: 10,
      isActive: true,
      level: 5,
      name: 'Super Admin',
      permissions: [{ key: 'users.manage' }],
      slug: 'super_admin',
      updatedAt: '',
    } satisfies Role
    const find = vi.fn(async (args: { collection: string }) => ({
      docs: args.collection === 'roles' ? [role] : [],
      totalDocs: args.collection === 'roles' ? 1 : 0,
    }))
    const createBootstrapUser = vi.fn().mockResolvedValue({ id: 20 })

    const result = await bootstrapAdminStage.run(
      contextWith({ find } as unknown as Partial<SeedOperations>, createBootstrapUser),
    )

    expect(createBootstrapUser).toHaveBeenCalledOnce()
    expect(createBootstrapUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'configured-admin@example.test',
        password: runtimePassword,
        role: 10,
        systemRole: 'super_admin',
      }),
    })
    expect(result).toEqual({ conflict: 0, created: 1, skipped: 0, updated: 0 })
  })
})
