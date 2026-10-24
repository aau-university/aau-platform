import type { ArrayField } from 'payload'

import { localizedText } from '../../../fields/localized'

/**
 * FacultyMembers `courses` array field.
 *
 * Extracted byte-identical from the inline definition on `FacultyMembers/index.ts`.
 * Represents the courses a faculty member currently teaches.
 */
export const coursesArray: ArrayField = {
  name: 'courses',
  type: 'array',
  label: 'Courses',
  fields: [
    { name: 'code', type: 'text' },
    localizedText('name', { required: true, label: 'Course Name' }),
    { name: 'semester', type: 'text' },
  ],
}
