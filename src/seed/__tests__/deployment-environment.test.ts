import { describe, expect, it } from 'vitest'

import { deploymentName, isProductionDeployment } from '../lib/deployment-environment'
import { assertSeedAllowed, parseOneShotArgs } from '../one-shot'

/**
 * The bug this file exists for: destructive-seed policy keyed on NODE_ENV.
 *
 * The VPS runner image sets NODE_ENV=production in EVERY deployment, staging
 * included — staging runs the identical prebuilt artifact, which is the whole
 * point of it. So `reset-and-full`, a staging-only operation, refused itself
 * in staging while adding nothing in production.
 */
describe('isProductionDeployment', () => {
  it('treats staging as non-production even though NODE_ENV is production', () => {
    // This is the exact environment the staging VPS runner presents.
    expect(isProductionDeployment({ AAU_ENV: 'staging', NODE_ENV: 'production' })).toBe(false)
  })

  it('treats production as production', () => {
    expect(isProductionDeployment({ AAU_ENV: 'production', NODE_ENV: 'production' })).toBe(true)
  })

  it('fails closed when AAU_ENV is unset in an optimised build', () => {
    expect(isProductionDeployment({ NODE_ENV: 'production' })).toBe(true)
  })

  it('fails closed when AAU_ENV is empty or whitespace', () => {
    expect(isProductionDeployment({ AAU_ENV: '', NODE_ENV: 'production' })).toBe(true)
    expect(isProductionDeployment({ AAU_ENV: '   ', NODE_ENV: 'production' })).toBe(true)
  })

  it('fails closed on an UNKNOWN deployment name rather than reading it as safe', () => {
    // A typo must never mean "not production, therefore safe to destroy".
    for (const typo of ['stagin', 'prod', 'Production', 'STAGING', 'staging2']) {
      expect(isProductionDeployment({ AAU_ENV: typo, NODE_ENV: 'production' })).toBe(true)
    }
  })

  it('does not treat a plain local dev process as production', () => {
    expect(isProductionDeployment({ NODE_ENV: 'development' })).toBe(false)
    expect(isProductionDeployment({ NODE_ENV: 'test' })).toBe(false)
  })

  it('names the deployment, and says so when the name was assumed', () => {
    expect(deploymentName({ AAU_ENV: 'staging', NODE_ENV: 'production' })).toBe('staging')
    expect(deploymentName({ NODE_ENV: 'production' })).toContain('assumed')
    expect(deploymentName({ AAU_ENV: 'prod', NODE_ENV: 'production' })).toContain('not a known')
  })
})

describe('one-shot seed authorisation', () => {
  const argv = ['--mode', 'reset-and-full']

  it('ALLOWS reset-and-full in staging under the real staging runner env', () => {
    const options = parseOneShotArgs(argv, { AAU_ENV: 'staging', NODE_ENV: 'production' })
    expect(options.isProduction).toBe(false)
    expect(() => assertSeedAllowed(options)).not.toThrow()
  })

  it('refuses reset-and-full in production', () => {
    const options = parseOneShotArgs(argv, { AAU_ENV: 'production', NODE_ENV: 'production' })
    expect(() => assertSeedAllowed(options)).toThrow(/STAGING-ONLY/)
  })

  it('refuses reset-and-full when AAU_ENV is absent', () => {
    const options = parseOneShotArgs(argv, { NODE_ENV: 'production' })
    expect(() => assertSeedAllowed(options)).toThrow(/STAGING-ONLY/)
  })

  it('refuses reset-and-full for an unknown deployment name', () => {
    const options = parseOneShotArgs(argv, { AAU_ENV: 'staging-2', NODE_ENV: 'production' })
    expect(() => assertSeedAllowed(options)).toThrow(/STAGING-ONLY/)
  })

  it('refuses a production full seed outright, with no confirmation to supply', () => {
    // Production content is the accepted migrated dataset, installed once from a
    // verified platform backup. `full` used to be reachable behind a typed
    // SEED_CONFIRM for a "first-install content initialisation"; that use case
    // no longer exists, so the escape hatch is gone rather than left lying
    // around. Supplying the old string must NOT re-open it.
    const options = parseOneShotArgs(['--mode', 'full'], {
      AAU_ENV: 'production',
      NODE_ENV: 'production',
    })
    expect(() => assertSeedAllowed(options)).toThrow(/STAGING-ONLY/)
    expect(() => assertSeedAllowed(options)).toThrow(/initialize-from-backup/)

    const withOldConfirmation = parseOneShotArgs(['--mode', 'full'], {
      AAU_ENV: 'production',
      NODE_ENV: 'production',
      SEED_CONFIRM: 'I-UNDERSTAND-THIS-WRITES-CANONICAL-CONTENT',
    })
    expect(() => assertSeedAllowed(withOldConfirmation)).toThrow(/STAGING-ONLY/)
  })

  it('refuses a full seed when AAU_ENV is absent, because that is assumed production', () => {
    const options = parseOneShotArgs(['--mode', 'full'], { NODE_ENV: 'production' })
    expect(() => assertSeedAllowed(options)).toThrow(/STAGING-ONLY/)
  })

  it('does NOT require confirmation for a staging full seed', () => {
    const options = parseOneShotArgs(['--mode', 'full'], {
      AAU_ENV: 'staging',
      NODE_ENV: 'production',
    })
    expect(() => assertSeedAllowed(options)).not.toThrow()
  })
})
