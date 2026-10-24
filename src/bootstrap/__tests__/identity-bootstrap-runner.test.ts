import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getBootstrapFailure,
  resetBootstrapFailure,
  runIdentityBootstrap,
} from '../identity-bootstrap-runner'

/**
 * Regression coverage for a measured production defect.
 *
 * Payload 3.86.0 swallows errors thrown from `onInit`: the runner image logged
 * `ERROR: Error running onInit function` for a bootstrap that could not find
 * its configured Super Admin, and then answered `/api/health` with 200 from
 * the second request onwards. A deployment with no usable Super Admin passed
 * the health gate and was cut over.
 *
 * These tests pin the two properties that make that impossible: the failure is
 * recorded so readiness stays negative, and the process is terminated so the
 * container never reports healthy at all.
 */

const logger = () =>
  ({ error: vi.fn(), info: vi.fn() }) as unknown as Payload['logger']

const fakePayload = () => ({ logger: logger() }) as unknown as Payload

describe('identity bootstrap runner', () => {
  beforeEach(() => {
    resetBootstrapFailure()
  })

  it('records nothing and never exits when the bootstrap succeeds', async () => {
    const exit = vi.fn()
    const payload = fakePayload()

    await runIdentityBootstrap(payload, {
      exit,
      ensure: vi.fn().mockResolvedValue({
        rolesCreated: ['super_admin'],
        rolesExisting: [],
        superAdmin: 'created',
      }),
    })

    expect(exit).not.toHaveBeenCalled()
    expect(getBootstrapFailure()).toBeNull()
    expect(payload.logger.info).toHaveBeenCalled()
  })

  it('terminates the process when the bootstrap fails', async () => {
    const exit = vi.fn()
    const payload = fakePayload()

    await runIdentityBootstrap(payload, {
      exit,
      ensure: vi.fn().mockRejectedValue(
        new Error('No user exists for INITIAL_ADMIN_EMAIL (never-created@aau.test)'),
      ),
    })

    // The decisive assertion: a swallowed onInit error must not leave the
    // process serving traffic.
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('records the failure so readiness can stay negative for every request', async () => {
    await runIdentityBootstrap(fakePayload(), {
      exit: vi.fn(),
      ensure: vi.fn().mockRejectedValue(new Error('incompatible Super Admin state')),
    })

    expect(getBootstrapFailure()?.message).toBe('incompatible Super Admin state')
  })

  it('logs the reason before terminating, so the operator can see it', async () => {
    const payload = fakePayload()

    await runIdentityBootstrap(payload, {
      exit: vi.fn(),
      ensure: vi.fn().mockRejectedValue(new Error('bootstrap blew up')),
    })

    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.objectContaining({ message: 'bootstrap blew up' }),
        msg: expect.stringContaining('refusing to serve'),
      }),
    )
  })

  it('normalizes a non-Error rejection rather than losing it', async () => {
    await runIdentityBootstrap(fakePayload(), {
      exit: vi.fn(),
      ensure: vi.fn().mockRejectedValue('a bare string'),
    })

    expect(getBootstrapFailure()).toBeInstanceOf(Error)
    expect(getBootstrapFailure()?.message).toBe('a bare string')
  })

  it('clears a previously recorded failure on a later success', async () => {
    const ensureFails = vi.fn().mockRejectedValue(new Error('first attempt failed'))
    await runIdentityBootstrap(fakePayload(), { exit: vi.fn(), ensure: ensureFails })
    expect(getBootstrapFailure()).not.toBeNull()

    await runIdentityBootstrap(fakePayload(), {
      exit: vi.fn(),
      ensure: vi.fn().mockResolvedValue({
        rolesCreated: [],
        rolesExisting: ['super_admin'],
        superAdmin: 'validated',
      }),
    })

    expect(getBootstrapFailure()).toBeNull()
  })
})
