import type { CollectionConfig } from 'payload'

import {
  anyone,
  isContentManagerOrAbove,
  hideBelowLevel,
} from '../../access'
import { localizedText, localizedTextarea } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { revalidateCategories, revalidateDelete } from './hooks/revalidate'

/**
 * Categories — Taxonomy collection (PR-022 / V2-01 §2.1).
 *
 * Polymorphic category taxonomy discriminated by `kind`. Used by News
 * (`kind:'news'`), BlogPosts (`kind:'blog'`), FAQs (`kind:'faq'`), Events
 * (`kind:'event'`), Offers (`kind:'offer'`), and Projects/ResearchPublications
 * (`kind:'project'`).
 *
 * Self-referential `parent` relationship supports a single-root hierarchy
 * (cycles prevented by the consumer-side `preventCategoryCycle` hook —
 * deferred to a later V2-01 PR per PLAN_INDEX_SCHEMA §17).
 *
 * Not editorial — no versions/drafts. Access mirrors the official Payload
 * template's Categories collection. Public read (taxonomy is shared lookup
 * data, not editorial content) — `anyone` (== `() => true`) so anonymous
 * users receive all categories without a `_status` filter that would
 * silently return zero results (no drafts enabled on this collection).
 * Per W3-2 NIT-9 + plan §7.30 (publicly readable taxonomy).
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    group: 'Taxonomy',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'kind'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: anyone,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('name')],
    afterChange: [revalidateCategories],
    afterDelete: [revalidateDelete],
  },
  fields: [
    localizedText('name', { required: true, label: 'Name' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Blog', value: 'blog' },
        { label: 'FAQ', value: 'faq' },
        { label: 'Offer', value: 'offer' },
        { label: 'News', value: 'news' },
        { label: 'Event', value: 'event' },
        { label: 'Project', value: 'project' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      admin: {
        position: 'sidebar',
      },
      // Restrict the parent picker to same-kind categories (a blog category
      // cannot have a news category as its parent) and exclude the current
      // doc to prevent a self-reference.
      filterOptions: ({ data }) => {
        if (!data?.kind) return {}
        const id = data?.id
        return {
          kind: { equals: data.kind },
          ...(id ? { id: { not_in: [id] } } : {}),
        }
      },
    },
    localizedTextarea('description', { label: 'Description' }),
  ],
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['kind'] },
    { fields: ['parent'] },
  ],
  timestamps: true,
}
