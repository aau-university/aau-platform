import type { CollectionConfig } from 'payload'

import { coordinatorEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { enforceCoordinatorScopeHook } from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidateEvent } from './hooks/revalidate'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('events.manage'),
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'eventDate'],
    ...collectionPreview('events'),
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({ permission: 'events.manage' }),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('title')],
    beforeChange: [enforceCoordinatorScopeHook({ collegeField: 'college' })],
    afterChange: [revalidateEvent],
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
    localizedRichText('description', { label: 'Description' }),
    {
      name: 'eventDate',
      type: 'date',
      label: 'Event Date',
    },
    localizedText('location', { label: 'Location' }),
    localizedText('organizer', { label: 'Organizer' }),
    {
      name: 'endDate',
      type: 'date',
      label: 'End Date',
    },
    {
      name: 'registrationUrl',
      type: 'text',
      label: 'Registration URL',
      admin: { description: 'External URL for event registration (optional)' },
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      filterOptions: () => ({ kind: { equals: 'event' } }),
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'displayOrder',
      type: 'number',
    },
  ],
  timestamps: true,
}
