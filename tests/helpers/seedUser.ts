import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  systemRole: 'admin' as const,
}

async function getOrCreateAdminRole() {
  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: 'roles',
    where: {
      slug: { equals: 'admin' },
    },
    limit: 1,
    overrideAccess: true,
  })

  return (
    existing.docs[0] ??
    (await payload.create({
      collection: 'roles',
      locale: 'en',
      overrideAccess: true,
      data: {
        name: 'Admin',
        slug: 'admin',
        level: 4,
        isSystemRole: true,
        permissions: [{ key: 'pages.manage' }],
        canAccessPayloadAdmin: true,
        isActive: true,
      },
    }))
  )
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })
  const adminRole = await getOrCreateAdminRole()

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user. `enforceRoleHierarchyHook` fails closed on
  // mutations without `req.user`; test seeding is exactly the bootstrap
  // case the explicit context flag exists for.
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { allowUnauthenticatedBootstrap: true },
    data: {
      ...testUser,
      role: adminRole.id,
    },
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
