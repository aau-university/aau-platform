import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison to defeat timing attacks.
 *
 * Use this instead of `===` / `!==` when comparing secrets (preview tokens,
 * webhook signatures, etc.). Plain string comparison short-circuits on the
 * first byte mismatch, which leaks the secret's prefix via response-time
 * side channels.
 *
 * Both values are encoded as their injective UTF-16 code-unit representation
 * and hashed to fixed-size SHA-256 digests before comparison. This preserves
 * distinctions between JavaScript strings containing unpaired surrogates.
 *
 * @example
 *   if (!safeEqual(req.query.secret ?? '', process.env.PREVIEW_SECRET ?? '')) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(Buffer.from(a, 'utf16le')).digest()
  const digestB = createHash('sha256').update(Buffer.from(b, 'utf16le')).digest()
  return timingSafeEqual(digestA, digestB)
}
