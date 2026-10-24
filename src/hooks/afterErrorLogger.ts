import type { AfterErrorHook } from 'payload'

/** Log safely, then let Payload's default error response continue. */
export const afterErrorLogger: AfterErrorHook = ({ error, req }) => {
  const safeError = error instanceof Error
    ? { message: error.message, name: error.name }
    : { message: 'Unknown Payload error', name: 'UnknownError' }

  req.payload.logger.error({
    err: safeError,
    operation: 'payload-request',
    requestId: req.headers.get('x-request-id') ?? undefined,
    userId: req.user?.id,
    msg: 'Payload request failed',
  })
}
