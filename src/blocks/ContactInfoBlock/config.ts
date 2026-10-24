import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const ContactInfoBlock: Block = {
  slug: 'contactInfo',
  labels: {
    singular: 'Contact Info',
    plural: 'Contact Info Blocks',
  },
  fields: [
    localizedText('badge', { label: 'Badge' }),
    localizedText('heading', { label: 'Heading' }),
    localizedTextarea('description', { label: 'Description' }),
  ],
}
