import type { CollectionConfig } from 'payload'

import {
  contentManagerFieldAccess,
  coordinatorEditorialAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import { enforceCoordinatorScopeHook } from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { populateAuthors } from '../../hooks/populateAuthors'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidateNews } from './hooks/revalidate'

export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('news.manage'),
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'publishedAt'],
    ...collectionPreview('news'),
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({ permission: 'news.manage' }),
  hooks: {
    // Defense in depth — enforce coordinator's collegeScope on write payload.
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [
      enforceCoordinatorScopeHook({ collegeField: 'college' }),
      populatePublishedAt,
      populateAuthors,
    ],
    afterChange: [revalidateNews],
    afterDelete: [revalidateDelete],
  },
  fields: [
    localizedText('title', { required: true, label: 'Title' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
    },
    // Optional editorial relationship. The hidden `populatedAuthors` array
    // below is managed separately by the hook from `req.user` and is the
    // privacy-safe snapshot readers actually see.
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    {
      name: 'populatedAuthors',
      type: 'array',
      admin: { hidden: true },
      fields: [
        { name: 'userId', type: 'text' },
        { name: 'name', type: 'text' },
      ],
      access: {
        create: () => false,
        update: () => false,
      },
    },
    localizedTextarea('summary', { label: 'Summary' }),
    localizedRichText('content', { label: 'Content' }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      filterOptions: () => ({ kind: { equals: 'news' } }),
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text', localized: true }],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: { position: 'sidebar' },
      access: {
        update: contentManagerFieldAccess,
      },
    },
    {
      name: 'views',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
