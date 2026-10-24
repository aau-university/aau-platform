import { createSafeActionClient } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[safe-action] server error', error)
    }

    return 'server_error'
  },
})
