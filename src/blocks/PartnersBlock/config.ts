import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

/**
 * PartnersBlock — Block JSON only, no separate Partners collection.
 *
 * Plan decision (Section 9.4): Partners are static enough to live as inline
 * JSON inside the block. If the partners list grows beyond ~20 items or needs
 * coordinator management, convert to a `partners` collection at that point.
 */
export const PartnersBlock: Block = {
  slug: 'partners',
  interfaceName: 'PartnersBlock',
  labels: {
    singular: 'Partners Block',
    plural: 'Partners Blocks',
  },
  fields: [
    localizedText('title', { label: 'Section Title' }),
    localizedTextarea('description', { label: 'Section Description' }),
    {
      name: 'partners',
      type: 'array',
      label: 'Partners',
      fields: [
        localizedText('name', { required: true, label: 'Partner Name' }),
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          label: 'Logo',
        },
        {
          name: 'website',
          type: 'text',
          label: 'Website URL',
        },
      ],
    },
  ],
}
