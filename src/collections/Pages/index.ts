import type { CollectionConfig } from 'payload'

import { homepageBlocks } from '../../blocks'
import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { deepMerge } from '../../fields/deepMerge'
import { localizedRichText, localizedText } from '../../fields/localized'
import { heroField } from '../../heros/config'
import { validatePageSlug } from '../../hooks/generateSlug'
import { populateAuthors } from '../../hooks/populateAuthors'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidatePage } from './hooks/revalidate'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('pages.manage'),
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    ...collectionPreview('pages'),
  },
  versions: editorialVersions(),
  access: contentManagerEditorialAccess(),
  hooks: {
    beforeChange: [populatePublishedAt, populateAuthors],
    afterChange: [revalidatePage],
    afterDelete: [revalidateDelete],
  },
  fields: [
    localizedText('title', { required: true }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validatePageSlug,
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
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { displayFormat: 'yyyy-MM-dd HH:mm' },
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: { position: 'sidebar' },
      access: {
        update: contentManagerFieldAccess,
      },
    },
    // PR-009: hero field group. The homepage (`slug === 'home'`) uses a
    // HeroBlock in its `layout` instead, so the hero group is hidden on the
    // homepage via `admin.condition`. Existing pages without a hero value
    // continue to render normally — the field is optional, and the
    // `RenderHero` dispatcher renders nothing for nullish hero data.
    //
    // `deepMerge` (vs an inline `{ ...heroField, admin: { ... } }` spread)
    // preserves the `GroupField` admin typing — a raw spread widens back to
    // the `Field` union and the admin subshape fails to narrow.
    deepMerge(heroField, {
      admin: {
        condition: (data: { slug?: string | null }) => data?.slug !== 'home',
      },
    }),
    localizedRichText('content', {
      admin: {
        description:
          'Legacy field. Homepage layout and editable sections now live in Layout Blocks.',
      },
    }),
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Legacy field. Prefer section-specific fields in Layout Blocks for new pages.',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      blocks: homepageBlocks,
      admin: {
        description:
          'Payload-native page builder. For the homepage, use Hero, Stats, Colleges Grid, News Grid, Admission CTA, and Contact Info blocks.',
        initCollapsed: true,
      },
    },
  ],
  timestamps: true,
}
