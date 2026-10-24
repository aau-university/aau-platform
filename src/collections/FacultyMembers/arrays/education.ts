import type { ArrayField } from 'payload'

import { localizedText } from '../../../fields/localized'

/**
 * FacultyMembers `education` array field.
 *
 * Extracted byte-identical from the inline definition on `FacultyMembers/index.ts`.
 * Represents a faculty member's academic degrees (e.g. "PhD, Computer Science, MIT, 2018").
 */
export const educationArray: ArrayField = {
  name: 'education',
  type: 'array',
  label: 'Education',
  fields: [
    localizedText('degree', { required: true, label: 'Degree' }),
    localizedText('institution', { label: 'Institution' }),
    { name: 'year', type: 'text' },
  ],
}
