import type { CollectionConfig } from 'payload'

import { coordinatorEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import {
  enforceCoordinatorScopeBeforeValidate,
  enforceCoordinatorScopeHook,
} from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidateDepartment } from './hooks/revalidate'

export const AcademicDepartments: CollectionConfig = {
  slug: 'academic-departments',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('departments.manage'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'college', '_status'],
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({
    permission: 'departments.manage',
    publishedRelations: ['college'],
  }),
  hooks: {
    beforeValidate: [
      generateSlugBeforeValidate('name'),
      // Injects the coordinator's collegeScope BEFORE required-field
      // validation — `college` is `required: true` here, so the
      // beforeChange injection alone would arrive too late.
      enforceCoordinatorScopeBeforeValidate({ collegeField: 'college' }),
    ],
    beforeChange: [enforceCoordinatorScopeHook({ collegeField: 'college' })],
    afterChange: [revalidateDepartment],
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
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      required: true,
    },
    localizedRichText('description', { label: 'Description' }),
    // A coordinator editing their department's "Head of Department" should only
    // pick from faculty members in the SAME college. Without `filterOptions`
    // the admin picker shows every faculty member across all colleges (data
    // leak via admin UI even though access control blocks cross-college
    // writes). When `college` is not yet selected we return `true`.
    // (Issue #38 — admin picker query explosions)
    {
      name: 'headOfDepartment',
      type: 'relationship',
      relationTo: 'faculty-members',
      label: 'Head of Department',
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
  ],
  timestamps: true,
}
