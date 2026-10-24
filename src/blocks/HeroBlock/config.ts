import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const HeroBlock: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Hero Blocks',
  },
  fields: [
    localizedText('badge', { label: 'Badge' }),
    localizedText('titlePrimary', { label: 'Title Primary' }),
    localizedText('titleSecondary', { label: 'Title Secondary' }),
    localizedText('tagline', { label: 'Tagline (e.g. "لأجيال واعدة")' }),
    localizedTextarea('description', { label: 'Description' }),
    localizedText('primaryCtaLabel', { label: 'Primary CTA Label' }),
    { name: 'primaryCtaHref', type: 'text', label: 'Primary CTA URL', defaultValue: '/admission' },
    localizedText('secondaryCtaLabel', { label: 'Secondary CTA Label' }),
    { name: 'secondaryCtaHref', type: 'text', label: 'Secondary CTA URL', defaultValue: '/colleges' },
  ],
}
