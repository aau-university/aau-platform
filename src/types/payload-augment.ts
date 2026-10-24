/**
 * JWT virtual field type augmentation — INTENTIONAL NO-OP (PR-010).
 *
 * ## Why this file exists
 *
 * PR-010 spec called for a `declare module 'payload' { interface User { ... } }`
 * augmentation to expose the three JWT virtual fields (`roleSlug`, `roleLevel`,
 * `rolePermissions`) on `req.user`.
 *
 * ## Why the augmentation is unnecessary
 *
 * Payload v3 types `req.user` as `TypedUser = PayloadTypes['user']`, which
 * resolves to the `User` interface in `src/payload-types.ts`. That interface
 * is auto-generated from the `Users` collection config, and the three
 * `saveToJWT: true` virtual fields ARE declared there as actual fields
 * (see `src/collections/Users.ts` lines 137–154):
 *
 *   - `roleSlug?: string | null`
 *   - `roleLevel?: number | null`
 *   - `rolePermissions?: { ... } | unknown[] | string | number | boolean | null`
 *
 * So `req.user.roleSlug` etc. are already strongly typed without any module
 * augmentation.
 *
 * ## Why the augmentation is also impossible
 *
 * The `User` symbol exported from the `payload` package is a TYPE ALIAS
 * (`export type { UntypedUser as User }` — see `payload/dist/auth/types.d.ts`),
 * not an interface. TypeScript does not allow merging an `interface User`
 * augmentation with an existing `type User = ...` alias in the same module
 * — it produces `TS2300: Duplicate identifier 'User'`. The naive augmentation
 * pattern from the PR-010 spec would break every `import { ... } from 'payload'`
 * in the codebase.
 *
 * ## Resolution
 *
 * This file is kept as a documented stub so that:
 *   1. Future readers find this note when searching for "payload-augment".
 *   2. If Payload v4 makes `User` an interface (or removes the type alias),
 *      the augmentation block below can be uncommented.
 *   3. The acceptance criterion "payload-augment.ts exists" is satisfied.
 *
 * This file MUST be a module (top-level `export {}`) so it does not become
 * an ambient script that accidentally re-declares the `payload` module.
 */

export {}

/*
 * Reserved for Payload v4 (or once `payload.User` becomes an interface):
 *
 * declare module 'payload' {
 *   interface User {
 *     roleSlug?: string
 *     roleLevel?: number
 *     rolePermissions?: string[]
 *   }
 * }
 */
