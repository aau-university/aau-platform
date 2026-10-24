import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel, isAdminOrAbove } from '../access'
import { validateJoinRequest } from '../hooks/formValidation'

export const JoinRequests: CollectionConfig = {
  slug: 'join-requests',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'desiredCollege', 'status', 'createdAt'],
  },
  access: {
    // Direct public REST create is CLOSED. Public submissions must go
    // through POST /api/public/join-request, which validates with Zod,
    // enforces rate limits, then calls payload.create with overrideAccess.
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
        const result = validateJoinRequest(data)
        if (result !== true) {
          throw new APIError(result, 400)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'submissionKey',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'fullName',
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
      required: true,
    },
    {
      name: 'nationalId',
      type: 'text',
    },
    {
      name: 'dateOfBirth',
      type: 'date',
    },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ],
    },
    {
      name: 'nationality',
      type: 'text',
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'highSchoolType',
      type: 'text',
    },
    {
      name: 'highSchoolGpa',
      type: 'number',
    },
    {
      name: 'desiredCollege',
      type: 'relationship',
      relationTo: 'colleges',
    },
    {
      name: 'desiredProgram',
      type: 'relationship',
      relationTo: 'academic-programs',
    },
    {
      name: 'filePreviews',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/FilePreviews#FilePreviews',
        },
      },
    },
    {
      name: 'highSchoolDocument',
      type: 'relationship',
      relationTo: 'private-media',
      label: 'High School Document',
    },
    {
      name: 'idDocument',
      type: 'relationship',
      relationTo: 'private-media',
      label: 'ID Document',
    },
    {
      name: 'personalPhoto',
      type: 'relationship',
      relationTo: 'private-media',
      label: 'Personal Photo',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
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
