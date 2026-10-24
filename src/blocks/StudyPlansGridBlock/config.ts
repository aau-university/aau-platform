import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const StudyPlansGridBlock: Block = {
  slug: 'studyPlansGrid',
  labels: {
    singular: 'Study Plans Grid',
    plural: 'Study Plans Grid Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 4 },
  ],
}
