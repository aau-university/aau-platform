import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const ProjectsGridBlock: Block = {
  slug: 'projectsGrid',
  labels: {
    singular: 'Projects Grid',
    plural: 'Projects Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 3 },
    {
      name: 'statusFilter',
      type: 'select',
      options: [
        { label: 'Current', value: 'current' },
        { label: 'Completed', value: 'completed' },
        { label: 'Planned', value: 'planned' },
      ],
      admin: {
        description: 'Optional. Filter projects by status.',
      },
    },
  ],
}
