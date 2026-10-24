/**
 * Build-time gate for the origin baked into a release image.
 *
 * `NEXT_PUBLIC_SERVER_URL` is inlined by `next build`, so an invalid origin
 * becomes a permanent property of the artifact — discovered, otherwise, only
 * when the deployed site starts generating broken links. This runs inside the
 * Docker builder so the check happens exactly where the value is baked in, and
 * it calls the SAME `normalizePublicOrigin` the runtime uses rather than a
 * second copy of the rules in shell.
 */
import { normalizePublicOrigin } from '../src/lib/public-origin'

const value = process.argv[2] ?? process.env.NEXT_PUBLIC_SERVER_URL

try {
  const canonical = normalizePublicOrigin(value)
  if (canonical !== value?.trim()) {
    console.error(
      `NEXT_PUBLIC_SERVER_URL is valid but not canonical.\n` +
        `  given:     ${value}\n` +
        `  canonical: ${canonical}\n` +
        `Use the canonical form so the baked origin, the CORS entry and the CSRF entry are byte-identical.`,
    )
    process.exit(1)
  }
  console.log(`NEXT_PUBLIC_SERVER_URL is a canonical public origin: ${canonical}`)
} catch (error) {
  console.error(`Invalid NEXT_PUBLIC_SERVER_URL: ${(error as Error).message}`)
  process.exit(1)
}
