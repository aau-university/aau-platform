import type { Block } from 'payload'
import { localizedText, localizedTextarea } from '@/fields/localized'

export const FacultyMembersBlock: Block = {
  slug: 'facultyMembers',
  interfaceName: 'FacultyMembersBlock',
  labels: {
    singular: 'Faculty Members Block',
    plural: 'Faculty Members Blocks',
  },
  fields: [
    localizedText('title', { label: 'Section Title' }),
    localizedTextarea('description', { label: 'Section Description' }),
    {
      /**
       * selectedFaculty — the editor can hand-pick specific faculty members
       * to display in this block. When empty, the loader falls back to
       * all active faculty members ordered by fullName.
       */
      name: 'selectedFaculty',
      type: 'relationship',
      relationTo: 'faculty-members',
      hasMany: true,
      label: 'Selected Faculty Members (optional — leave empty to show all active)',
    },
    { name: 'maxItems', type: 'number', min: 1, max: 24, defaultValue: 12 },
    {
      name: 'disableInnerContainer',
      type: 'checkbox',
      label: 'Disable Inner Container',
      defaultValue: false,
    },
  ],
}
