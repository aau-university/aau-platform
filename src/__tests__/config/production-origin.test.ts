import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { assertPublicHttpsOrigin, getServerSideURL, isSecureServerOrigin } from '@/utilities/getURL'
import { isNextBuildPhase, runtimeBootstrapEnabled, runtimeMigrationsEnabled } from '@/lib/runtime-mode'

/**
 * Guards the production origin/CORS/CSRF/cookie contract from §4.4–4.6 of the
 * Docker/VPS plan. These are the rules a future refactor is most likely to
 * weaken silently, so they are asserted directly rather than only through the
 * Docker suite.
 */

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PHASE',
  'NEXT_PUBLIC_SERVER_URL',
  'PAYLOAD_ALLOW_INSECURE_ORIGIN',
  'PAYLOAD_RUNTIME_MIGRATIONS',
  'PAYLOAD_RUNTIME_BOOTSTRAP',
] as const

let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as typeof saved
})

afterEach(() => {
  setEnv(saved)
})

describe('production server origin', () => {
  it('fails closed in the production runtime when the origin is missing', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: undefined,
      PAYLOAD_ALLOW_INSECURE_ORIGIN: undefined,
    })

    expect(() => getServerSideURL()).toThrow(/must be set to the real public HTTPS origin/)
  })

  it.each([
    ['http://aau.edu.example', /must use HTTPS/],
    ['https://localhost:3000', /not a loopback host/],
    ['https://127.0.0.1', /not a loopback host/],
    ['not-a-url', /not a valid absolute URL/],
  ])('rejects %s in the production runtime', (origin, message) => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: origin,
      PAYLOAD_ALLOW_INSECURE_ORIGIN: undefined,
    })

    expect(() => getServerSideURL()).toThrow(message)
  })

  it('never falls back to localhost in the production runtime', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: '',
      PAYLOAD_ALLOW_INSECURE_ORIGIN: undefined,
    })

    expect(() => getServerSideURL()).toThrow()
  })

  it('accepts a real public HTTPS origin and strips the trailing slash', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: 'https://aau.edu.example/',
      PAYLOAD_ALLOW_INSECURE_ORIGIN: undefined,
    })

    expect(getServerSideURL()).toBe('https://aau.edu.example')
    expect(isSecureServerOrigin()).toBe(true)
  })

  it('does not enforce the production origin during `next build`', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
      NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000',
    })

    // The image builder has no production origin secret and must not need one.
    expect(getServerSideURL()).toBe('http://localhost:3000')
    expect(isSecureServerOrigin()).toBe(false)
  })

  it('keeps the localhost fallback outside production', () => {
    setEnv({ NODE_ENV: 'development', NEXT_PHASE: undefined, NEXT_PUBLIC_SERVER_URL: undefined })

    expect(getServerSideURL()).toBe('http://localhost:3000')
    expect(isSecureServerOrigin()).toBe(false)
  })

  it('exposes the loopback escape hatch only behind an explicit opt-in', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
      PAYLOAD_ALLOW_INSECURE_ORIGIN: 'true',
    })

    expect(getServerSideURL()).toBe('http://127.0.0.1:3000')
    expect(isSecureServerOrigin()).toBe(false)
  })

  it('validates origins directly', () => {
    expect(() => assertPublicHttpsOrigin('https://aau.edu.example')).not.toThrow()
    expect(() => assertPublicHttpsOrigin(undefined)).toThrow()
  })
})

describe('production CORS/CSRF allow-list', () => {
  async function loadConfig(origin: string, nodeEnv: string) {
    setEnv({
      NODE_ENV: nodeEnv,
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_SERVER_URL: origin,
      PAYLOAD_ALLOW_INSECURE_ORIGIN: undefined,
      PAYLOAD_RUNTIME_MIGRATIONS: 'false',
      PAYLOAD_RUNTIME_BOOTSTRAP: 'false',
    })
    process.env.PAYLOAD_SECRET ||= 'unit-test-payload-secret-at-least-32-characters'

    const { default: config } = await import('@/payload.config')
    return await config
  }

  it('trusts only the real HTTPS origin in production', async () => {
    const config = await loadConfig('https://aau.edu.example', 'production')

    // Payload's own `sanitizeConfig` appends `serverURL` to `cors`, so the
    // resolved list can repeat the origin. The contract under test is which
    // origins are trusted, not how many times each appears.
    expect([...new Set(config.cors as string[])]).toEqual(['https://aau.edu.example'])
    expect([...new Set(config.csrf as string[])]).toEqual(['https://aau.edu.example'])
    expect(config.cors).not.toContain('http://localhost:3000')
    expect(config.csrf).not.toContain('http://localhost:3000')
  })
})

describe('runtime-mode gates', () => {
  it('treats an unset or non-exact flag as disabled', () => {
    setEnv({
      NEXT_PHASE: undefined,
      PAYLOAD_RUNTIME_MIGRATIONS: undefined,
      PAYLOAD_RUNTIME_BOOTSTRAP: 'TRUE',
    })

    expect(runtimeMigrationsEnabled()).toBe(false)
    expect(runtimeBootstrapEnabled()).toBe(false)
  })

  it('enables both only on the exact string "true" at runtime', () => {
    setEnv({
      NEXT_PHASE: undefined,
      PAYLOAD_RUNTIME_MIGRATIONS: 'true',
      PAYLOAD_RUNTIME_BOOTSTRAP: 'true',
    })

    expect(runtimeMigrationsEnabled()).toBe(true)
    expect(runtimeBootstrapEnabled()).toBe(true)
  })

  it('refuses to arm database-mutating startup work during `next build`', () => {
    setEnv({
      NEXT_PHASE: 'phase-production-build',
      PAYLOAD_RUNTIME_MIGRATIONS: 'true',
      PAYLOAD_RUNTIME_BOOTSTRAP: 'true',
    })

    expect(isNextBuildPhase()).toBe(true)
    expect(runtimeMigrationsEnabled()).toBe(false)
    expect(runtimeBootstrapEnabled()).toBe(false)
  })
})
