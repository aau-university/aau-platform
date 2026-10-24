import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideBelowLevel,
} from '../../access'
import { localizedText } from '../../fields/localized'
import { revalidateStudentAffairsDocuments, revalidateDelete } from './hooks/revalidate'
import { editorialVersions } from '../../utilities/versions'

/**
 * StudentAffairsDocuments — Documents collection (PR-030 / V2-01 §2.11
 * / plan §7.28).
 *
 * Editorial collection with versions/drafts (so anonymous read uses
 * `authenticatedOrPublished`). Has no slug — items are identified by
 * `title` only. The `file` upload is conditionally hidden when
 * `fileComingSoon` is true (frontend renders a "coming soon" placeholder
 * instead of a download link).
 *
 * Uploads target `private-media` so files are not served by the public
 * static handler; admin-only access is enforced by the PrivateMedia
 * collection's own access rules.
 */
export const StudentAffairsDocuments: CollectionConfig = {
  slug: 'student-affairs-documents',
  labels: {
    singular: 'Student Affairs Document',
    plural: 'Student Affairs Documents',
  },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    group: 'Documents',
    useAsTitle: 'title',
    defaultColumns: ['title', 'fileComingSoon', 'displayOrder'],
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    afterChange: [revalidateStudentAffairsDocuments],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, fileComingSoon: true, displayOrder: true },
  fields: [
    localizedText('title', { required: true, label: 'Title' }),
    {
      name: 'file',
      type: 'upload',
      relationTo: 'private-media',
      admin: {
        condition: (_, siblingData) => siblingData?.fileComingSoon !== true,
      },
    },
    {
      name: 'fileComingSoon',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'When true, frontend renders "coming soon" placeholder',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: { position: 'sidebar' },
      access: {
        update: contentManagerFieldAccess,
      },
    },
  ],
  indexes: [{ fields: ['_status'] }],
  timestamps: true,
}
