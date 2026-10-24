import type { GlobalConfig } from 'payload'

import { isAdminOrAbove, hideBelowLevel } from '../access'

export const SmartChatSettings: GlobalConfig = {
  slug: 'smart-chat-settings',
  label: 'Smart Chat Settings',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(4),
  },
  access: {
    read: isAdminOrAbove,
    update: isAdminOrAbove,
  },
  fields: [
    {
      name: 'isEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'botName',
      type: 'text',
    },
    {
      name: 'welcomeMessage',
      type: 'textarea',
    },
    {
      name: 'apiEndpoint',
      type: 'text',
    },
    {
      name: 'model',
      type: 'text',
    },
    {
      name: 'maxTokens',
      type: 'number',
    },
    {
      name: 'temperature',
      type: 'number',
      min: 0,
      max: 2,
    },
  ],
}
