import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const CampusLifeGridBlock: Block = {
  slug: 'campusLifeGrid',
  labels: {
    singular: 'Campus Life Grid',
    plural: 'Campus Life Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 6 },
    {
      name: 'kindFilter',
      type: 'select',
      options: [
        { label: 'Campus Life', value: 'life' },
        { label: 'Student Activity', value: 'activity' },
      ],
      admin: {
        description: 'Optional. Filter items by kind.',
      },
    },
  ],
}
