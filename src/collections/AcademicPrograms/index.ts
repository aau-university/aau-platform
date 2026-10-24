import type { CollectionConfig } from 'payload'

import { coordinatorEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedRichText, localizedText } from '../../fields/localized'
import {
  enforceCoordinatorScopeBeforeValidate,
  enforceCoordinatorScopeHook,
} from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { revalidateDelete, revalidateProgram } from './hooks/revalidate'

export const AcademicPrograms: CollectionConfig = {
  slug: 'academic-programs',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('programs.manage'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'college', 'degreeType', '_status'],
    ...collectionPreview('academic-programs'),
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({
    permission: 'programs.manage',
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
    afterChange: [revalidateProgram],
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
    {
      name: 'department',
      type: 'relationship',
      relationTo: 'academic-departments',
      index: true,
      // Guard the unset case: without it, an unset `college` yields
      // `{ college: { equals: undefined } }`, which matches nothing (empty
      // picker) and can fail server-side relationship validation. Returning
      // `true` shows all options until a college is chosen — matching the
      // guarded siblings (FacultyMembers, AcademicDepartments, StudyPlans).
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
    {
      name: 'degreeType',
      type: 'select',
      options: [
        { label: 'Diploma', value: 'diploma' },
        { label: 'Bachelor', value: 'bachelor' },
        { label: 'Master', value: 'master' },
        { label: 'PhD', value: 'phd' },
      ],
    },
    localizedRichText('description', { label: 'Description' }),
    localizedRichText('objectives', { label: 'Objectives' }),
    localizedRichText('careerProspects', { label: 'Career Prospects' }),
    localizedRichText('applicationSteps', { label: 'Application Steps' }),
    localizedRichText('whyProgram', { label: 'Why This Program' }),
    localizedText('highSchoolType', { label: 'High School Type' }),
    localizedText('duration', { label: 'Duration' }),
    {
      name: 'studyYears',
      type: 'text',
    },
    {
      name: 'admissionRate',
      type: 'number',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}
