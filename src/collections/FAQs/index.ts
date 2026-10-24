import type { CollectionConfig } from 'payload'

import { contentManagerEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidateFAQ } from './hooks/revalidate'

export const FAQs: CollectionConfig = {
  slug: 'faqs',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('faqs.manage'),
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', '_status', 'displayOrder'],
  },
  versions: editorialVersions(),
  access: contentManagerEditorialAccess(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('question')],
    afterChange: [revalidateFAQ],
    afterDelete: [revalidateDelete],
  },
  fields: [
    localizedText('question', { required: true, label: 'Question' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    localizedRichText('answer', { required: true, label: 'Answer' }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      filterOptions: () => ({ kind: { equals: 'faq' } }),
    },
    {
      name: 'displayOrder',
      type: 'number',
    },
  ],
  timestamps: true,
}
