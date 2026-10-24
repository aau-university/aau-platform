/**
 * Barrel for the access-control layer.
 *
 * Convention: one file per exported function or constant. Add a new access
 * function by creating `src/access/<kebab-case-name>.ts` that exports a single
 * named function/constant, then re-export it from this barrel with
 * `export * from './<kebab-case-name>'`.
 *
 * External consumers (collections, globals, hooks) MUST import from this barrel:
 *
 *   import { isAdminOrAbove, publicReadOrAdmin } from '@/access'
 *
 * Internal cross-file dependencies inside `src/access/` MUST use direct
 * relative imports (e.g. `import { isSuperAdmin } from './is-super-admin'`)
 * to avoid circular-import problems — the barrel is for external consumers
 * only.
 *
 * Draft-enabled collections use Payload's `_status` helpers. Collections
 * that intentionally remain non-draft (for example active marketing lists)
 * keep their `isActive` / `isPublished` access helpers.
 *
 * ## Field-level access
 *
 * `adminOnlyFieldAccess`, `adminOrSelfFieldRead`, and `superAdminFieldWrite`
 * are `FieldAccess` (not collection `Access`) helpers extracted from inline
 * closures in `src/collections/Users.ts`. They live here so other collections
 * can reuse them without duplicating the closure.
 */
export * from './role-levels'
export * from './user-inspection'
export * from './relationship-id'
export * from './is-user-active'
export * from './is-role-active'
export * from './is-super-admin'
export * from './is-admin'
export * from './is-content-manager'
export * from './is-coordinator'
export * from './is-student'
export * from './is-doctor'
export * from './has-role'
export * from './has-role-level-at-least'
export * from './has-permission'
export * from './can-manage-user-role'
export * from './can-access-admin'
export * from './is-same-college-scope'
export * from './is-authenticated'
export * from './is-admin-or-above'
export * from './super-admin-only'
export * from './is-content-manager-or-above'
export * from './public-read-or-admin'
export * from './public-read-active-or-admin'
export * from './public-read-published-or-admin'
export * from './anyone'
export * from './authenticated'
export * from './authenticated-or-published'
export * from './authenticated-or-active'
export * from './published'
export * from './editorial-access'
export * from './admin-only-field-access'
export * from './content-manager-field-access'
export * from './admin-or-self-field-read'
export * from './super-admin-field-write'
export * from './coordinator-own-college-update'
export * from './coordinator-scoped-update'
export * from './media-access'
export * from './coordinator-scoped-read'
export * from './coordinator-scoped-read-versions'
export * from './admin-nav'
export * from './coordinator-own-college-read'
export * from './manageable-users'
