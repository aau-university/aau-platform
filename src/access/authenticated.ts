import type { Access } from 'payload'

/**
 * Template-pattern access function: only authenticated users.
 *
 * Mirrors the official Payload template's `authenticated` access function.
 * Returns `true` when `req.user` is present (any authenticated user),
 * `false` otherwise. Does not enforce any role hierarchy.
 */
export const authenticated: Access = ({ req }) => Boolean(req.user)
