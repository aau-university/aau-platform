import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateResearchPublications, revalidateDelete } from './hooks/revalidate'

/**
 * ResearchPublications — Services collection (PR-030 / V2-01 §2.6 / plan §7.21).
 *
 * Editorial content collection with versions and drafts.
 * Holds academic publications. `author` is a plain localized text (not a
 * relationship) per plan. `category` is filtered to `kind: 'project'`
 * categories.
 */
export const ResearchPublications: CollectionConfig = {
  slug: 'research-publications',
  labels: { singular: 'Research Publication', plural: 'Research Publications' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('research.manage'),
    group: 'Services',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishDate', '_status'],
    ...collectionPreview('research-publications'),
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    afterChange: [revalidateResearchPublications],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, slug: true, publishDate: true },
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
    localizedText('author', { label: 'Author' }),
    localizedTextarea('summary', { label: 'Summary' }),
    localizedRichText('content', { label: 'Content' }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      filterOptions: () => ({ kind: { equals: 'project' } }),
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: 'publishDate',
      type: 'date',
      label: 'Publish Date',
    },
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
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['publishDate'] },
    { fields: ['_status'] },
  ],
  timestamps: true,
}
