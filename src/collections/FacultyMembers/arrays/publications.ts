import type { ArrayField } from 'payload'

import { localizedText } from '../../../fields/localized'

/**
 * FacultyMembers `publications` array field.
 *
 * Extracted byte-identical from the inline definition on `FacultyMembers/index.ts`.
 * Represents a faculty member's published academic papers.
 */
export const publicationsArray: ArrayField = {
  name: 'publications',
  type: 'array',
  label: 'Publications',
  fields: [
    localizedText('title', { required: true, label: 'Title' }),
    { name: 'journal', type: 'text' },
    { name: 'year', type: 'text' },
    { name: 'link', type: 'text' },
  ],
}
