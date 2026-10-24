import type { CollectionConfig } from 'payload'

import { coordinatorEditorialAccess, hideUnlessPermission } from '../../access'
import { localizedText } from '../../fields/localized'
import { enforceCoordinatorScopeHook } from '../../hooks/enforceCoordinatorScope'
import { generateSlugBeforeValidate, validateSlug } from '../../hooks/generateSlug'
import { collectionPreview } from '../../utilities/generatePreviewPath'
import { editorialVersions } from '../../utilities/versions'
import { deriveStudyPlanCollege } from './integrity'
import { revalidateStudyPlan, revalidateDelete } from './hooks/revalidate'

/**
 * StudyPlans — Academic collection (PR-024 / V2-01 §2.2).
 *
 * Coordinator-scoped: a coordinator (level 2) can only create / update study
 * plans for their own college. The `enforceCoordinatorScopeHook` defense-in-
 * depth check is wired with `collegeField: 'college'`. The integrity hook
 * derives that field from `academicProgram` before coordinator scope is
 * enforced, so API callers cannot create a program/college mismatch.
 *
 * Editorial: public read gates on Payload's `_status` via
 * `coordinatorScopedRead`. Study plans previously had no draft workflow and
 * gated on a hand-rolled `isActive` checkbox, so a plan being revised for the
 * next academic year had to be either fully public or fully hidden, with no
 * version history to fall back on.
 */
export const StudyPlans: CollectionConfig = {
  slug: 'study-plans',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('studyPlans.manage'),
    group: 'Academic',
    useAsTitle: 'name',
    defaultColumns: ['name', 'academicProgram', '_status'],
    ...collectionPreview('study-plans'),
  },
  versions: editorialVersions(),
  access: coordinatorEditorialAccess({
    permission: 'studyPlans.manage',
    publishedRelations: ['academicProgram', 'academicProgram.college'],
  }),
  hooks: {
    beforeValidate: [generateSlugBeforeValidate('name')],
    beforeChange: [
      deriveStudyPlanCollege,
      enforceCoordinatorScopeHook({ collegeField: 'college' }),
    ],
    afterChange: [revalidateStudyPlan],
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
    // Coordinator editing a study plan should only see academic programs
    // belonging to the same college. Without `filterOptions` the admin picker
    // loads every program across all colleges (data leak via admin UI).
    // When `college` is not yet selected we return `true`.
    // (Issue #38 — admin picker query explosions)
    {
      name: 'academicProgram',
      type: 'relationship',
      relationTo: 'academic-programs',
      required: true,
      // The public route is singular (`.../study-plan`), so the relationship
      // itself is the one-plan-per-program contract. Payload maps `unique` to
      // a PostgreSQL unique index and reports conflicts on this field in the
      // Admin/API; the database remains authoritative under concurrent writes.
      unique: true,
      admin: {
        description: 'Each academic program can have exactly one study plan.',
      },
      filterOptions: ({ data }) => {
        if (!data?.college) return true
        return { college: { equals: data.college } }
      },
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'College this study plan belongs to. Derived from the academic program.',
        readOnly: true,
      },
    },
    {
      name: 'courses',
      type: 'array',
      fields: [
        { name: 'code', type: 'text', label: 'Course Code' },
        localizedText('name', { required: true, label: 'Course Name' }),
        {
          name: 'credits',
          type: 'number',
          label: 'Credit Hours',
          min: 0,
          max: 6,
        },
        {
          name: 'year',
          type: 'number',
          label: 'Year',
          min: 1,
          max: 6,
        },
        {
          name: 'semester',
          type: 'select',
          label: 'Semester',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7', value: '7' },
            { label: '8', value: '8' },
          ],
        },
      ],
      admin: {
        initCollapsed: true,
      },
    },
  ],
  indexes: [{ fields: ['college'] }],
  timestamps: true,
}
