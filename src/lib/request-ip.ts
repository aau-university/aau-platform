/**
 * Best-effort client IP extraction from request headers.
 *
 * Order of precedence (trusted-infra headers FIRST):
 *   1. `cf-connecting-ip` — set (and overwritten) by Cloudflare; a client
 *      cannot spoof it from behind the CF edge.
 *   2. `x-real-ip` — set by the immediate reverse proxy (e.g. nginx), which
 *      overwrites any client-supplied value per hop.
 *   3. `x-vercel-forwarded-for` — set by Vercel's edge.
 *   4. `x-forwarded-for` (leftmost) — LAST resort. This header is
 *      client-appendable: proxies APPEND to it, so its leftmost entry is
 *      attacker-controlled. Using it as a rate-limit key lets an attacker
 *      rotate the value to defeat per-IP limits, so we only fall back to it
 *      when no trusted-infra header is present.
 *
 * Returns "unknown" if none of the above is present. Never throws.
 *
 * NOTE: if the app is exposed with no trusted reverse proxy in front, every
 * header here is spoofable and rate-limiting by IP is inherently best-effort.
 */

export function extractClientIp(headers: Headers): string {
  // CodeRabbit #4: guard the TRIMMED value, not the raw header. A
  // whitespace-only header (e.g. " ") is truthy but trims to "" — which
  // would become the rate-limit key and short-circuit the trusted fallback.
  const cf = headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const vercel = headers.get('x-vercel-forwarded-for')
  if (vercel) {
    const first = vercel.split(',')[0]?.trim()
    if (first) return first
  }
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

export function extractUserAgent(headers: Headers): string {
  const ua = headers.get('user-agent')
  return (ua ?? '').slice(0, 500) // hard cap to avoid log spam
}
