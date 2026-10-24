# `src/access/` — Access Control Layer

One file per exported function or constant. The barrel `./index.ts`
re-exports everything for external consumers.

## Convention

Each file in this directory exports **exactly one** named access function,
helper, constant, or type. The filename is the kebab-case form of the export
name (e.g. `isSuperAdmin` → `is-super-admin.ts`, `ROLE_LEVELS` →
`role-levels.ts`). The single exception is `user-inspection.ts`, which groups
five tightly-coupled pure functions that all operate on the same `req.user`
shape — splitting them further would create a circular-dependency tangle with
no readability benefit.

### Importing

**External consumers** (collections, globals, hooks, tests) import from the
barrel:

```ts
import { isAdminOrAbove, publicReadOrAdmin } from '@/access'
// or, from inside src/:
import { isAdminOrAbove, publicReadOrAdmin } from '../access'
```

**Internal cross-file dependencies** (one access file importing another)
MUST use direct relative imports — never the barrel:

```ts
// inside src/access/has-permission.ts
import { isSuperAdmin } from './is-super-admin'
import { getUserPermissions } from './user-inspection'
```

This prevents circular imports. The barrel pulls in every file, so a barrel
import from inside one of those files would create a cycle.

### Adding a new access function

1. Create `src/access/<kebab-case-name>.ts` exporting a single named
   function. Annotate it with `Access` (collection-level) or `FieldAccess`
   (field-level) from the `payload` package.
2. If the function depends on another access helper, import it directly with a
   relative path (`./<other-file>`).
3. Add `export * from './<kebab-case-name>'` to `src/access/index.ts`.
4. Add a smoke test in `src/access/__tests__/<kebab-case-name>.test.ts`
   that imports from `../<kebab-case-name>` (direct, not the barrel).
5. Run `pnpm exec tsc --noEmit && pnpm lint && pnpm test:int` — all green
   before committing.

## File map

### Constants & types
- `role-levels.ts` — `ROLE_LEVELS` constant + `UserRole` type (deprecated,
  retires in PR-055 once the `Roles` collection is the sole source of truth
  for levels).

### `req.user` inspection (pure functions, no `Access` shape)
- `user-inspection.ts` — `getUserRoleSlug`, `getUserRoleObject`,
  `getUserRoleLevel`, `getUserCollegeScope`, `getUserPermissions`.
- `relationship-id.ts` — `relationshipId` (normalises a relationship-or-id
  value to its primitive ID).

### Role/level predicates (pure functions)
- `is-user-active.ts`, `is-role-active.ts`
- `is-super-admin.ts`, `is-admin.ts`, `is-content-manager.ts`,
  `is-coordinator.ts`, `is-student.ts`, `is-doctor.ts`
- `has-role.ts`, `has-role-level-at-least.ts`, `has-permission.ts`
- `can-manage-user-role.ts`, `can-access-admin.ts`,
  `is-same-college-scope.ts`

### Collection-level `Access` functions
- `is-authenticated.ts` — `isAuthenticated` (any logged-in user)
- `is-admin-or-above.ts` — `isAdminOrAbove` (level ≥ 4)
- `is-content-manager-or-above.ts` — `isContentManagerOrAbove` (level ≥ 3)
- `super-admin-only.ts` — `superAdminOnly` (super-admin only)
- `coordinator-scoped-update.ts` — `coordinatorScopedUpdate` (college-scoped
  write access for coordinators)

### Legacy `publicRead*` functions (deleted in PR-017)
- `public-read-or-admin.ts` — `publicReadOrAdmin`
- `public-read-active-or-admin.ts` — `publicReadActiveOrAdmin`
- `public-read-published-or-admin.ts` — `publicReadPublishedOrAdmin`

These filter on the ad-hoc `isPublished` / `isActive` boolean fields. Their
logic is preserved verbatim from the pre-PR-004 `helpers.ts` monolith; PR-017
swaps callers to the template-pattern functions below and deletes the legacy
ones.

### Template-pattern access functions (added PR-004)
- `anyone.ts` — `anyone: Access = () => true`
- `authenticated.ts` — `authenticated: Access = ({ req }) => Boolean(req.user)`
- `authenticated-or-published.ts` — `authenticatedOrPublished` (uses Payload's
  native `_status` draft/publish workflow).
- `authenticated-or-active.ts` — `authenticatedOrActive` (parity variant for
  the legacy `isPublished` field).

These mirror the official Payload template's access helpers. PR-017 swaps
existing callers of the legacy `publicRead*` functions to these.

### Field-level `FieldAccess` functions (extracted from `Users.ts` in PR-004)
- `admin-only-field-access.ts` — `adminOnlyFieldAccess` (admin+ only)
- `admin-or-self-field-read.ts` — `adminOrSelfFieldRead` (admin reads all,
  users read their own)
- `super-admin-field-write.ts` — `superAdminFieldWrite` (super-admin only;
  available for future use — no caller in PR-004)

## Why one-file-per-function?

The previous `helpers.ts` was a 315-LOC monolith with 28 exports. Problems:

1. **Circular-import risk** — internal helpers (`getUserRoleSlug`,
   `getUserPermissions`, etc.) imported each other through the same module,
   making it hard to reason about evaluation order.
2. **Tree-shaking opacity** — importing one function pulled in the entire
   access layer.
3. **Test friction** — every test had to import from the monolith; per-
   function test isolation required awkward partial mocking.
4. **Discoverability** — finding "where is `isSuperAdmin` defined?" required
   grepping the monolith instead of just opening `is-super-admin.ts`.

The split follows the official Payload template convention (one file per
access function) and aligns with the W1-1 spec for PR-004.
