import type { CollectionConfig } from 'payload'

import { coordinatorEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import {
  enforceCoordinatorScopeBeforeValidate,
  enforceCoordinatorScopeHook,
} from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { coursesArray } from './arrays/courses'
import { educationArray } from './arrays/education'
import { experienceArray } from './arrays/experience'
import { publicationsArray } from './arrays/publications'
import { skillsArray } from './arrays/skills'
import { revalidateDelete, revalidateFacultyMember } from './hooks/revalidate'

export const FacultyMembers: CollectionConfig = {
  slug: 'faculty-members',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('faculty.manage'),
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'college', '_status'],
    ...collectionPreview('faculty-members'),
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({
    permission: 'faculty.manage',
    publishedRelations: ['college'],
  }),
  hooks: {
    beforeValidate: [
      generateSlugBeforeValidate('fullName'),
      // Injects the coordinator's collegeScope BEFORE required-field
      // validation — `college` is `required: true` here, so the
      // beforeChange injection alone would arrive too late.
      enforceCoordinatorScopeBeforeValidate({ collegeField: 'college' }),
    ],
    beforeChange: [enforceCoordinatorScopeHook({ collegeField: 'college' })],
    afterChange: [revalidateFacultyMember],
    afterDelete: [revalidateDelete],
  },
  fields: [
    localizedText('fullName', { required: true, label: 'Full Name' }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    localizedText('academicTitle', { label: 'Academic Title' }),
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      // Payload validation requires a college on validated writes. The database
      // remains nullable so draft and autosave writes can skip validation.
      required: true,
    },
    // Coordinator editing a faculty member should only see programs / departments
    // belonging to the same college. Without `filterOptions` the admin picker
    // loads every record (data leak across colleges even though access control
    // blocks the actual write). When `college` is not yet selected we return
    // `true` so the picker shows all options until the editor picks a college.
    // (Issue #38 — admin picker query explosions)
    {
      name: 'program',
      type: 'relationship',
      relationTo: 'academic-programs',
      hasMany: true,
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
    {
      name: 'department',
      type: 'relationship',
      relationTo: 'academic-departments',
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
    localizedRichText('biography', { label: 'Biography' }),
    {
      name: 'email',
      type: 'email',
    },
    {
      name: 'phone',
      type: 'text',
    },
    localizedText('officeHours', { label: 'Office Hours' }),
    localizedTextarea('researchInterests', { label: 'Research Interests' }),
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    // ── Child table equivalents as array fields ──────────────
    educationArray,
    experienceArray,
    publicationsArray,
    coursesArray,
    skillsArray,
  ],
  timestamps: true,
}
