import type { Role } from '@/payload-types'
import type { RequiredDataFromCollectionSlug } from 'payload'

import { roleFixtures } from '../fixtures/roles'
import { emptySeedCounts, type SeedStage } from '../lib/types'

export const rolesStage: SeedStage = {
  name: 'roles',
  run: async ({ operations }) => {
    const counts = emptySeedCounts()

    for (const fixture of roleFixtures) {
      const arabicResult = await operations.find({
        collection: 'roles',
        depth: 0,
        limit: 1,
        locale: 'ar',
        where: { slug: { equals: fixture.shared.slug } },
      })
      const englishResult = await operations.find({
        collection: 'roles',
        depth: 0,
        limit: 1,
        locale: 'en',
        where: { slug: { equals: fixture.shared.slug } },
      })
      const existing = arabicResult.docs[0]
      if (!existing) {
        const permissions = fixture.shared.permissions.map(({ key }) => ({ key }))
        const created = await operations.create({
          collection: 'roles',
          data: {
            ...fixture.shared,
            ...fixture.ar,
            permissions,
          } satisfies RequiredDataFromCollectionSlug<'roles'>,
          locale: 'ar',
        })
        await operations.update({
          collection: 'roles',
          data: fixture.en,
          id: created.id,
          locale: 'en',
        })
        counts.created += 1
        counts.updated += 1
        continue
      }

      const permissions = preservePermissionIds(existing, fixture.shared.permissions)
      const desiredShared = { ...fixture.shared, permissions }
      let wrote = false
      if (!sameSharedRole(existing, desiredShared) || !sameLocalizedRole(existing, fixture.ar)) {
        await operations.update({
          collection: 'roles',
          data: { ...desiredShared, ...fixture.ar },
          id: existing.id,
          locale: 'ar',
        })
        counts.updated += 1
        wrote = true
      }

      const english = englishResult.docs[0]
      if (!english || !sameLocalizedRole(english, fixture.en)) {
        await operations.update({
          collection: 'roles',
          data: fixture.en,
          id: existing.id,
          locale: 'en',
        })
        counts.updated += 1
        wrote = true
      }
      if (!wrote) counts.skipped += 1
    }

    return counts
  },
}

function preservePermissionIds(
  existing: Role,
  desired: Readonly<NonNullable<Role['permissions']>>,
): NonNullable<Role['permissions']> {
  const idByKey = new Map(
    (existing.permissions ?? []).flatMap((permission) =>
      permission.id ? [[permission.key, permission.id] as const] : [],
    ),
  )
  return desired.map(({ key }) => ({ key, ...(idByKey.get(key) ? { id: idByKey.get(key) } : {}) }))
}

function sameLocalizedRole(
  actual: Role,
  expected: { description?: string | null; name: string },
): boolean {
  return actual.name === expected.name && (actual.description ?? null) === (expected.description ?? null)
}

function sameSharedRole(actual: Role, expected: Omit<Role, 'createdAt' | 'id' | 'name' | 'updatedAt'>) {
  const actualKeys = (actual.permissions ?? []).map(({ key }) => key)
  const expectedKeys = (expected.permissions ?? []).map(({ key }) => key)
  return (
    actual.slug === expected.slug &&
    actual.level === expected.level &&
    actual.isSystemRole === expected.isSystemRole &&
    actual.canAccessPayloadAdmin === expected.canAccessPayloadAdmin &&
    actual.canAccessRefine === expected.canAccessRefine &&
    actual.canAccessStudentPortal === expected.canAccessStudentPortal &&
    actual.canAccessDoctorPortal === expected.canAccessDoctorPortal &&
    actual.isActive === expected.isActive &&
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  )
}
