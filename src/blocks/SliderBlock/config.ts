import type { Block } from 'payload'
import { localizedText } from '@/fields/localized'

export const SliderBlock: Block = {
  slug: 'slider',
  interfaceName: 'SliderBlock',
  labels: {
    singular: 'Slider',
    plural: 'Sliders',
  },
  fields: [
    localizedText('title', {
      label: 'Slider Title (for accessibility)',
      admin: {
        description:
          'Internal label for screen readers. Visible slides come from the Sliders collection (active items only).',
      },
    }),
    { name: 'maxItems', type: 'number', min: 1, max: 10, defaultValue: 5 },
    {
      name: 'autoplay',
      type: 'checkbox',
      defaultValue: true,
      label: 'Autoplay',
    },
    {
      name: 'interval',
      type: 'number',
      min: 2000,
      max: 15000,
      defaultValue: 5000,
      label: 'Autoplay interval (ms)',
    },
  ],
}
