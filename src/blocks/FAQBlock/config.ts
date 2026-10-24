import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const FAQBlock: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
  labels: {
    singular: 'FAQ Block',
    plural: 'FAQ Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 12, defaultValue: 6 },
    {
      name: 'showCategories',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
