import type { Access } from 'payload'

import { isSuperAdmin } from './is-super-admin'

/**
 * Super Admin only.
 */
export const superAdminOnly: Access = ({ req }) => {
  return Boolean(req.user && isSuperAdmin(req.user))
}
