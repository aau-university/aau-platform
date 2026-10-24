import { describe, expect, it } from 'vitest'

import { buildPostgresUri, resolveDatabaseConnectionString } from '@/lib/database-url'

/**
 * The application password used to be written three times in the deployment
 * env file — once as APP_DB_PASSWORD and twice more inside DATABASE_URI and
 * DATABASE_DIRECT_URI — in two different encodings. A password containing a
 * URI-reserved character was therefore correct in one place and broken in the
 * others, and nothing detected the drift.
 *
 * These are the characters that actually break a URI, exercised with
 * deliberately hostile NON-PRODUCTION dummy values.
 */
describe('buildPostgresUri', () => {
  it('percent-encodes a password containing every URI-reserved character', () => {
    const password = 'p@ss:w/rd?x=1&y#z%20 end!'
    const uri = buildPostgresUri({
      host: 'postgres-prod',
      name: 'aau_platform',
      user: 'aau_app',
      password,
    })

    // The structural characters must not survive verbatim, or the URI parses
    // into a different host, port, path or query.
    const userinfo = uri.slice('postgresql://'.length, uri.lastIndexOf('@'))
    expect(userinfo).not.toContain('@')
    expect(userinfo).not.toContain('/')
    expect(userinfo).not.toContain('?')
    expect(userinfo).not.toContain('#')

    // Round-trips back to the original bytes.
    const parsed = new URL(uri)
    expect(decodeURIComponent(parsed.password)).toBe(password)
    expect(parsed.hostname).toBe('postgres-prod')
    expect(parsed.port).toBe('5432')
    expect(parsed.pathname).toBe('/aau_platform')
  })

  it('a password containing @ does not change the effective host', () => {
    const uri = buildPostgresUri({
      host: 'postgres-prod',
      name: 'aau_platform',
      user: 'aau_app',
      password: 'pass@evil.test',
    })
    expect(new URL(uri).hostname).toBe('postgres-prod')
  })

  it('a password containing / does not introduce a database name', () => {
    const uri = buildPostgresUri({
      host: 'postgres-prod',
      name: 'aau_platform',
      user: 'aau_app',
      password: 'a/b',
    })
    expect(new URL(uri).pathname).toBe('/aau_platform')
  })

  it('encodes a user and database name containing reserved characters', () => {
    const uri = buildPostgresUri({
      host: 'postgres-prod',
      name: 'db/name',
      user: 'user:name',
      password: 'x',
    })
    const parsed = new URL(uri)
    expect(decodeURIComponent(parsed.username)).toBe('user:name')
    expect(decodeURIComponent(parsed.pathname.slice(1))).toBe('db/name')
  })

  it('defaults the port and rejects a non-numeric one', () => {
    expect(
      buildPostgresUri({ host: 'h', name: 'd', user: 'u', password: 'p' }),
    ).toContain(':5432/')
    expect(() =>
      buildPostgresUri({ host: 'h', port: '54a32', name: 'd', user: 'u', password: 'p' }),
    ).toThrow(/numeric/i)
  })

  it('rejects empty structural components', () => {
    expect(() => buildPostgresUri({ host: '', name: 'd', user: 'u', password: 'p' })).toThrow()
    expect(() => buildPostgresUri({ host: 'h', name: '', user: 'u', password: 'p' })).toThrow()
    expect(() => buildPostgresUri({ host: 'h', name: 'd', user: '', password: 'p' })).toThrow()
  })
})

describe('resolveDatabaseConnectionString', () => {
  const discrete = {
    DATABASE_HOST: 'postgres-prod',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'aau_platform',
    DATABASE_USER: 'aau_app',
    DATABASE_PASSWORD: 'p@ss',
  }

  it('prefers DATABASE_DIRECT_URI, then DATABASE_URI', () => {
    expect(
      resolveDatabaseConnectionString({
        ...discrete,
        DATABASE_URI: 'postgresql://a/b',
        DATABASE_DIRECT_URI: 'postgresql://direct/b',
      }),
    ).toBe('postgresql://direct/b')

    expect(
      resolveDatabaseConnectionString({
        ...discrete,
        DATABASE_URI: 'postgresql://a/b',
      }),
    ).toBe('postgresql://a/b')
  })

  it('assembles the discrete variables when no URI is supplied', () => {
    const uri = resolveDatabaseConnectionString(discrete)
    expect(new URL(uri).hostname).toBe('postgres-prod')
    expect(decodeURIComponent(new URL(uri).password)).toBe('p@ss')
  })

  it('returns an empty string when nothing is configured (next build)', () => {
    expect(resolveDatabaseConnectionString({})).toBe('')
  })

  it('names the missing variable rather than silently connecting nowhere', () => {
    expect(() =>
      resolveDatabaseConnectionString({
        DATABASE_HOST: 'h',
        DATABASE_NAME: 'd',
        DATABASE_USER: 'u',
      }),
    ).toThrow(/DATABASE_PASSWORD/)
  })

  it('fails closed on an EMPTY password rather than connecting without one', () => {
    // An empty DATABASE_PASSWORD is treated as misconfiguration, not as a
    // deliberate passwordless role: the application role is always created with
    // a password, so an empty value here means the operator lost it somewhere
    // between the env file and the container. Building a URI with no password
    // would then succeed against a `trust`-authenticated cluster and quietly
    // remove authentication from the connection.
    expect(() =>
      resolveDatabaseConnectionString({ ...discrete, DATABASE_PASSWORD: '' }),
    ).toThrow(/DATABASE_PASSWORD/)
  })
  it('refuses a host that would change which server the URI addresses', () => {
    // The host is the one component that is NOT percent-encoded, so it is
    // structural: a URI parser takes the LAST '@' as the userinfo delimiter,
    // and '/', '?' and '#' each end the authority. Each of these would connect
    // somewhere other than where the operator wrote.
    for (const host of [
      'db@evil.test',
      'db/path',
      'db?x=1',
      'db#frag',
      'db:5432',
      '::1',
      'db host',
    ]) {
      expect(
        () => resolveDatabaseConnectionString({ ...discrete, DATABASE_HOST: host }),
        host,
      ).toThrow(/DATABASE_HOST/)
    }
  })

  it('accepts the host forms a real deployment uses', () => {
    for (const host of ['postgres-prod', 'db.internal.example', '127.0.0.1', '[::1]', 'localhost']) {
      expect(
        () => resolveDatabaseConnectionString({ ...discrete, DATABASE_HOST: host }),
        host,
      ).not.toThrow()
    }
  })

  it('reports a partial discrete configuration whichever variable is the lone one', () => {
    // Previously only host/name/user were inspected, so a lone DATABASE_PASSWORD
    // or DATABASE_PORT read as "nothing configured" and returned '' — failing
    // much later with an error about an empty connection string.
    expect(() => resolveDatabaseConnectionString({ DATABASE_PASSWORD: 'p' })).toThrow(
      /DATABASE_HOST/,
    )
    expect(() => resolveDatabaseConnectionString({ DATABASE_PORT: '5432' })).toThrow(
      /DATABASE_HOST/,
    )
  })
})
