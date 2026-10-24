import type { GlobalConfig } from 'payload'

import { hideBelowLevel, isContentManagerOrAbove } from '../access'
import { localizedText, localizedTextarea } from '../fields/localized'
import { revalidatePublicGlobal } from '../hooks/revalidatePublicCache'
import { auditVersions } from '../utilities/versions'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  versions: auditVersions(),
  label: 'Site Settings',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
  },
  access: {
    read: () => true,
    readVersions: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [revalidatePublicGlobal('site-settings')],
  },
  fields: [
    localizedText('siteName', { label: 'Site Name' }),
    localizedText('tagline', { label: 'Tagline' }),
    localizedTextarea('description', {
      label: 'Short Description',
      admin: {
        description:
          'Used in the footer brand column and as the default meta description. Keep it to 1-2 sentences.',
      },
    }),
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'contactPhone',
      type: 'text',
    },
    localizedTextarea('address', { label: 'Address' }),
    {
      name: 'mapLocation',
      type: 'text',
      admin: { description: 'Google Maps embed URL or coordinates' },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      label: 'Copyright Notice',
      admin: {
        description:
          'Copyright text shown in the footer. Use a locale-neutral format or add both languages (e.g. "جميع الحقوق محفوظة. All rights reserved.").',
      },
    },
    {
      name: 'footerLogo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'googleAnalyticsId',
      type: 'text',
    },
  ],
}
