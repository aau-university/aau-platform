import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const OffersGridBlock: Block = {
  slug: 'offersGrid',
  labels: {
    singular: 'Offers Grid',
    plural: 'Offers Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 6 },
    {
      name: 'categoryFilter',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      filterOptions: () => ({ kind: { equals: 'offer' } }),
      admin: {
        description: 'Optional. Filter offers by category.',
      },
    },
  ],
}
