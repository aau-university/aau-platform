import { revalidateAboutPage } from "./hooks/revalidate"
import type { GlobalConfig } from 'payload'

import { isContentManagerOrAbove, hideBelowLevel } from '../../access'
import { localizedRichText, localizedText, localizedTextarea } from '../../fields/localized'
import { auditVersions } from '../../utilities/versions'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  versions: auditVersions(),
  label: 'About Page',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
  },
  access: {
    read: () => true,
    readVersions: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
  },
  hooks: {
    afterChange: [revalidateAboutPage],
  },
  fields: [
    // ── Page Header ─────────────────────────────
    {
      name: 'header',
      type: 'group',
      label: 'Page Header',
      fields: [
        localizedText('badge', { label: 'Badge' }),
        localizedText('title', { label: 'Title' }),
        localizedTextarea('description', { label: 'Description' }),
      ],
    },
    // ── Intro ───────────────────────────────────
    {
      name: 'intro',
      type: 'group',
      label: 'Introduction',
      fields: [
        localizedRichText('body', { label: 'Body' }),
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    // ── Vision, Mission, Goals, Values ──────────
    {
      name: 'vision',
      type: 'group',
      fields: [
        localizedText('title'),
        localizedRichText('description'),
      ],
    },
    {
      name: 'mission',
      type: 'group',
      fields: [
        localizedText('title'),
        localizedRichText('description'),
      ],
    },
    {
      name: 'goals',
      type: 'group',
      fields: [
        localizedText('title'),
        localizedRichText('description'),
      ],
    },
    {
      name: 'values',
      type: 'group',
      fields: [
        localizedText('title'),
        localizedRichText('description'),
      ],
    },
    // ── President's Message ─────────────────────
    {
      name: 'president',
      type: 'group',
      label: "President's Message",
      fields: [
        localizedText('sectionTitle', { label: 'Section Title' }),
        localizedRichText('messageIntro', { label: 'Intro' }),
        localizedRichText('messageBody', { label: 'Body' }),
        localizedRichText('messageClosing', { label: 'Closing' }),
        localizedText('name', { label: 'Name' }),
        localizedText('role', { label: 'Role' }),
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    // ── Team Members ────────────────────────────
    {
      name: 'teamSection',
      type: 'group',
      label: 'Team Section',
      fields: [
        localizedText('sectionTitle', { label: 'Section Title' }),
        localizedTextarea('sectionDescription', { label: 'Description' }),
      ],
    },
    // ── Team Members (relationship — Sprint 2) ───────────────
    // Optional relationship to the `team-members` collection.
    // Takes precedence over the legacy inline `teamMembers` array below.
    // Migrate the inline array gradually; keep it as fallback until all data
    // is moved into the collection.
    {
      name: 'teamMembersRelationship',
      type: 'relationship',
      relationTo: 'team-members',
      hasMany: true,
      label: 'Team Members (Collection)',
      admin: {
        description:
          'Link team members from the Team Members collection. When set, this takes precedence over the inline team array below.',
      },
    },
    // ── Team Members (legacy inline array — kept for backward compat) ───
    {
      name: 'teamMembers',
      type: 'array',
      label: 'Team Members (Legacy Inline)',
      admin: {
        description:
          'Legacy inline team members. Prefer adding to the Team Members collection above.',
      },
      fields: [
        localizedText('groupName', { label: 'Group' }),
        localizedText('fullName', { label: 'Name' }),
        localizedText('jobTitle', { label: 'Job Title' }),
        { name: 'memberImage', type: 'upload', relationTo: 'media' },
        { name: 'displayOrder', type: 'number', defaultValue: 0 },
      ],
    },
  ],
}
