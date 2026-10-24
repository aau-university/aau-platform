/**
 * Generic deep-merge utility.
 *
 * - Plain objects are merged recursively.
 * - Arrays are REPLACED (not concatenated) — a source array wholly overwrites
 *   the target array at the same key. This matches the official Payload
 *   template's `deepMerge` semantics and is the safe default for field
 *   overrides where partial array merges would be ambiguous.
 * - Primitives (strings, numbers, booleans, `null`, `undefined`, functions,
 *   symbols) are overwritten by the latest source.
 * - `null` and `undefined` sources are skipped, so callers can pass
 *   `overrides ?? {}` without narrowing.
 *
 * Lives in `src/fields/` because the primary consumers are field factories
 * (`link`, `linkGroup`, `slug`, `media`, `block`) that need to merge caller
 * overrides into a generated field config. PR-006 re-exports this from
 * `src/utilities/deepMerge.ts` for general-purpose use.
 *
 * Ported (with cleanup) from the official Payload template's
 * `utilities/deepMerge.ts` — dropped the `@ts-nocheck` escape hatch, added
 * variadic sources, and made the array-replace semantics explicit.
 */

/**
 * Narrow a value to "plain object" (not null, not an array). Used to decide
 * whether to recurse or overwrite.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/**
 * Deep-merge `target` with one or more `sources`. Later sources win.
 *
 * The target object is not mutated; a shallow copy is taken before any
 * recursive merge so the returned object can be safely held by the caller.
 *
 * @example
 *   deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } })
 *   // → { a: 1, b: { c: 2, d: 3 } }
 *
 *   deepMerge({ tags: ['a'] }, { tags: ['b'] })
 *   // → { tags: ['b'] }  (arrays are replaced, not concatenated)
 */
export function deepMerge<TTarget>(target: TTarget, ...sources: unknown[]): TTarget {
  if (!isPlainObject(target)) {
    // Non-object target — last source wins entirely.
    for (const source of sources) {
      if (source === undefined || source === null) continue
      return source as TTarget
    }
    return target
  }

  const output: Record<string, unknown> = { ...(target as Record<string, unknown>) }

  for (const source of sources) {
    if (!isPlainObject(source)) continue
    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      const targetValue = output[key]

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        output[key] = deepMerge(targetValue, sourceValue)
      } else {
        // Arrays, primitives, functions, null: overwrite.
        output[key] = sourceValue
      }
    }
  }

  return output as TTarget
}

export default deepMerge
