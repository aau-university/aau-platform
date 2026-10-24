import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const ProgramsGridBlock: Block = {
  slug: 'programsGrid',
  labels: {
    singular: 'Programs Grid',
    plural: 'Programs Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 6 },
    {
      name: 'collegeFilter',
      type: 'relationship',
      relationTo: 'colleges',
      label: 'Filter by College (optional — leave empty for all colleges)',
    },
    {
      name: 'degreeFilter',
      type: 'select',
      label: 'Filter by Degree Type (optional)',
      options: [
        { label: 'Diploma', value: 'diploma' },
        { label: 'Bachelor', value: 'bachelor' },
        { label: 'Master', value: 'master' },
        { label: 'PhD', value: 'phd' },
      ],
    },
  ],
}
