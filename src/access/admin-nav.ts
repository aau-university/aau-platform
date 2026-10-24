import { hasPermission } from './has-permission'
import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Admin-panel navigation visibility helpers.
 *
 * Payload's `admin.hidden` is `((args: { user }) => boolean) | boolean` and
 * excludes a collection/global from **both the nav and the admin routes**
 * (payload 3.85.1 `collections/config/types.d.ts`). It is still a UI-layer
 * control: the authoritative protection is the `access` config, which stays
 * untouched here. Both layers are applied together (defense in depth) —
 * `hidden` keeps the panel focused, `access` keeps the data safe.
 *
 * The visibility rule is derived from the role's own `permissions` keys
 * rather than a hardcoded slug list, so granting a coordinator a new
 * capability in the Roles collection surfaces the matching collection in
 * their nav with no code change.
 *
 * Both helpers are deliberately SYNCHRONOUS: Payload treats the return value
 * as a plain boolean, so an async function would resolve to a truthy Promise
 * and hide the entity from everyone. Payload also treats a thrown error as
 * "hidden", so the checks stay total and never throw.
 *
 * `user` is typed `unknown` because collections receive `ClientUser` while
 * globals receive `PayloadRequest['user']` (nullable); the inspection helpers
 * below accept both.
 */

type HiddenArgs = { user: unknown }

/** Content manager and above always see the full panel. */
const FULL_PANEL_LEVEL = 3

/**
 * Hide a content collection unless the user is content-manager+ OR their
 * role holds `permission`.
 *
 * Coordinators (level 2) therefore see exactly the collections their role
 * is allowed to manage — e.g. `news.manage` surfaces News.
 */
export function hideUnlessPermission(permission: string) {
  return ({ user }: HiddenArgs): boolean => {
    if (!user) return true
    // `hasRoleLevelAtLeast` (not a raw level read) so a deactivated user or a
    // user on a deactivated role is treated as unprivileged here too, exactly
    // as every other helper in this directory does.
    if (hasRoleLevelAtLeast(user, FULL_PANEL_LEVEL)) return false
    return !hasPermission(user, permission)
  }
}

/**
 * Hide a system/ops area below `level` — used for collections and globals
 * that are never coordinator-facing regardless of capability keys
 * (users, roles, private media, form inboxes, settings).
 */
export function hideBelowLevel(level: number) {
  return ({ user }: HiddenArgs): boolean => {
    if (!user) return true
    return !hasRoleLevelAtLeast(user, level)
  }
}
