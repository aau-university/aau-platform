import type { GlobalConfig } from 'payload'

import { hideBelowLevel, isContentManagerOrAbove } from '../access'
import { localizedText, localizedTextarea } from '../fields/localized'
import { revalidatePublicGlobal } from '../hooks/revalidatePublicCache'
import { auditVersions } from '../utilities/versions'

export const ContactSettings: GlobalConfig = {
  slug: 'contact-settings',
  versions: auditVersions(),
  label: 'Contact Settings',
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
    afterChange: [revalidatePublicGlobal('contact-settings')],
  },
  fields: [
    // ── Page Header ─────────────────────────────
    {
      name: 'page',
      type: 'group',
      label: 'Page Header',
      fields: [
        localizedText('badge', { label: 'Badge' }),
        localizedText('title', { label: 'Title' }),
        localizedTextarea('description', { label: 'Description' }),
      ],
    },
    // ── Form Labels ─────────────────────────────
    {
      name: 'formLabels',
      type: 'group',
      label: 'Form Labels',
      fields: [
        localizedText('nameLabel'),
        localizedText('namePlaceholder'),
        localizedText('emailLabel'),
        localizedText('emailPlaceholder'),
        localizedText('subjectLabel'),
        localizedText('subjectPlaceholder'),
        localizedText('messageLabel'),
        localizedText('messagePlaceholder'),
        localizedText('submitText'),
      ],
    },
    // ── Contact Info ────────────────────────────
    {
      name: 'contactInfo',
      type: 'group',
      label: 'Contact Info',
      fields: [
        { name: 'phone', type: 'text', label: 'Phone' },
        { name: 'email', type: 'email', label: 'Email' },
        localizedTextarea('address', { label: 'Address' }),
      ],
    },
  ],
}
