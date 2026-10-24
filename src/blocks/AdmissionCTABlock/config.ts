import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const AdmissionCTABlock: Block = {
  slug: 'admissionCTA',
  labels: {
    singular: 'Admission CTA',
    plural: 'Admission CTA Blocks',
  },
  fields: [
    localizedText('badge', { label: 'Badge' }),
    localizedText('heading', { label: 'Heading' }),
    localizedTextarea('description', { label: 'Description' }),
    localizedText('buttonLabel', { label: 'Button Label' }),
    { name: 'buttonHref', type: 'text', label: 'Button URL', defaultValue: '/admission' },
  ],
}
