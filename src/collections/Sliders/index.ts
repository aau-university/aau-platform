import type { CollectionConfig } from 'payload'

import {
  contentManagerFieldAccess,
  isContentManagerOrAbove,
  publicReadActiveOrAdmin,
  hideUnlessPermission,
} from '../../access'
import { link } from '../../fields/link'
import { localizedText, localizedTextarea } from '../../fields/localized'
import { revalidateSliders, revalidateDelete } from './hooks/revalidate'

/**
 * Sliders — Marketing collection (PR-030 / V2-01 §2.10 / plan §7.25).
 *
 * Non-editorial list-page collection: NO versions/drafts, NO slug, NO
 * `populatePublishedAt`. Title is NOT required (a slider may be just
 * an image + link). `image` IS required. `link` is the canonical AAU
 * link group (internal reference or custom URL, no appearance variants).
 *
 * Public read filters on `isActive: true` via `publicReadActiveOrAdmin`
 * (the collection is not draft-enabled, so `authenticatedOrPublished`
 * would return zero results for anonymous visitors).
 */
export const Sliders: CollectionConfig = {
  slug: 'sliders',
  labels: { singular: 'Slider', plural: 'Sliders' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('sliders.manage'),
    group: 'Marketing',
    useAsTitle: 'title',
    defaultColumns: ['title', 'isActive', 'displayOrder'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: publicReadActiveOrAdmin,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [revalidateSliders],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, image: true, isActive: true },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('subtitle', { label: 'Subtitle' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    link({ appearances: false }),
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
  indexes: [{ fields: ['isActive'] }, { fields: ['displayOrder'] }],
  timestamps: true,
}
