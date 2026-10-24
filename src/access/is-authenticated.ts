import type { Access } from 'payload'

/**
 * Only logged-in users.
 */
export const isAuthenticated: Access = ({ req }) => {
  return Boolean(req.user)
}
