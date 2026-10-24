import type { RequiredDataFromCollectionSlug } from 'payload'

import { optionalUserFixtures } from '../fixtures/users'
import { deploymentName, isProductionDeployment } from '../lib/deployment-environment'
import { emptySeedCounts, type SeedStage } from '../lib/types'
import { relationshipId, requireBySlug } from './helpers'

export const optionalUsersStage: SeedStage = {
  name: 'optional-users',
  run: async ({ operations }) => {
    const counts = emptySeedCounts()
    if (process.env.SEED_DEMO_USERS !== 'true') return counts
    // Deployment-keyed, not NODE_ENV-keyed: demo users are exactly what a
    // staging deployment wants, and staging runs the production build.
    if (isProductionDeployment()) {
      throw new Error(
        `SEED_DEMO_USERS cannot be enabled in production (deployment: ${deploymentName()}).`,
      )
    }

    const configuredUsers = optionalUserFixtures.map((fixture) => ({
      collegeSlug: 'collegeSlugEnv' in fixture
        ? requireEnvironment(fixture.collegeSlugEnv)
        : undefined,
      email: requireEnvironment(fixture.emailEnv),
      fixture,
      password: requireEnvironment(fixture.passwordEnv),
    }))

    for (const { collegeSlug, email, fixture, password } of configuredUsers) {
      const role = await requireBySlug(operations, 'roles', fixture.roleSlug)
      if (role.isActive !== true) throw new Error(`Required role is inactive: ${fixture.roleSlug}`)

      const collegeScope = collegeSlug
        ? (await requireBySlug(operations, 'colleges', collegeSlug)).id
        : undefined
      if (fixture.roleSlug === 'coordinator' && collegeScope === undefined) {
        throw new Error('Coordinator creation requires a resolved collegeScope.')
      }

      const existingResult = await operations.find({
        collection: 'users',
        depth: 0,
        limit: 1,
        showHiddenFields: true,
        where: { email: { equals: email } },
      })
      const existing = existingResult.docs[0]
      if (existing) {
        const expectedPermissions = (role.permissions ?? []).map(({ key }) => key)
        const actualPermissions = Array.isArray(existing.rolePermissions)
          ? existing.rolePermissions.filter((key): key is string => typeof key === 'string')
          : []
        if (
          existing.isActive !== true ||
          relationshipId(existing.role) !== role.id ||
          existing.systemRole !== fixture.roleSlug ||
          existing.roleSlug !== role.slug ||
          existing.roleLevel !== role.level ||
          existing.roleIsActive !== true ||
          existing.roleCanAccessPayloadAdmin !== (role.canAccessPayloadAdmin === true) ||
          actualPermissions.length !== expectedPermissions.length ||
          !actualPermissions.every((key, index) => key === expectedPermissions[index]) ||
          (collegeScope !== undefined && relationshipId(existing.collegeScope) !== collegeScope)
        ) {
          throw new Error(`Configured optional ${fixture.roleSlug} user conflicts with an existing account.`)
        }
        counts.skipped += 1
        continue
      }

      const data = {
        email,
        firstName: fixture.firstName,
        isActive: true,
        lastName: fixture.lastName,
        password,
        role: role.id,
        systemRole: fixture.roleSlug,
        ...(collegeScope !== undefined ? { collegeScope } : {}),
      } satisfies RequiredDataFromCollectionSlug<'users'>
      await operations.create({ collection: 'users', data })
      counts.created += 1
    }
    return counts
  },
}

function requireEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required when SEED_DEMO_USERS=true.`)
  return value
}
