/**
 * The single canonical definition of a valid public origin for this
 * deployment.
 *
 * ── Why a canonical origin, not "a URL that starts with https" ────────────
 * `NEXT_PUBLIC_SERVER_URL` is an ORIGIN. It is concatenated into absolute
 * URLs, used as the Payload `serverURL`, and used verbatim as the CORS and
 * CSRF allow-list. Anything carrying a path, query, fragment or userinfo is
 * therefore not merely untidy — it is wrong in ways that fail quietly:
 *
 *   https://aau.example/base   -> `${origin}/api/health` becomes
 *                                 https://aau.example/base/api/health, and the
 *                                 CORS entry never matches the browser's
 *                                 Origin header (which is always bare).
 *   https://a.test@b.test      -> reads as userinfo `a.test` on host `b.test`.
 *                                 An operator eyeballing the config sees the
 *                                 wrong host as the effective one.
 *   https://aau.example/?x=1   -> same CORS mismatch, plus a stray query in
 *                                 every generated link.
 *
 * A CORS entry that silently never matches is the dangerous case: it does not
 * throw, it just fails requests in production long after the deploy.
 *
 * ── One implementation, deliberately dependency-free ──────────────────────
 * This module imports nothing. That is what lets the SAME code run in the
 * Next.js runtime, in unit tests, and as the build-time gate that validates
 * the origin being baked into a release image
 * (`scripts/check-production-origin.ts`). A second copy of these rules written
 * in shell inside a workflow is exactly how CI and the application come to
 * disagree about what is valid, so there isn't one.
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1', '[::1]'])

/**
 * Loopback is a RANGE, not three spellings of one address. `127.0.0.2` is as
 * unreachable from the public internet as `127.0.0.1`, and this value is baked
 * permanently into a built image — so an exact-name check would let the build
 * gate approve an origin no visitor can resolve.
 *
 * IPv6 loopback is only `::1`, but it has several textual forms, so the
 * zero-compressed and fully expanded spellings are both matched.
 */
function isLoopbackHostname(hostname: string): boolean {
  // One trailing DNS root dot is stripped first: `new URL('https://localhost.')`
  // keeps the dot in `hostname` (measured), so `localhost.` would miss an
  // exact-name comparison and be approved as a public origin. IPv4 literals are
  // already normalised by URL parsing — `127.0.0.1.` comes back without it —
  // so this only matters for named hosts, which is exactly where it leaked.
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (LOOPBACK_HOSTNAMES.has(host)) return true
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return host.split('.').every((octet) => Number(octet) <= 255)
  }
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  return bare === '::1' || bare === '0:0:0:0:0:0:0:1'
}

export class InvalidPublicOriginError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPublicOriginError'
  }
}

/**
 * Validate `value` as a public HTTPS origin and return it in canonical form
 * (`https://host` or `https://host:port`, no trailing slash).
 *
 * Throws `InvalidPublicOriginError` describing the first violated rule.
 */
export function normalizePublicOrigin(value: string | undefined | null): string {
  const raw = value?.trim()

  if (!raw) {
    throw new InvalidPublicOriginError(
      'NEXT_PUBLIC_SERVER_URL must be set to the real public HTTPS origin in production. ' +
        'There is no localhost fallback in the production runtime.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL is not a valid absolute URL: ${raw}`,
    )
  }

  if (parsed.protocol !== 'https:') {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL must use HTTPS in production; received ${parsed.protocol}//`,
    )
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw new InvalidPublicOriginError(
      'NEXT_PUBLIC_SERVER_URL must not contain a username or password. ' +
        `An origin has no userinfo, and \`user@host\` reads as the host ${parsed.hostname}, ` +
        'which is rarely what was intended.',
    )
  }

  // `new URL('https://h')` normalises the path to '/', so '/' means "no path".
  if (parsed.pathname !== '/') {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL must be a bare origin with no path; received path ${parsed.pathname}. ` +
        'A path here breaks every generated absolute URL and never matches a browser Origin header.',
    )
  }

  if (parsed.search !== '') {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL must not contain a query string; received ${parsed.search}`,
    )
  }

  if (parsed.hash !== '') {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL must not contain a fragment; received ${parsed.hash}`,
    )
  }

  if (!parsed.hostname) {
    throw new InvalidPublicOriginError(`NEXT_PUBLIC_SERVER_URL has no hostname: ${raw}`)
  }

  if (isLoopbackHostname(parsed.hostname)) {
    throw new InvalidPublicOriginError(
      `NEXT_PUBLIC_SERVER_URL must be the real public origin in production, not a loopback host (${parsed.hostname}).`,
    )
  }

  if (parsed.port !== '') {
    const port = Number(parsed.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InvalidPublicOriginError(
        `NEXT_PUBLIC_SERVER_URL has an invalid port: ${parsed.port}`,
      )
    }
  }

  // `URL.origin` is already the canonical form and drops a redundant `:443`.
  return parsed.origin
}

/** True when `value` is a valid canonical public HTTPS origin. */
export function isPublicOrigin(value: string | undefined | null): boolean {
  try {
    normalizePublicOrigin(value)
    return true
  } catch {
    return false
  }
}
