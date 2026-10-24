import type { Access, Where } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { PUBLISHED_WHERE } from './published'

/**
 * Minimum role level required to read draft (unpublished) content.
 *
 * Role hierarchy (see `./role-levels.ts`):
 *   1 = student / doctor
 *   2 = coordinator
 *   3 = content_manager
 *   4 = admin
 *   5 = super_admin
 *
 * Only Content Manager (level 3) and above may read drafts from collections
 * that have no college scope. Students, doctors, and coordinators — although
 * authenticated — must see only `_status: 'published'` documents, identical
 * to anonymous visitors. This closes the security gap where a coordinator
 * could enumerate university-wide drafts via
 * `GET /api/<collection>?where[_status][equals]=draft` (Issue #35).
 */
const DRAFT_READ_MIN_LEVEL = 3

/**
 * Template-pattern access function that exposes drafts in unscoped
 * collections only to Content Manager+ users.
 *
 * - Anonymous users                         → `{ _status: { equals: 'published' } }`
 * - Authenticated users with role level < 3 (student, doctor, coordinator)
 *                                           → `{ _status: { equals: 'published' } }`
 * - Authenticated users with role level ≥ 3 (content_manager, admin,
 *   super_admin)                            → `true` (see all, including drafts)
 *
 * Mirrors the official Payload template's `authenticatedOrPublished` access
 * function but tightens the authenticated branch to honour the AAU multi-role
 * hierarchy. Used on collections with drafts/versions enabled so that the
 * `_status` field exists (News, Events, BlogPosts, FAQs, Pages, Announcements,
 * Centers, CampusLife, Projects, ResearchPublications, Offers,
 * StudentAffairsDocuments, AdmissionRequirements).
 *
 * `hasRoleLevelAtLeast` resolves the level from `user.roleLevel` (JWT snapshot),
 * falling back to the populated `user.role.level`, then to the canonical
 * `ROLE_LEVELS` map keyed by `user.role.slug` / `user.roleSlug` /
 * `user.systemRole`. Returns `0` for unknown roles, which correctly denies
 * draft access (fail-secure).
 */
export const authenticatedOrPublished: Access = ({ req }): true | Where => {
  if (!req.user) return PUBLISHED_WHERE
  if (hasRoleLevelAtLeast(req.user, DRAFT_READ_MIN_LEVEL)) return true
  return PUBLISHED_WHERE
}
