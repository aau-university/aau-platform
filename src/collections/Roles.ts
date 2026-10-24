import type { CollectionConfig, Where } from 'payload'

import {
  getUserRoleLevel,
  getUserRoleSlug,
  hasRoleLevelAtLeast,
  superAdminOnly,
  hideBelowLevel,
} from '../access'
import { localizedText, localizedTextarea } from '../fields/localized'
import { enforceSystemRoleOnDelete } from '../hooks/enforceLastSuperAdminOnDelete'
import { syncUsersOnRoleChange } from '../hooks/syncUsersOnRoleChange'

const adminFieldRead = ({ req: { user } }: { req: { user?: unknown } }) => {
  return hasRoleLevelAtLeast(user, 4)
}

/**
 * `level` is readable one tier lower than the other privilege fields: a
 * content manager needs it to pick a role when creating a coordinator, and
 * `assignableRolesFilter` filters the picker on `level`. It is ordering
 * metadata, not a secret.
 */
const roleLevelFieldRead = ({ req: { user } }: { req: { user?: unknown } }) => {
  return hasRoleLevelAtLeast(user, 3)
}

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(4),
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'level', 'isActive'],
  },
  access: {
    create: superAdminOnly,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (hasRoleLevelAtLeast(user, 4)) return true

      const slug = getUserRoleSlug(user)

      // A content manager administers lower-level accounts, so they must be
      // able to read the roles they are allowed to assign — the admin panel's
      // role picker fetches /api/roles over REST with access control applied,
      // so without this the picker comes back empty and they cannot set a new
      // coordinator's role at all. (`assignableRolesFilter`'s server-side
      // validation query is unaffected: it runs through the data loader with
      // the default `overrideAccess: true`.)
      if (hasRoleLevelAtLeast(user, 3)) {
        const clauses: Where[] = [{ level: { less_than: getUserRoleLevel(user) } }]
        if (slug) clauses.push({ slug: { equals: slug } })
        const managerRead: Where = { or: clauses }
        return managerRead
      }

      const ownRoleOnly: Where = { slug: { equals: slug as string } }
      return slug ? ownRoleOnly : false
    },
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  hooks: {
    afterChange: [syncUsersOnRoleChange],
    // Consolidated `beforeDelete` (Issue #39): replaces the inline check
    // with the standard `enforceSystemRoleOnDelete` hook from
    // `enforceLastSuperAdminOnDelete.ts`. The imported hook is a superset
    // of the old inline logic — it refuses deletion of any role whose
    // `isSystemRole === true` OR whose `slug === 'super_admin'`
    // (defensive guard for legacy data missing `isSystemRole`).
    beforeDelete: [enforceSystemRoleOnDelete],
  },
  fields: [
    localizedText('name', { required: true, label: 'Name' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'level',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      access: {
        read: roleLevelFieldRead,
      },
    },
    {
      name: 'isSystemRole',
      type: 'checkbox',
      defaultValue: false,
    },
    localizedTextarea('description', { label: 'Description' }),
    {
      name: 'permissions',
      type: 'array',
      access: {
        read: adminFieldRead,
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'canAccessPayloadAdmin',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: adminFieldRead,
      },
    },
    {
      name: 'canAccessRefine',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: adminFieldRead,
      },
    },
    {
      name: 'canAccessStudentPortal',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: adminFieldRead,
      },
    },
    {
      name: 'canAccessDoctorPortal',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: adminFieldRead,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
