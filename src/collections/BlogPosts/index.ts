import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { populateAuthors } from '../../hooks/populateAuthors'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateBlogPost, revalidateDelete } from './hooks/revalidate'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('blog.manage'),
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'category', '_status', 'publishedAt'],
    ...collectionPreview('blog-posts'),
  },
  versions: editorialVersions(),
  access: contentManagerEditorialAccess(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [populatePublishedAt, populateAuthors],
    afterChange: [revalidateBlogPost],
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
    localizedTextarea('excerpt', { label: 'Excerpt' }),
    localizedRichText('content', { label: 'Content' }),
    // Optional editorial relationship replacing the legacy `authorName` /
    // `authorRole` text fields. The hidden `populatedAuthors` snapshot is
    // managed separately by the hook from `req.user` and is what public
    // readers see.
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
    {
      name: 'authorAvatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      filterOptions: () => ({ kind: { equals: 'blog' } }),
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Featured Image',
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Published At',
      admin: { position: 'sidebar' },
    },
    {
      name: 'readTime',
      type: 'number',
      label: 'Read Time (minutes)',
    },
    {
      name: 'views',
      type: 'number',
      label: 'Views',
      defaultValue: 0,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text', localized: true }],
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: { position: 'sidebar' },
      access: {
        update: contentManagerFieldAccess,
      },
    },
  ],
  timestamps: true,
}
