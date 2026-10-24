import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'

export function rethrowPayloadErrorInProduction(err: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    throw err
  }
}

/**
 * Resolve a Payload instance without hiding production outages.
 *
 * Public-site Server Components must not crash when:
 *   - PAYLOAD_SECRET is missing (local dev / sandbox)
 *   - the database is unreachable (Neon down, dev container offline)
 *   - the runtime is starting cold and migrations haven't been applied yet
 *
 * In production, Payload/DB failures must surface so deployment health checks
 * and error boundaries catch the outage. Local dev/test may still serve static
 * fallback data when the database container is offline.
 */
export async function getPayloadSafe(): Promise<Payload | null> {
  try {
    return await getPayload({ config })
  } catch (err) {
    rethrowPayloadErrorInProduction(err)

    console.warn('[getPayloadSafe] Payload unavailable; serving fallback data.', err)
    return null
  }
}
