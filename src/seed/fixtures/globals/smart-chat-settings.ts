import type { SharedGlobalFixture } from './types'

export const smartChatSettingsFixture = {
  shared: {
    isEnabled: false,
  },
} as const satisfies SharedGlobalFixture<'smart-chat-settings'>
