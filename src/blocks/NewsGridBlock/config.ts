import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const NewsGridBlock: Block = {
  slug: 'newsGrid',
  labels: {
    singular: 'News Grid',
    plural: 'News Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 8, defaultValue: 4 },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'latest',
      options: [
        { label: 'Latest', value: 'latest' },
        { label: 'Featured', value: 'featured' },
      ],
    },
  ],
}
