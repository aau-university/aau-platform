import type { ArrayField } from 'payload'

import { localizedText } from '../../../fields/localized'

/**
 * FacultyMembers `skills` array field.
 * Represents a list of specialized skills/qualifications the faculty member has.
 */
export const skillsArray: ArrayField = {
  name: 'skills',
  type: 'array',
  label: 'Skills',
  fields: [
    localizedText('name', { required: true, label: 'Skill Name' }),
  ],
}
