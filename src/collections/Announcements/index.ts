import type { CollectionConfig } from 'payload'

import {
  contentManagerFieldAccess,
  coordinatorEditorialAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { enforceCoordinatorScopeHook } from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { editorialVersions } from '../../utilities/versions'
import { revalidateAnnouncements, revalidateDelete } from './hooks/revalidate'

/**
 * Announcements — Content collection (PR-030 / V2-01 §2.12 / plan §7.15).
 *
 * Editorial content collection with versions and drafts.
 * Coordinator-scoped: create/update access uses `coordinatorScopedUpdate`
 * (content manager+ unrestricted; coordinator limited to their college
 * via the `college` field). The `enforceCoordinatorScopeHook` runs in
 * `beforeChange` as defense in depth — even if a coordinator tries to
 * spoof the `college` field, the hook rejects the write.
 *
 * `college` is optional (leave empty for university-wide announcement).
 * `publishDate` is required and set by the editor.
 */
export const Announcements: CollectionConfig = {
  slug: 'announcements',
  labels: { singular: 'Announcement', plural: 'Announcements' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('announcements.manage'),
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishDate', 'college', '_status'],
  },
  access: coordinatorEditorialAccess({ permission: 'announcements.manage' }),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [enforceCoordinatorScopeHook({ collegeField: 'college' })],
    afterChange: [revalidateAnnouncements],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, publishDate: true },
  fields: [
    localizedText('title', { required: true, label: 'Title' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    localizedRichText('content', { label: 'Content' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'publishDate',
      type: 'date',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Leave empty for university-wide announcement',
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
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['college'] },
    { fields: ['publishDate'] },
  ],
  timestamps: true,
}
