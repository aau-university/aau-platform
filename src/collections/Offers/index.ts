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
import { revalidateOffers, revalidateDelete } from './hooks/revalidate'

/**
 * Offers — Marketing collection (PR-030 / V2-01 §2.8 / plan §7.23).
 *
 * Editorial content collection with versions and drafts.
 * The largest content collection: 24 fields including a 7-field
 * "Interest Section" group (interestTitle, interestSubtitle,
 * interestOpenTitle, interestOpenSubtitle, interestHighlightsTitle,
 * interestHighlights array, interestNotice). `category` is filtered to
 * `kind: 'offer'` categories. Optional `college` relationship for
 * college-scoped offers.
 */
export const Offers: CollectionConfig = {
  slug: 'offers',
  labels: { singular: 'Offer', plural: 'Offers' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('offers.manage'),
    group: 'Marketing',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'category', 'validUntil', '_status'],
    ...collectionPreview('offers'),
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateOffers],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, slug: true, category: true, validUntil: true },
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
    localizedTextarea('description', { label: 'Description' }),
    localizedRichText('details', { label: 'Details' }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      filterOptions: () => ({ kind: { equals: 'offer' } }),
    },
    localizedTextarea('targetAudience', { label: 'Target Audience' }),
    localizedRichText('benefits', { label: 'Benefits' }),
    localizedText('duration', { label: 'Duration' }),
    localizedText('location', { label: 'Location' }),
    localizedTextarea('requirements', { label: 'Requirements' }),
    {
      name: 'validUntil',
      type: 'date',
      label: 'Valid Until',
      admin: { position: 'sidebar' },
    },
    {
      name: 'applyLink',
      type: 'text',
      label: 'Apply Link',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Leave empty for university-wide offer',
      },
    },
    // Interest section (16 Frappe fields → 7 fields + 1 array).
    // Wrapped in a `collapsible` group for admin UX — Payload's field
    // admin config does not support a `group` property, so we use a
    // collapsible block to visually group these 7 fields together.
    {
      type: 'collapsible',
      label: 'Interest Section',
      fields: [
        localizedText('interestTitle', { label: 'Interest Title' }),
        localizedText('interestSubtitle', { label: 'Interest Subtitle' }),
        localizedText('interestOpenTitle', { label: 'Interest Open Title' }),
        localizedText('interestOpenSubtitle', { label: 'Interest Open Subtitle' }),
        localizedText('interestHighlightsTitle', {
          label: 'Interest Highlights Title',
        }),
        {
          name: 'interestHighlights',
          type: 'array',
          label: 'Interest Highlights',
          fields: [
            {
              name: 'highlight',
              type: 'text',
              localized: true,
              required: true,
            },
          ],
        },
        localizedTextarea('interestNotice', { label: 'Interest Notice' }),
      ],
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
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['category'] },
    { fields: ['validUntil'] },
    { fields: ['_status'] },
  ],
  timestamps: true,
}
