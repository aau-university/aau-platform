import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const LinksBlock: Block = {
  slug: 'links',
  labels: {
    singular: 'Quick Links',
    plural: 'Quick Links Blocks',
  },
  fields: [
    localizedText('title', { label: 'Title' }),
    localizedTextarea('description', { label: 'Description' }),
    {
      name: 'links',
      type: 'array',
      label: 'Quick Links',
      minRows: 1,
      maxRows: 12,
      fields: [
        localizedText('title', { required: true, label: 'Link Title' }),
        localizedTextarea('description', { label: 'Link Description' }),
        {
          name: 'icon',
          type: 'select',
          label: 'Icon',
          defaultValue: 'GraduationCap',
          options: [
            { label: 'Link', value: 'Link2' },
            { label: 'Graduation Cap', value: 'GraduationCap' },
            { label: 'Mail', value: 'Mail' },
            { label: 'Calendar', value: 'Calendar' },
            { label: 'File Text', value: 'FileText' },
            { label: 'Book Open', value: 'BookOpen' },
            { label: 'Clipboard List', value: 'ClipboardList' },
            { label: 'User', value: 'User' },
            { label: 'Globe', value: 'Globe' },
          ],
        },
        {
          name: 'href',
          type: 'text',
          label: 'URL',
          admin: {
            description:
              'Internal path (e.g. /admission) or external URL (https://...). Leave empty if "Coming Soon".',
          },
        },
        {
          name: 'comingSoon',
          type: 'checkbox',
          defaultValue: false,
          label: 'Coming Soon (disables the link)',
          admin: { position: 'sidebar' },
        },
      ],
    },
  ],
}
