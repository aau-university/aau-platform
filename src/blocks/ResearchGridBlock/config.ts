import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const ResearchGridBlock: Block = {
  slug: 'researchGrid',
  labels: {
    singular: 'Research Grid',
    plural: 'Research Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 4 },
    {
      name: 'categoryFilter',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      filterOptions: () => ({ kind: { equals: 'project' } }),
      admin: {
        description: 'Optional. Filter research by category.',
      },
    },
  ],
}
