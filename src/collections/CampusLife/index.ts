import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateCampusLife, revalidateDelete } from './hooks/revalidate'

/**
 * CampusLife — Services collection (PR-030 / V2-01 §2.7 / plan §7.22).
 *
 * Editorial content collection with versions and drafts.
 * Replaces the uniform clone with the plan-specific field set: `kind`
 * discriminator (life/activity), `sidebarTitle`/`highlightsTitle`,
 * repeatable `highlights` (array of localized text) and `stats` (array
 * of value+label), plus `sidebarNote`.
 */
export const CampusLife: CollectionConfig = {
  slug: 'campus-life',
  labels: { singular: 'Campus Life Item', plural: 'Campus Life Items' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('campus-life.manage'),
    group: 'Services',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'kind', '_status'],
    ...collectionPreview('campus-life'),
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateCampusLife],
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
      defaultValue: 'life',
      admin: { position: 'sidebar' },
      options: ['life', 'activity'],
    },
    localizedRichText('content', { label: 'Content' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    localizedText('sidebarTitle', { label: 'Sidebar Title' }),
    localizedText('highlightsTitle', { label: 'Highlights Title' }),
    {
      name: 'highlights',
      type: 'array',
      label: 'Highlights',
      fields: [
        {
          name: 'highlight',
          type: 'text',
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Stats',
      fields: [
        {
          name: 'value',
          type: 'number',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
      ],
    },
    localizedTextarea('sidebarNote', { label: 'Sidebar Note' }),
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
