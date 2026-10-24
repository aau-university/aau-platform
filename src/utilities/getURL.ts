import { canUseDOM } from './canUseDOM'
import { isNextBuildPhase } from '../lib/runtime-mode'
import { normalizePublicOrigin } from '../lib/public-origin'

const FALLBACK_URL = 'http://localhost:3000'

/**
 * Whether the resolved origin must be a real public HTTPS origin.
 *
 * True in the production *container runtime*. Deliberately not true during
 * `next build` — the image builder has no production origin secrets and must
 * not need any — and suppressible with `PAYLOAD_ALLOW_INSECURE_ORIGIN=true`
 * for the standalone browser tests, which serve the production artifact over
 * loopback HTTP on purpose.
 *
 * The VPS runtime profile never sets that escape hatch; `deploy/` and its
 * tests assert as much.
 */
function requiresPublicHttpsOrigin(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  if (isNextBuildPhase()) return false
  return process.env.PAYLOAD_ALLOW_INSECURE_ORIGIN !== 'true'
}

/**
 * Validate an explicitly configured production origin, throwing on anything
 * that would silently produce broken absolute URLs, cookies or CORS rules.
 *
 * The rules themselves live in `src/lib/public-origin.ts` — one canonical,
 * dependency-free implementation shared by the runtime, the unit tests and the
 * build-time gate that validates the origin baked into a release image. This
 * wrapper exists only to keep the assertion signature callers already use.
 *
 * Exported for direct unit testing so a future refactor cannot weaken the rule
 * without a failing test.
 */
export function assertPublicHttpsOrigin(value: string | undefined): asserts value is string {
  normalizePublicOrigin(value)
}

/**
 * Resolve the public origin of the deployment from server-side code.
 *
 * AAU runs on VPS/Docker — there is no `VERCEL_URL`. The single source of
 * truth is `NEXT_PUBLIC_SERVER_URL`. The localhost fallback exists for local
 * development only and is unreachable in the production runtime, which fails
 * closed instead (see `requiresPublicHttpsOrigin`).
 */
export const getServerSideURL = (): string => {
  const explicit = process.env.NEXT_PUBLIC_SERVER_URL

  if (requiresPublicHttpsOrigin()) {
    // Return the CANONICAL origin, not the raw string: `serverURL`, the CORS
    // entry and the CSRF entry must be byte-identical to what a browser sends
    // as its Origin header, and only the canonical form is guaranteed to be.
    return normalizePublicOrigin(explicit)
  }

  if (explicit && explicit.trim() !== '') return explicit.trim().replace(/\/$/, '')
  return FALLBACK_URL
}

/**
 * Whether the resolved server origin is HTTPS.
 *
 * Drives the `Secure` attribute on the Payload authentication cookie: a
 * `Secure` cookie is never sent over the loopback HTTP origin the standalone
 * browser tests use, so the flag follows the actual origin scheme rather than
 * `NODE_ENV` alone.
 */
export const isSecureServerOrigin = (): boolean => getServerSideURL().startsWith('https://')

/**
 * Resolve the public origin of the deployment from client-side code.
 *
 * When running in a browser, uses `window.location.origin`. On the server
 * (SSR / RSC), falls back to `getServerSideURL()` so that a sensible origin
 * is still returned for `next/headers`-driven flows.
 */
export const getClientSideURL = (): string => {
  if (canUseDOM) {
    if (typeof window.location?.origin === 'string') return window.location.origin
    const protocol = window.location?.protocol ?? 'http:'
    const host = window.location?.host ?? 'localhost:3000'
    return `${protocol}//${host}`
  }

  return getServerSideURL()
}
