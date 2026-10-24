import type { GlobalConfig } from 'payload'

import { hideBelowLevel, isContentManagerOrAbove } from '@/access'
import { revalidatePublicGlobal } from '@/hooks/revalidatePublicCache'

/**
 * Analytics Settings global.
 *
 * Plan source: `09-final-data-model.md` §7.32 (lines 2527-2545).
 *
 * Single-instance global holding site-wide analytics / SEO injection
 * settings: GA4 measurement ID + IP-anonymization toggle, view-tracking
 * toggle, raw `robots.txt` content, custom `<head>` HTML, and a Google
 * Indexing API toggle (the *field* is part of V2-01 schema; the actual
 * Indexing API client integration is deferred to Phase 4 per plan
 * comment on line 2541).
 *
 * Access: public read, admin-or-above update.
 * Revalidation: `revalidatePublicGlobal('analytics-settings')` on afterChange.
 */
export const AnalyticsSettings: GlobalConfig = {
  slug: 'analytics-settings',
  label: 'Analytics Settings',
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
    afterChange: [revalidatePublicGlobal('analytics-settings')],
  },
  fields: [
    {
      name: 'googleAnalyticsId',
      type: 'text',
      label: 'Google Analytics ID',
      admin: { description: 'GA4 measurement ID (e.g., G-XXXXXXXX)' },
    },
    {
      name: 'googleAnalyticsAnonymizeIp',
      type: 'checkbox',
      defaultValue: true,
      label: 'Anonymize IP in Google Analytics',
    },
    {
      name: 'enableViewTracking',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enable view tracking',
    },
    {
      name: 'robotsTxt',
      type: 'textarea',
      label: 'robots.txt',
      admin: { description: 'Raw robots.txt content' },
    },
    {
      name: 'headHtml',
      type: 'textarea',
      label: 'Head HTML',
      admin: { description: 'Custom HTML for <head>' },
    },
    // Phase 4 (deferred): Google Indexing API tokens.
    {
      name: 'enableGoogleIndexing',
      type: 'checkbox',
      defaultValue: false,
      label: 'Enable Google Indexing API',
      admin: { position: 'sidebar' },
    },
  ],
}
