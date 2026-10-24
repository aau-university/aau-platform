import type { GlobalConfig } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel } from '@/access'
import { link, localizedText, localizedTextarea } from '@/fields'
import { revalidatePublicGlobal } from '@/hooks/revalidatePublicCache'
import { auditVersions } from '@/utilities/versions'

/**
 * Footer Settings global.
 *
 * Plan source: `09-final-data-model.md` §7.32 (lines 2493-2525).
 *
 * Single-instance global holding footer configuration: footer link items
 * (each row = localized label + canonical `link()` group + optional group
 * label for column clustering), a background media selector (none/image/video
 * with conditional uploads), an overlay opacity, a hide-signup toggle, the
 * localized address + powered-by text.
 *
 * NOTE: `socialLinks` and `copyrightText` were removed from this global —
 * per plan §7.32 the social links moved to `SiteSettings` and the copyright
 * moved to `SiteSettings.copyright`.
 *
 * Access: public read, content-manager-or-above update.
 * Revalidation: `revalidatePublicGlobal('footer-settings')` on afterChange.
 */
export const FooterSettings: GlobalConfig = {
  slug: 'footer-settings',
  versions: auditVersions(),
  label: 'Footer Settings',
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
    afterChange: [revalidatePublicGlobal('footer-settings')],
  },
  fields: [
    {
      name: 'footerItems',
      type: 'array',
      label: 'Footer Items',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        localizedText('label', { required: true, label: 'Label' }),
        link({ appearances: false }),
        { name: 'group', type: 'text', label: 'Group' },
      ],
    },
    {
      name: 'footerBackgroundType',
      type: 'select',
      label: 'Footer background type',
      defaultValue: 'none',
      options: ['none', 'image', 'video'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'footerBackgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Footer background image',
      admin: {
        condition: (_, siblingData) => siblingData?.footerBackgroundType === 'image',
      },
    },
    {
      name: 'footerBackgroundVideo',
      type: 'upload',
      relationTo: 'media',
      label: 'Footer background video',
      admin: {
        condition: (_, siblingData) => siblingData?.footerBackgroundType === 'video',
      },
    },
    {
      name: 'footerBackgroundOverlayOpacity',
      type: 'number',
      label: 'Footer background overlay opacity',
      defaultValue: 0.65,
      min: 0,
      max: 1,
      admin: { position: 'sidebar' },
    },
    {
      name: 'hideFooterSignup',
      type: 'checkbox',
      defaultValue: false,
      label: 'Hide footer signup form',
      admin: { position: 'sidebar' },
    },
    localizedTextarea('address', { label: 'Address' }),
    localizedTextarea('footerPowered', {
      label: 'Powered by',
      admin: { position: 'sidebar' },
    }),
  ],
}
