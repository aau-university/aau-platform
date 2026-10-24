import type { CollectionConfig } from 'payload'

import {
  assignableRolesFilter,
  canAccessAdmin,
  createManageableUsers,
  deleteManageableUsers,
  privilegedUserFieldAccess,
  privilegedUserFieldRead,
  readManageableUsers,
  updateManageableUsers,
  hideBelowLevel,
} from '../access'
import { enforceRoleHierarchyHook } from '../hooks/enforceRoleHierarchy'
import { enforceLastSuperAdminOnDelete } from '../hooks/enforceLastSuperAdminOnDelete'
import { injectRoleVirtualFieldsHook } from '../hooks/injectRoleVirtualFields'
import { revokePreviewSessionsOnLogout } from '../hooks/revokePreviewSessionsOnLogout'
import { isSecureServerOrigin } from '../utilities/getURL'

const denySnapshotFieldWrite = () => false

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'firstName', 'lastName'],
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    // Brute-force protection on the admin auth collection: lock the
    // account for 10 minutes after 5 consecutive failed logins.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: {
      // The public/admin production site is served over HTTPS through the
      // university reverse proxy, so the Payload auth cookie is explicitly
      // `Secure` there. It follows the resolved origin's scheme rather than
      // `NODE_ENV` alone: the standalone browser suite serves the same
      // production artifact over loopback HTTP, and a `Secure` cookie is
      // never sent over that origin.
      //
      // `sameSite` and `domain` are intentionally left at Payload's defaults.
      // The production topology is same-origin (proxy and app share the
      // university host), so the simplest cookie model is also the correct
      // one; Docker alone is not a reason to widen it.
      secure: isSecureServerOrigin(),
    },
  },
  access: {
    // Admin panel visibility: only coordinator (level 2) and above
    admin: ({ req: { user } }) => canAccessAdmin(user as unknown),
    // Content manager (level 3) and above may create users. The role they
    // are allowed to assign is capped by `enforceRoleHierarchyHook` +
    // `assignableRolesFilter`: strictly below their own level, so a content
    // manager can create a coordinator but never an admin, super-admin, or
    // another content manager. No public self-registration.
    create: createManageableUsers,
    // Admin+ sees all; a content manager sees themselves plus lower-level
    // users; everyone else sees only themselves.
    read: readManageableUsers,
    // Same shape as read — sensitive fields are further locked by
    // field-level access below.
    update: updateManageableUsers,
    // Super-admin unrestricted; content manager and admin may delete only
    // strictly lower-level users. `enforceLastSuperAdminOnDelete` still
    // guards the final super-admin account.
    delete: deleteManageableUsers,
  },
  hooks: {
    afterLogout: [revokePreviewSessionsOnLogout],
    beforeChange: [enforceRoleHierarchyHook, injectRoleVirtualFieldsHook],
    // Standard `CollectionBeforeDeleteHook` (Issue #39): refuses to delete
    // the last `super_admin` user. Consolidated from a non-standard wrapper
    // that lived in `enforceRoleHierarchy.ts` (which had a different
    // signature `({ req, id })` and threw `APIError`). The standard hook is
    // typed `CollectionBeforeDeleteHook`, throws a plain `Error`, and is
    // unit-tested in `__tests__/hooks/enforceLastSuperAdminOnDelete.test.ts`.
    beforeDelete: [enforceLastSuperAdminOnDelete],
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: true,
      // Offer (and server-side validate) only roles strictly below the
      // actor's own level — see `assignableRolesFilter`.
      filterOptions: assignableRolesFilter,
      access: {
        // Content manager+ can read any managed user's role; users read their
        // own. Must match the write guard below or the required picker blanks.
        read: privilegedUserFieldRead,
        // Content manager+ can assign roles; `enforceRoleHierarchyHook`
        // rejects anything at or above the actor's own level.
        update: privilegedUserFieldAccess,
        create: privilegedUserFieldAccess,
      },
    },
    {
      name: 'systemRole',
      type: 'select',
      defaultValue: 'student',
      saveToJWT: true,
      admin: {
        hidden: true,
        description:
          'Transitional JWT role value. Access logic prefers role.slug when the relationship is populated.',
      },
      access: {
        read: privilegedUserFieldRead,
        // Mirrors `role` — the hierarchy hook takes the MAX of role and
        // systemRole levels, so this cannot be used to smuggle a higher tier.
        update: privilegedUserFieldAccess,
        create: privilegedUserFieldAccess,
      },
      options: [
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Content Manager', value: 'content_manager' },
        { label: 'Coordinator', value: 'coordinator' },
        { label: 'Student', value: 'student' },
        { label: 'Doctor', value: 'doctor' },
      ],
    },
    {
      name: 'roleSlug',
      type: 'text',
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        update: denySnapshotFieldWrite,
        create: denySnapshotFieldWrite,
      },
    },
    {
      name: 'roleLevel',
      type: 'number',
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        update: denySnapshotFieldWrite,
        create: denySnapshotFieldWrite,
      },
    },
    {
      name: 'rolePermissions',
      type: 'json',
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        update: denySnapshotFieldWrite,
        create: denySnapshotFieldWrite,
      },
    },
    {
      name: 'roleIsActive',
      type: 'checkbox',
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        update: denySnapshotFieldWrite,
        create: denySnapshotFieldWrite,
      },
    },
    {
      name: 'roleCanAccessPayloadAdmin',
      type: 'checkbox',
      saveToJWT: true,
      admin: { hidden: true },
      access: {
        update: denySnapshotFieldWrite,
        create: denySnapshotFieldWrite,
      },
    },
    {
      name: 'collegeScope',
      type: 'relationship',
      relationTo: 'colleges',
      admin: {
        position: 'sidebar',
        description: 'Required for Coordinator role — scopes access to one college',
      },
      access: {
        // Content manager+ can set a coordinator's college scope — they
        // create coordinators, and the role is invalid without one.
        update: privilegedUserFieldAccess,
        create: privilegedUserFieldAccess,
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      // Users can update their own avatar (no extra field access restriction)
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      access: {
        // Content manager+ can activate/deactivate the accounts they manage
        // (collection-level access already limits them to lower-level rows).
        update: privilegedUserFieldAccess,
        create: privilegedUserFieldAccess,
      },
    },
  ],
  timestamps: true,
}
