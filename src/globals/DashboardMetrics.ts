import type { GlobalConfig } from 'payload'

import { hideBelowLevel, isContentManagerOrAbove } from '@/access'
import { revalidatePublicGlobal } from '@/hooks/revalidatePublicCache'

/**
 * Dashboard Metrics global.
 *
 * Plan source: `09-final-data-model.md` §7.32 (lines 2637-2655).
 *
 * Single-instance global holding aggregate counts surfaced on the public
 * dashboard / homepage stat blocks. All number fields default to `0` and
 * are read-only in the admin (computed by background sync tasks, not edited
 * by humans). `lastUpdated` is a read-only sidebar date stamp.
 *
 * Access: PUBLIC read (the values power public stat blocks); admin-or-above
 * update. The clone shipped with `read: isAdminOrAbove` — too restrictive
 * per plan §7.32 line 2642, fixed here to `read: () => true`.
 *
 * Revalidation: `revalidatePublicGlobal('dashboard-metrics')` on afterChange.
 */
export const DashboardMetrics: GlobalConfig = {
  slug: 'dashboard-metrics',
  label: 'Dashboard Metrics',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    group: 'CMS',
  },
  access: {
    read: () => true,
    update: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [revalidatePublicGlobal('dashboard-metrics')],
  },
  fields: [
    {
      name: 'totalStudents',
      type: 'number',
      defaultValue: 0,
      label: 'Total students',
      admin: { readOnly: true },
    },
    {
      name: 'totalPrograms',
      type: 'number',
      defaultValue: 0,
      label: 'Total programs',
      admin: { readOnly: true },
    },
    {
      name: 'totalCourses',
      type: 'number',
      defaultValue: 0,
      label: 'Total courses',
      admin: { readOnly: true },
    },
    {
      name: 'totalFaculty',
      type: 'number',
      defaultValue: 0,
      label: 'Total faculty',
      admin: { readOnly: true },
    },
    {
      name: 'totalColleges',
      type: 'number',
      defaultValue: 0,
      label: 'Total colleges',
      admin: { readOnly: true },
    },
    {
      name: 'totalNews',
      type: 'number',
      defaultValue: 0,
      label: 'Total news',
      admin: { readOnly: true },
    },
    {
      name: 'totalEvents',
      type: 'number',
      defaultValue: 0,
      label: 'Total events',
      admin: { readOnly: true },
    },
    {
      name: 'lastUpdated',
      type: 'date',
      label: 'Last updated',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
