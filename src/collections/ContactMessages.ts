import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel, isAdminOrAbove } from '../access'
import { validateContactMessage } from '../hooks/formValidation'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    useAsTitle: 'subject',
    defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'],
  },
  access: {
    // Direct public REST create is CLOSED. Public submissions must go
    // through POST /api/public/contact, which validates with Zod, enforces
    // rate limits, then calls payload.create with overrideAccess:true.
    // Authenticated content_manager+ may still create entries from admin.
    create: () => false,
    read: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
    delete: isAdminOrAbove,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        // Only validate on create (public submissions); updates are admin-only
        if (operation !== 'create') return data

        // Honeypot check
        if (data?._hp) {
          throw new APIError('Spam detected', 400)
        }

        const result = validateContactMessage(data)
        if (result !== true) {
          throw new APIError(result, 400)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Replied', value: 'replied' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Internal admin notes' },
    },
    // ── Honeypot (anti-bot): must be empty on submission ─────
    {
      name: '_hp',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Honeypot field — leave empty. Filled submissions are rejected.',
      },
    },
  ],
  timestamps: true,
}
