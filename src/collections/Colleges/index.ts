import type { CollectionConfig } from 'payload'

import {
  contentManagerFieldAccess,
  coordinatorOwnCollegeRead,
  coordinatorOwnCollegeUpdate,
  coordinatorScopedReadVersions,
  hideUnlessPermission,
  isContentManagerOrAbove,
} from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { restrictPublishToLevel } from '../../hooks/restrictPublishToLevel'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateCollege, revalidateDelete } from './hooks/revalidate'

export const Colleges: CollectionConfig = {
  slug: 'colleges',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('colleges.manage'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', '_status'],
    ...collectionPreview('colleges'),
  },
  versions: editorialVersions(),
  access: {
    create: isContentManagerOrAbove,
    // Public sees published colleges; a coordinator sees only their own.
    read: coordinatorOwnCollegeRead,
    readVersions: coordinatorScopedReadVersions({
      permission: 'colleges.manage',
      collegePath: 'parent',
    }),
    // Coordinators may edit and publish exactly their own scoped college.
    // Route identity and deletion remain Content Manager+ operations.
    update: coordinatorOwnCollegeUpdate,
    delete: isContentManagerOrAbove,
  },
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('name')],
    // Update access already pins coordinators to their own college and checks
    // `colleges.manage`; this hook adds defense in depth against lower roles.
    beforeChange: [restrictPublishToLevel(2)],
    afterChange: [revalidateCollege],
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
      // Route identity — coordinators edit content, Content Managers own URLs.
      access: { update: contentManagerFieldAccess },
    },
    localizedRichText('description', { label: 'Description' }),
    localizedRichText('admissionRequirements', { label: 'Admission Requirements' }),
    localizedRichText('vision', { label: 'Vision' }),
    localizedRichText('mission', { label: 'Mission' }),
    localizedRichText('goals', { label: 'Goals' }),
    localizedRichText('values', { label: 'Values' }),
    localizedRichText('strategy', { label: 'Strategy' }),
    localizedRichText('quality', { label: 'Quality' }),
    {
      name: 'icon',
      type: 'text',
    },
    localizedText('deanName', { label: 'Dean Name' }),
    {
      name: 'deanImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}
