import type { ArrayField } from 'payload'

import { localizedText } from '../../../fields/localized'

/**
 * FacultyMembers `experience` array field.
 *
 * Extracted byte-identical from the inline definition on `FacultyMembers/index.ts`.
 * Represents a faculty member's prior professional experience.
 */
export const experienceArray: ArrayField = {
  name: 'experience',
  type: 'array',
  label: 'Experience',
  fields: [
    localizedText('position', { required: true, label: 'Position' }),
    localizedText('organization', { label: 'Organization' }),
    localizedText('period', { label: 'Period' }),
  ],
}
