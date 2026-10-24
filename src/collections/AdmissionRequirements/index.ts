import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { revalidateAdmissionRequirements, revalidateDelete } from './hooks/revalidate'
import { editorialVersions } from '../../utilities/versions'

/**
 * AdmissionRequirements — Documents collection (PR-030 / V2-01 §2.13
 * / plan §7.29).
 *
 * Editorial content collection with versions/drafts (so anonymous read
 * uses `authenticatedOrPublished`). Has no slug — items are identified
 * by `title` only. Plain richText body + image + role-gated
 * `displayOrder` for list ordering. No `populatePublishedAt` because
 * the plan does not include a `publishedAt` field on this collection.
 */
export const AdmissionRequirements: CollectionConfig = {
  slug: 'admission-requirements',
  labels: {
    singular: 'Admission Requirement',
    plural: 'Admission Requirements',
  },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('admission.manage'),
    group: 'Documents',
    useAsTitle: 'title',
    defaultColumns: ['title', 'displayOrder'],
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    afterChange: [revalidateAdmissionRequirements],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, displayOrder: true },
  fields: [
    localizedText('title', { required: true, label: 'Title' }),
    localizedRichText('content', { label: 'Content' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
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
