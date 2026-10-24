import type { Block } from 'payload'

import { localizedRichText, localizedText } from '@/fields/localized'

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: {
    singular: 'Rich Text',
    plural: 'Rich Text Blocks',
  },
  fields: [
    localizedText('heading', { label: 'Heading' }),
    localizedRichText('content', { label: 'Content' }),
  ],
}
