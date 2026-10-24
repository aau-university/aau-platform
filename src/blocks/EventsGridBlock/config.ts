import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const EventsGridBlock: Block = {
  slug: 'eventsGrid',
  labels: {
    singular: 'Events Grid',
    plural: 'Events Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 8, defaultValue: 4 },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'upcoming',
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Featured', value: 'featured' },
      ],
    },
  ],
}
