import type { CollectionConfig } from 'payload'

import {
  contentManagerFieldAccess,
  isContentManagerOrAbove,
  publicReadActiveOrAdmin,
  hideUnlessPermission,
} from '../../access'
import { localizedText, localizedTextarea } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { revalidatePartners, revalidateDelete } from './hooks/revalidate'

/**
 * Partners — Marketing collection (PR-030 / V2-01 §2.9 / plan §7.24).
 *
 * Non-editorial list-page collection: NO versions/drafts, NO slug,
 * NO `populatePublishedAt`. The plan identifies partners by `name` +
 * `logo` (NOT `title` + `image`). Public read filters on `isActive`
 * via `publicReadActiveOrAdmin` so anonymous visitors only see active
 * partners; Content Manager+ can see all.
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: 'Partner', plural: 'Partners' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('partners.manage'),
    group: 'Marketing',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'isActive', 'displayOrder'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: publicReadActiveOrAdmin,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('name')],
    afterChange: [revalidatePartners],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { name: true, logo: true, type: true, isActive: true },
  fields: [
    localizedText('name', { required: true, label: 'Name' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    localizedTextarea('description', { label: 'Description' }),
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'type',
      type: 'select',
      options: ['local', 'international'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'website',
      type: 'text',
      label: 'Website',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
      access: {
        update: contentManagerFieldAccess,
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
  indexes: [{ fields: ['isActive'] }],
  timestamps: true,
}
