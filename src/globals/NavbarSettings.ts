import type { GlobalConfig } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel } from '@/access'
import { link, localizedText } from '@/fields'
import { revalidatePublicGlobal } from '@/hooks/revalidatePublicCache'
import { auditVersions } from '@/utilities/versions'

/**
 * Navbar Settings global.
 *
 * Plan source: `09-final-data-model.md` §7.32 (lines 2463-2491).
 *
 * Single-instance global holding navbar configuration: top-bar links,
 * login/language-picker toggles, and the call-to-action button (rendered
 * via the canonical `link()` factory).
 *
 * Access: public read, content-manager-or-above update.
 * Revalidation: `revalidatePublicGlobal('navbar-settings')` on afterChange —
 * revalidates the public cache tag + the global-specific cache tag.
 */
export const NavbarSettings: GlobalConfig = {
  slug: 'navbar-settings',
  versions: auditVersions(),
  label: 'Navbar Settings',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    group: 'CMS',
  },
  access: {
    read: () => true,
    readVersions: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [revalidatePublicGlobal('navbar-settings')],
  },
  fields: [
    {
      name: 'topBarItems',
      type: 'array',
      label: 'Top Bar Items',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        localizedText('label', { required: true, label: 'Label' }),
        link({ appearances: false }),
        { name: 'openInNewTab', type: 'checkbox', defaultValue: false, label: 'Open in new tab' },
      ],
    },
    {
      name: 'hideLogin',
      type: 'checkbox',
      defaultValue: false,
      label: 'Hide login button',
      admin: { position: 'sidebar' },
    },
    {
      name: 'showLanguagePicker',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show language picker',
      admin: { position: 'sidebar' },
    },
    link({
      appearances: ['default', 'secondary', 'ghost'],
      overrides: {
        name: 'callToAction',
        label: 'Call to Action',
      },
    }),
  ],
}
