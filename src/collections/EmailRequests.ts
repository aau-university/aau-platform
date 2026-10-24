import type { CollectionConfig } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel, isAdminOrAbove } from '../access'

/**
 * EmailRequests — stores public email-request form submissions.
 *
 * Security decisions:
 * - `create: () => false` — no direct public creation under any circumstances.
 *   All submissions MUST go through `/api/public/email-request` which uses
 *   `overrideAccess: true`. This is the only sanctioned entry point.
 * - `sourceIp` and `userAgent` are stored for abuse review (admin-readOnly).
 * - Only admin+ can delete.
 *
 * Field model matches the approved plan (email-request is a student service
 * request, not a generic contact form):
 *   fullName, studentId, college, program, phone, alternateEmail,
 *   requestType, status, notes, sourceIp, userAgent
 */
export const EmailRequests: CollectionConfig = {
  slug: 'email-requests',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'studentId', 'requestType', 'status', 'createdAt'],
  },
  access: {
    // Strictly closed — the API route handler uses overrideAccess:true
    create: () => false,
    read: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
    delete: isAdminOrAbove,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'studentId',
      type: 'text',
      label: 'Student ID',
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      index: true,
      label: 'College',
    },
    {
      name: 'program',
      type: 'relationship',
      relationTo: 'academic-programs',
      index: true,
      label: 'Program',
      // Guard the unset case: without it, an unset `college` yields
      // `{ college: { equals: undefined } }`, which matches nothing and can
      // fail server-side relationship validation. Return `true` to show all
      // options until a college is chosen (matches the guarded siblings).
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone',
    },
    {
      name: 'alternateEmail',
      type: 'email',
      label: 'Alternate Email',
    },
    {
      name: 'requestType',
      type: 'select',
      required: true,
      label: 'Request Type',
      options: [
        { label: 'Academic Certificate', value: 'academic_certificate' },
        { label: 'Transcript', value: 'transcript' },
        { label: 'Enrollment Verification', value: 'enrollment_verification' },
        { label: 'Grade Objection', value: 'grade_objection' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Spam', value: 'spam' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Additional Notes',
    },
    {
      name: 'sourceIp',
      type: 'text',
      label: 'Source IP',
      admin: { readOnly: true },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User Agent',
      admin: { readOnly: true },
    },
    // Honeypot field — hidden from real users; bots tend to fill every
    // input. Server-side actions reject submissions that include a value.
    {
      name: '_hp',
      type: 'text',
      admin: { hidden: true },
    },
    // Reviewer audit trail — populated by admin actions (e.g. status
    // transitions to `in_review` / `resolved`). `readOnly` prevents manual
    // free-form edits; the values are set via Local API in handlers.
    {
      name: 'reviewedAt',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
