import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

/** Explicit local-development schema push; production uses Payload migrations. */
async function pushSchema() {
  if (
    process.env.APP_ENV !== 'local-docker' ||
    process.env.NODE_ENV !== 'development' ||
    process.env.PAYLOAD_DB_PUSH !== 'true'
  ) {
    throw new Error('Schema push is only allowed in development with APP_ENV=local-docker and PAYLOAD_DB_PUSH=true.')
  }

  let payload: Awaited<ReturnType<typeof getPayload>> | undefined
  console.log('Initializing Payload (this pushes the schema via Drizzle)...')
  try {
    payload = await getPayload({ config })
    console.log('Schema push complete.')
  } finally {
    if (payload) {
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          payload.destroy(),
          new Promise<void>((resolve) => {
            timeout = setTimeout(() => {
              console.warn('Payload cleanup exceeded 10 seconds; ending local schema push.')
              resolve()
            }, 10_000)
          }),
        ])
      } finally {
        if (timeout) clearTimeout(timeout)
      }
    }
  }
}

pushSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Schema push failed:', err)
    process.exit(1)
  })
