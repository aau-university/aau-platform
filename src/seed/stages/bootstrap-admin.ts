import type { Role, User } from '@/payload-types'

import { emptySeedCounts, type SeedStage } from '../lib/types'
import { relationshipId } from './helpers'

export const bootstrapAdminStage: SeedStage = {
  allowBootstrapUser: true,
  name: 'bootstrap-admin',
  run: async ({ createBootstrapUser, operations, state }) => {
    const email = process.env.INITIAL_ADMIN_EMAIL
    const password = process.env.INITIAL_ADMIN_PASSWORD
    if (!email || !password) {
      throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required for seed bootstrap.')
    }
    validateBootstrapPassword(password)

    const roles = await operations.find({
      collection: 'roles',
      depth: 0,
      limit: 1,
      where: { slug: { equals: 'super_admin' } },
    })
    const role = roles.docs[0]
    if (!role) throw new Error('Missing required roles dependency: super_admin')
    assertActiveAdminRole(role)

    const users = await operations.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      showHiddenFields: true,
      where: { email: { equals: email } },
    })
    const existing = users.docs[0]
    if (existing) {
      assertMatchingAdmin(existing, role)
      state.bootstrapAdmin = existing
      return { ...emptySeedCounts(), skipped: 1 }
    }

    const created = await createBootstrapUser({
      data: {
        email,
        firstName: 'Super',
        isActive: true,
        lastName: 'Admin',
        password,
        role: role.id,
        systemRole: 'super_admin',
      },
    })
    state.bootstrapAdmin = created
    return { ...emptySeedCounts(), created: 1 }
  },
}

function validateBootstrapPassword(password: string): void {
  const hasRequiredLength = password.length >= 12
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialCharacter = /[^A-Za-z0-9]/.test(password)
  if (
    !hasRequiredLength ||
    !hasLowercase ||
    !hasUppercase ||
    !hasNumber ||
    !hasSpecialCharacter
  ) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD must be at least 12 characters and include lowercase, uppercase, numeric, and special characters.',
    )
  }
}

function assertActiveAdminRole(role: Role): void {
  if (role.isActive !== true || role.canAccessPayloadAdmin !== true || role.slug !== 'super_admin') {
    throw new Error('Configured bootstrap role is not an active admin-enabled super_admin role.')
  }
}

function assertMatchingAdmin(user: User, role: Role): void {
  const expectedPermissions = (role.permissions ?? []).map(({ key }) => key)
  const actualPermissions = Array.isArray(user.rolePermissions)
    ? user.rolePermissions.filter((key): key is string => typeof key === 'string')
    : []
  const valid =
    user.isActive === true &&
    relationshipId(user.role) === role.id &&
    user.systemRole === 'super_admin' &&
    user.roleSlug === role.slug &&
    user.roleLevel === role.level &&
    user.roleIsActive === true &&
    user.roleCanAccessPayloadAdmin === true &&
    actualPermissions.length === expectedPermissions.length &&
    actualPermissions.every((key, index) => key === expectedPermissions[index])
  if (!valid) {
    throw new Error('Configured bootstrap user exists but does not match the active super_admin role snapshots.')
  }
}
