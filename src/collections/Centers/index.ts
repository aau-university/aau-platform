import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateCenters, revalidateDelete } from './hooks/revalidate'

/**
 * Centers — Services collection (PR-030 / V2-01 §2.4 / plan §7.19).
 *
 * Editorial content collection with versions and drafts.
 * Replaces the legacy uniform clone (title/slug/summary/content/image/
 * isActive) with the plan-specific field set: `kind` discriminator,
 * richText `description`/`services`/`programs`, contact fields, and
 * role-gated `displayOrder`.
 */
export const Centers: CollectionConfig = {
  slug: 'centers',
  labels: { singular: 'Center', plural: 'Centers' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('centers.manage'),
    group: 'Services',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'kind', '_status'],
    ...collectionPreview('centers'),
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateCenters],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, slug: true, kind: true },
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
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'center',
      admin: { position: 'sidebar' },
      options: ['center', 'service', 'universityCenter'],
    },
    localizedRichText('description', { label: 'Description' }),
    localizedRichText('services', { label: 'Services' }),
    localizedRichText('programs', { label: 'Programs' }),
    localizedText('location', { label: 'Location' }),
    {
      name: 'phone',
      type: 'text',
      label: 'Phone',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
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
  indexes: [{ fields: ['slug'], unique: true }, { fields: ['kind'] }, { fields: ['_status'] }],
  timestamps: true,
}
