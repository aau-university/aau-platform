import { describe, expect, it } from 'vitest'

import {
  InvalidPublicOriginError,
  isPublicOrigin,
  normalizePublicOrigin,
} from '@/lib/public-origin'
import { assertPublicHttpsOrigin } from '@/utilities/getURL'

/**
 * `NEXT_PUBLIC_SERVER_URL` is an ORIGIN, not a general URL. Everything that
 * merely "parses as https" but is not a bare origin fails in ways that do not
 * throw: a CORS entry that never matches the browser's Origin header, absolute
 * URLs with a stray path segment, or a userinfo component that makes the
 * effective host different from the one an operator reads in the config.
 *
 * These cases were all accepted by the previous scheme+loopback check.
 */
describe('normalizePublicOrigin', () => {
  const invalid: ReadonlyArray<[string, string]> = [
    ['a path', 'https://aau.example/base'],
    ['a trailing path segment', 'https://aau.example/admin/'],
    ['a query string', 'https://aau.example/?tenant=main'],
    ['a fragment', 'https://aau.example/#section'],
    ['a username', 'https://operator@aau.example'],
    ['a username and password', 'https://operator:hunter2@aau.example'],
    ['a username that looks like the real host', 'https://aau.example@evil.test'],
    ['http', 'http://aau.example'],
    ['a non-http scheme', 'ftp://aau.example'],
    ['localhost', 'https://localhost'],
    ['a loopback address', 'https://127.0.0.1'],
    ['an IPv6 loopback', 'https://[::1]'],
    ['a bare hostname with no scheme', 'aau.example'],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ]

  it.each(invalid)('rejects %s', (_label, value) => {
    expect(() => normalizePublicOrigin(value)).toThrow(InvalidPublicOriginError)
    expect(isPublicOrigin(value)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(() => normalizePublicOrigin(undefined)).toThrow(InvalidPublicOriginError)
  })

  const valid: ReadonlyArray<[string, string]> = [
    ['a bare origin', 'https://aau.example'],
    ['a subdomain', 'https://www.aauye-edu.net'],
    ['an explicit port', 'https://aau.example:8443'],
    ['a trailing slash, normalised away', 'https://aau.example/'],
    ['surrounding whitespace, trimmed', '  https://aau.example  '],
    ['an uppercase host, lowercased', 'https://AAU.Example'],
    ['a redundant :443, normalised away', 'https://aau.example:443'],
  ]

  it.each(valid)('accepts %s', (_label, value) => {
    expect(() => normalizePublicOrigin(value)).not.toThrow()
  })

  it('returns a canonical bare origin', () => {
    expect(normalizePublicOrigin('https://aau.example/')).toBe('https://aau.example')
    expect(normalizePublicOrigin('https://aau.example:443')).toBe('https://aau.example')
    expect(normalizePublicOrigin('https://AAU.Example')).toBe('https://aau.example')
    expect(normalizePublicOrigin('https://aau.example:8443')).toBe('https://aau.example:8443')
  })

  it('names the specific rule that was violated', () => {
    expect(() => normalizePublicOrigin('https://aau.example/base')).toThrow(/no path/i)
    expect(() => normalizePublicOrigin('https://a@b.test')).toThrow(/username or password/i)
    expect(() => normalizePublicOrigin('https://aau.example/?x=1')).toThrow(/query string/i)
    expect(() => normalizePublicOrigin('https://aau.example/#x')).toThrow(/fragment/i)
  })
})

describe('assertPublicHttpsOrigin (runtime wrapper)', () => {
  /**
   * The build-time gate and the runtime must never disagree about what a valid
   * origin is, which is why both call the same implementation. This asserts the
   * wrapper really delegates rather than keeping a second, laxer copy of the
   * rules.
   */
  it('rejects everything normalizePublicOrigin rejects', () => {
    for (const value of [
      'https://aau.example/base',
      'https://a@b.test',
      'https://aau.example/?x=1',
      'http://aau.example',
      'https://localhost',
    ]) {
      expect(() => assertPublicHttpsOrigin(value)).toThrow()
    }
  })

  it('accepts a bare public origin', () => {
    expect(() => assertPublicHttpsOrigin('https://aau.example')).not.toThrow()
  })
  it('rejects the whole IPv4 loopback range, not three spellings of it', () => {
    // 127.0.0.2 is as unreachable from the public internet as 127.0.0.1, and
    // this value is baked permanently into a built image — so an exact-name set
    // would let the build gate approve an origin no visitor can resolve.
    for (const value of [
      'https://127.0.0.1',
      'https://127.0.0.2',
      'https://127.1.1.1',
      'https://127.255.255.254',
      'https://[::1]',
    ]) {
      expect(() => assertPublicHttpsOrigin(value), value).toThrow(/loopback/)
    }
  })

  it('still accepts public addresses that merely start with 12', () => {
    for (const value of ['https://128.0.0.1', 'https://12.7.0.1', 'https://1270.example']) {
      expect(() => assertPublicHttpsOrigin(value), value).not.toThrow()
    }
  })
  it('rejects loopback written with a trailing DNS root dot', () => {
    // `new URL('https://localhost.').hostname` keeps the dot (measured), so an
    // exact-name comparison misses it and approves a loopback production
    // origin. IPv4 literals are normalised by URL parsing already, so the
    // named host is the one that leaked.
    expect(() => assertPublicHttpsOrigin('https://localhost.')).toThrow(/loopback/)
  })

  it('still accepts a public origin written with a trailing root dot', () => {
    expect(() => assertPublicHttpsOrigin('https://aau.example.')).not.toThrow()
  })
})
