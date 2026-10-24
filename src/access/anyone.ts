import type { Access } from 'payload'

/**
 * Template-pattern access function: always allows.
 *
 * Mirrors the official Payload template's `anyone` access function. Useful as
 * an explicit, self-documenting alternative to `() => true` for collections
 * or fields where public read access is intentional.
 */
export const anyone: Access = () => true
