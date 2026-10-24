import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const CollegesGridBlock: Block = {
  slug: 'collegesGrid',
  labels: {
    singular: 'Colleges Grid',
    plural: 'Colleges Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 8, defaultValue: 4 },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'featured',
      options: [
        { label: 'Featured', value: 'featured' },
        { label: 'Compact', value: 'compact' },
      ],
    },
    {
      name: 'selectedColleges',
      type: 'relationship',
      relationTo: 'colleges',
      hasMany: true,
      admin: {
        description: 'Optional. Leave empty to show the latest active colleges.',
      },
    },
  ],
}
