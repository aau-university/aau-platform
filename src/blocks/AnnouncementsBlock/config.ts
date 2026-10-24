import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const AnnouncementsBlock: Block = {
  slug: 'announcements',
  interfaceName: 'AnnouncementsBlock',
  labels: {
    singular: 'Announcements',
    plural: 'Announcements Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    { name: 'maxItems', type: 'number', min: 1, max: 10, defaultValue: 3 },
  ],
}
