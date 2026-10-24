import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { getBootstrapFailure } from '@/bootstrap/identity-bootstrap-runner'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
} as const

function safeError(error: unknown) {
  const candidate = error instanceof Error ? error : new Error('Unknown database health error')
  return { message: candidate.message, name: candidate.name }
}

export async function GET(): Promise<Response> {
  let payload: Payload | undefined

  // A failed identity bootstrap is terminal. Payload swallows `onInit` errors,
  // so a database that answers queries is NOT sufficient evidence that this
  // release is ready to serve — without its canonical Roles and Super Admin it
  // is not. Reported before touching the database so the answer is the same
  // for every request, not only the one that triggered initialization.
  const bootstrapFailure = getBootstrapFailure()
  if (bootstrapFailure) {
    return Response.json(
      { bootstrap: 'failed', database: 'unknown', status: 'error' },
      { headers: NO_STORE_HEADERS, status: 503 },
    )
  }

  try {
    payload = await getPayload({ config: configPromise })
    await payload.count({ collection: 'users', overrideAccess: true })

    return Response.json(
      { database: 'healthy', status: 'ok' },
      { headers: NO_STORE_HEADERS, status: 200 },
    )
  } catch (error) {
    const context = {
      err: safeError(error),
      operation: 'readiness-check',
      subsystem: 'postgresql',
    }

    if (payload) payload.logger.error(context)
    else console.error(context)

    return Response.json(
      { database: 'unavailable', status: 'error' },
      { headers: NO_STORE_HEADERS, status: 503 },
    )
  }
}
