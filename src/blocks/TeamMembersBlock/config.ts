import type { Block } from 'payload'

import { localizedText, localizedTextarea } from '@/fields/localized'

export const TeamMembersBlock: Block = {
  slug: 'teamMembers',
  interfaceName: 'TeamMembersBlock',
  labels: {
    singular: 'Team Members Block',
    plural: 'Team Members Blocks',
  },
  fields: [
    localizedText('title', { label: 'Section Title' }),
    localizedTextarea('description', { label: 'Section Description' }),
    {
      /**
       * selectedMembers — the editor can hand-pick specific team members
       * to display in this block. When empty, the loader falls back to
       * the top N active members ordered by displayOrder.
       */
      name: 'selectedMembers',
      type: 'relationship',
      relationTo: 'team-members',
      hasMany: true,
      label: 'Selected Members (optional — leave empty to show all active)',
    },
    { name: 'maxItems', type: 'number', min: 1, max: 24, defaultValue: 12 },
    {
      name: 'groupFilter',
      type: 'text',
      label: 'Group Filter (optional — filter by group name)',
    },
  ],
}
