import type { Block } from 'payload'

import { localizedText } from '@/fields/localized'

export const StatsBlock: Block = {
  slug: 'stats',
  labels: {
    singular: 'Stats',
    plural: 'Stats Blocks',
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      admin: {
        description: 'Editable statistic cards for the homepage stats section.',
      },
      fields: [
        {
          name: 'key',
          type: 'select',
          required: true,
          options: [
            { label: 'Students', value: 'students' },
            { label: 'Faculty', value: 'faculty' },
            { label: 'Programs', value: 'programs' },
            { label: 'Colleges', value: 'colleges' },
          ],
        },
        {
          name: 'icon',
          type: 'select',
          required: true,
          options: [
            { label: 'Students', value: 'students' },
            { label: 'Faculty', value: 'faculty' },
            { label: 'Programs', value: 'programs' },
            { label: 'Colleges', value: 'colleges' },
          ],
        },
        { name: 'number', type: 'text', required: true },
        localizedText('label', { required: true, label: 'Label' }),
      ],
    },
  ],
}
