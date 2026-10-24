import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const CTABlock: Block = {
  slug: 'cta',
  labels: {
    singular: 'CTA',
    plural: 'CTA Blocks',
  },
  fields: [
    localizedText('heading', { label: 'Heading' }),
    localizedTextarea('description', { label: 'Description' }),
    localizedText('buttonLabel', { label: 'Button Label' }),
    { name: 'buttonHref', type: 'text', label: 'Button URL', defaultValue: '/' },
  ],
}
