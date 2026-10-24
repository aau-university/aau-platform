import type { CollectionConfig } from 'payload'

import {
  contentManagerEditorialAccess,
  contentManagerFieldAccess,
  hideUnlessPermission,
} from '../../access'
import { localizedRichText, localizedTextarea, localizedText } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateProjects, revalidateDelete } from './hooks/revalidate'

/**
 * Projects — Services collection (PR-030 / V2-01 §2.5 / plan §7.20).
 *
 * Editorial content collection with versions and drafts.
 * Replaces the uniform clone with the plan-specific field set:
 * `description`/`details` rich body, `images` gallery array,
 * `startDate`/`endDate`/`year`/`progress`/`status` project metadata.
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Project', plural: 'Projects' },
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('projects.manage'),
    group: 'Services',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'projectStatus', '_status'],
    ...collectionPreview('projects'),
  },
  access: contentManagerEditorialAccess(),
  versions: editorialVersions(),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateProjects],
    afterDelete: [revalidateDelete],
  },
  defaultPopulate: { title: true, slug: true, projectStatus: true },
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
    localizedTextarea('description', { label: 'Description' }),
    localizedRichText('details', { label: 'Details' }),
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'images',
      type: 'array',
      label: 'Image Gallery',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
      label: 'Start Date',
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'End Date',
    },
    {
      name: 'year',
      type: 'number',
      label: 'Year',
    },
    {
      name: 'progress',
      type: 'number',
      label: 'Progress',
      min: 0,
      max: 100,
    },
    {
      name: 'projectStatus',
      type: 'select',
      label: 'Project Status',
      options: ['current', 'completed', 'planned'],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
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
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['projectStatus'] },
    { fields: ['_status'] },
  ],
  timestamps: true,
}
