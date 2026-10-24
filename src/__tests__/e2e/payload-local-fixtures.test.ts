import { describe, expect, it } from 'vitest'

import { validateE2EEnvironment } from '../../../tests/helpers/e2eSafety'

describe('E2E environment guard', () => {
  it('returns explicit safe environment for the spawned server', () => {
    expect(
      validateE2EEnvironment({
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_e2e',
      }),
    ).toEqual({
      webServerEnv: {
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_e2e',
        PAYLOAD_DB_PUSH: 'false',
        // The browser suite runs the real standalone production artifact over
        // a loopback HTTP origin, which the production runtime otherwise
        // refuses (see `src/utilities/getURL.ts`).
        PAYLOAD_ALLOW_INSECURE_ORIGIN: 'true',
        // Startup must not mutate the E2E database — the suite manages its own
        // fixtures and migrations are applied beforehand by `pnpm migrate`.
        PAYLOAD_RUNTIME_MIGRATIONS: 'false',
        PAYLOAD_RUNTIME_BOOTSTRAP: 'false',
      },
    })
  })

  it('pins the spawned server away from database-mutating startup work', () => {
    const { webServerEnv } = validateE2EEnvironment({
      DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_e2e',
    })

    expect(webServerEnv.PAYLOAD_RUNTIME_MIGRATIONS).toBe('false')
    expect(webServerEnv.PAYLOAD_RUNTIME_BOOTSTRAP).toBe('false')
  })

  it('allows both database variables when both target scratch databases', () => {
    expect(
      validateE2EEnvironment({
        DATABASE_DIRECT_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_direct',
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_pool',
        PAYLOAD_DB_PUSH: 'false',
      }).webServerEnv,
    ).toMatchObject({
      DATABASE_DIRECT_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_direct',
      DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_pool',
      PAYLOAD_DB_PUSH: 'false',
    })
  })

  it.each([
    undefined,
    'not-a-url',
    'postgresql://user:pass@localhost:5432/aau',
    'postgresql://user:pass@localhost:5432/production',
  ])('rejects missing or unsafe database URI %s', (databaseURL) => {
    expect(() => validateE2EEnvironment({ DATABASE_URI: databaseURL })).toThrow()
  })

  it('rejects a scratch-named database on an external host', () => {
    expect(() =>
      validateE2EEnvironment({
        DATABASE_URI: 'postgresql://user:pass@example.com:5432/aau_fixes_e2e',
      }),
    ).toThrow('does not target local PostgreSQL')
  })

  it('rejects when either configured database target is unsafe', () => {
    expect(() =>
      validateE2EEnvironment({
        DATABASE_DIRECT_URI: 'postgresql://user:pass@localhost:5432/production',
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_pool',
      }),
    ).toThrow('Refusing E2E startup because DATABASE_DIRECT_URI is not an aau_fixes_* database.')
  })

  it.each(['true', ' true '])('rejects schema push value %s', (pushValue) => {
    expect(() =>
      validateE2EEnvironment({
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_e2e',
        PAYLOAD_DB_PUSH: pushValue,
      }),
    ).toThrow('Refusing E2E startup while PAYLOAD_DB_PUSH=true.')
  })

  it('does not include unrelated environment values', () => {
    expect(
      validateE2EEnvironment({
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_e2e',
        PAYLOAD_SECRET: 'must-not-be-copied-by-the-guard',
      }).webServerEnv,
    ).not.toHaveProperty('PAYLOAD_SECRET')
  })

  it('rejects an unsafe pooled URI even when the direct URI is safe', () => {
    expect(() =>
      validateE2EEnvironment({
        DATABASE_DIRECT_URI: 'postgresql://user:pass@localhost:5432/aau_fixes_direct',
        DATABASE_URI: 'postgresql://user:pass@localhost:5432/production',
      }),
    ).toThrow('Refusing E2E startup because DATABASE_URI is not an aau_fixes_* database.')
  })
})
