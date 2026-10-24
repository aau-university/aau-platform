import { describe, expect, it } from 'vitest'

import { isRedisConfigured, resolveRedisConnection } from '../redis-connection'

/**
 * Passwords that a strong-password generator will produce and that are
 * STRUCTURAL characters in a URI. Each one broke the previous
 * `redis://default:${REDIS_PASSWORD}@redis-prod:6379` interpolation.
 */
const HOSTILE_PASSWORDS = [
  'p@ssw0rd',
  'a/b',
  'has#hash',
  'q?uery',
  'per%cent',
  'colon:inside',
  'sp ace',
  'quote"and\'quote',
  'back\\slash',
  '[brackets]',
  'ümlaut',
  '@@@///###',
]

describe('resolveRedisConnection', () => {
  it('returns null when Redis is not configured at all', () => {
    expect(resolveRedisConnection({ NODE_ENV: 'test' })).toBeNull()
    expect(isRedisConfigured({ NODE_ENV: 'test' })).toBe(false)
  })

  it('carries every hostile password through VERBATIM', () => {
    for (const password of HOSTILE_PASSWORDS) {
      const resolved = resolveRedisConnection({
        NODE_ENV: 'production',
        REDIS_HOST: 'redis-prod',
        REDIS_PASSWORD: password,
      })

      expect(resolved?.source).toBe('structured')
      // The whole point: no encoding, no escaping, no round-trip through a URI.
      expect(resolved?.options.password).toBe(password)
      expect(resolved?.options.socket).toEqual({ host: 'redis-prod', port: 6379 })
      expect(resolved?.options.url).toBeUndefined()
    }
  })

  it('documents the failure it replaces: the same passwords break a URI', () => {
    // Not a test of our code — a test of the CLAIM that motivates it. If URI
    // assembly were actually safe, this would fail and the structured form
    // would be unjustified complexity.
    const broken = HOSTILE_PASSWORDS.filter((password) => {
      try {
        const url = new URL(`redis://default:${password}@redis-prod:6379`)
        return decodeURIComponent(url.password) !== password || url.hostname !== 'redis-prod'
      } catch {
        return true
      }
    })
    expect(broken.length).toBeGreaterThan(0)
  })

  it('defaults the port and username, and honours explicit ones', () => {
    const defaults = resolveRedisConnection({ NODE_ENV: 'production', REDIS_HOST: 'r' })
    expect(defaults?.options.socket?.port).toBe(6379)
    expect(defaults?.options.username).toBe('default')

    const explicit = resolveRedisConnection({
      NODE_ENV: 'production',
      REDIS_HOST: 'r',
      REDIS_PORT: '6380',
      REDIS_USERNAME: 'app',
    })
    expect(explicit?.options.socket?.port).toBe(6380)
    expect(explicit?.options.username).toBe('app')
  })

  it('refuses an unusable port instead of silently defaulting', () => {
    // Silently falling back to 6379 would connect to a DIFFERENT Redis than
    // the operator configured, and carry session and rate-limit state there.
    for (const port of ['not-a-number', '0', '-1', '65536', '6379x']) {
      expect(() =>
        resolveRedisConnection({ NODE_ENV: 'production', REDIS_HOST: 'r', REDIS_PORT: port }),
      ).toThrow(/valid TCP port/)
    }
  })

  it('prefers structured configuration when both forms are present', () => {
    // Otherwise which one wins depends on statement order, and an operator
    // migrating from one form to the other cannot tell which is in effect.
    const resolved = resolveRedisConnection({
      NODE_ENV: 'production',
      REDIS_HOST: 'redis-prod',
      REDIS_PASSWORD: 'structured-wins',
      REDIS_URL: 'redis://should-not-be-used:6379',
    })
    expect(resolved?.source).toBe('structured')
    expect(resolved?.options.url).toBeUndefined()
  })

  it('still supports a plain URL for local development and CI', () => {
    const resolved = resolveRedisConnection({
      NODE_ENV: 'test',
      REDIS_URL: 'redis://127.0.0.1:6379',
    })
    expect(resolved?.source).toBe('url')
    expect(resolved?.options.url).toBe('redis://127.0.0.1:6379')
  })

  it('treats blank values as absent rather than as a configured empty host', () => {
    expect(resolveRedisConnection({ NODE_ENV: 'test', REDIS_HOST: '   ' })).toBeNull()
    expect(
      resolveRedisConnection({ NODE_ENV: 'test', REDIS_HOST: '', REDIS_URL: 'redis://x:6379' })
        ?.source,
    ).toBe('url')
  })
})
