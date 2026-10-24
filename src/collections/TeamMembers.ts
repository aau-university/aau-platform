import type { CollectionConfig } from 'payload'

import { publicReadActiveOrAdmin, hideBelowLevel, isContentManagerOrAbove } from '../access'
import { localizedRichText, localizedText } from '../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../hooks/generateSlug'
import { revalidatePublicCollection } from '../hooks/revalidatePublicCache'

const teamMembersRevalidation = revalidatePublicCollection('team-members')

/**
 * TeamMembers — university team/staff members shown on the about page.
 *
 * Access (approved plan):
 * - Public can read active members (publicReadActiveOrAdmin via isActive field)
 * - Content Manager+ can create, update, and delete
 *
 * Field model (approved plan):
 *   name, jobTitle, group, bio, image, email, phone, displayOrder, isActive
 *
 * The legacy inline `teamMembers` array on AboutPage remains as fallback.
 * The `teamMembersRelationship` field on AboutPage references this collection.
 */
export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    useAsTitle: 'name',
    defaultColumns: ['name', 'jobTitle', 'group', 'isActive', 'displayOrder'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: publicReadActiveOrAdmin,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('name')],
    afterChange: [teamMembersRevalidation.afterChange],
    afterDelete: [teamMembersRevalidation.afterDelete],
  },
  fields: [
    localizedText('name', { required: true, label: 'Full Name' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    localizedText('jobTitle', { label: 'Job Title' }),
    localizedText('group', { label: 'Group / Department' }),
    localizedRichText('bio', { label: 'Biography' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
  timestamps: true,
}
