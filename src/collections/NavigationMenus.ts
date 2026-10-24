import type { CollectionConfig } from 'payload'

import { publicReadOrAdmin, hideUnlessPermission, isContentManagerOrAbove } from '../access'
import { localizedText, localizedTextarea } from '../fields/localized'
import { revalidatePublicCollection } from '../hooks/revalidatePublicCache'

const navigationRevalidation = revalidatePublicCollection('navigation-menus')

export const NavigationMenus: CollectionConfig = {
  slug: 'navigation-menus',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('navigation.manage'),
    useAsTitle: 'key',
    defaultColumns: ['key', 'isPublished'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: publicReadOrAdmin,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [navigationRevalidation.afterChange],
    afterDelete: [navigationRevalidation.afterDelete],
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique key for this menu (e.g. "main", "footer")',
      },
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'items',
      type: 'array',
      label: 'Menu Items',
      fields: [
        localizedText('label', { required: true, label: 'Label' }),
        {
          name: 'url',
          type: 'text',
          required: true,
          label: 'URL',
          admin: {
            description: 'Internal path (e.g. /colleges) or external URL (https://...)',
          },
        },
        {
          name: 'group',
          type: 'text',
          admin: { description: 'Optional grouping for mega-menus' },
        },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'order',
          type: 'number',
          defaultValue: 0,
          admin: { position: 'sidebar' },
        },
        {
          name: 'showInMore',
          type: 'checkbox',
          defaultValue: false,
          label: 'Move to "More" dropdown',
          admin: {
            position: 'sidebar',
            description:
              'Automatically move this item into the "More" overflow menu. Useful for secondary pages that should not clutter the main bar.',
          },
        },
        {
          name: 'children',
          type: 'array',
          label: 'Dropdown Items',
          labels: { singular: 'Dropdown Item', plural: 'Dropdown Items' },
          admin: {
            description:
              'Add child items to create a dropdown menu on hover (desktop) or expandable accordion (mobile). Leave empty for a simple link.',
            initCollapsed: true,
          },
          fields: [
            localizedText('label', { required: true, label: 'Label' }),
            {
              name: 'url',
              type: 'text',
              required: true,
              label: 'URL',
            },
            localizedTextarea('description', {
              label: 'Short Description',
              admin: { description: 'Optional — shown under the label in the dropdown' },
            }),
            {
              name: 'openInNewTab',
              type: 'checkbox',
              defaultValue: false,
              admin: { position: 'sidebar' },
            },
            {
              name: 'order',
              type: 'number',
              defaultValue: 0,
              admin: { position: 'sidebar' },
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
