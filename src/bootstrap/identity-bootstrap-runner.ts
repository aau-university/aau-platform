/**
 * Runs the identity bootstrap from `onInit` and makes its failure terminal.
 *
 * ── Why this module exists ────────────────────────────────────────────────
 *
 * Payload **swallows** errors thrown from `onInit`. Measured against Payload
 * 3.86.0 with the exact production runner image: an `onInit` that rejects logs
 *
 *     ERROR: Error running onInit function
 *
 * and initialization then completes normally. `getPayload()` resolves,
 * `/api/health` returns 503 only for the request that happened to trigger
 * initialization, and every request after that returns 200. A deployment whose
 * Super Admin bootstrap failed therefore passed the health gate and was cut
 * over as if it were good.
 *
 * That is the opposite of the required behaviour: an incompatible or
 * unconfigured identity state must keep the release from going live.
 *
 * ── What this does instead ────────────────────────────────────────────────
 *
 * 1. Records the failure in module state, so `/api/health` reports 503
 *    deterministically for every request rather than only the first one.
 * 2. Terminates the process, the same way Payload itself treats a failed
 *    production migration. The container never becomes healthy, so `deploy.sh`
 *    fails its health gate and does not complete the cutover.
 *
 * Terminating is only correct for a real runtime container, which is exactly
 * where `runtimeBootstrapEnabled()` is true — never during `next build`, and
 * never in a test or development process that has not opted in.
 */

import type { Payload } from 'payload'

import { ensureSystemRolesAndSuperAdmin } from './ensure-system-roles-and-super-admin'

let bootstrapFailure: Error | null = null

/** The recorded bootstrap failure, if the identity bootstrap has failed. */
export function getBootstrapFailure(): Error | null {
  return bootstrapFailure
}

/** Test-only: reset the recorded failure between cases. */
export function resetBootstrapFailure(): void {
  bootstrapFailure = null
}

export type IdentityBootstrapOptions = {
  /** Injected so tests can observe termination without killing the runner. */
  exit?: (code: number) => void
  /** Injected so tests can drive the failure path without a database. */
  ensure?: typeof ensureSystemRolesAndSuperAdmin
}

export async function runIdentityBootstrap(
  payload: Payload,
  options: IdentityBootstrapOptions = {},
): Promise<void> {
  const ensure = options.ensure ?? ensureSystemRolesAndSuperAdmin
  const exit = options.exit ?? ((code: number) => process.exit(code))

  try {
    const result = await ensure(payload)
    bootstrapFailure = null
    payload.logger.info({
      msg: 'Identity bootstrap completed',
      rolesCreated: result.rolesCreated,
      rolesExisting: result.rolesExisting,
      superAdmin: result.superAdmin,
    })
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))
    bootstrapFailure = failure

    // Logged before terminating so the reason is in the container logs the
    // operator reads after a refused deployment.
    payload.logger.error({
      err: { message: failure.message, name: failure.name },
      msg:
        'Identity bootstrap FAILED — refusing to serve. The application will not ' +
        'become healthy, so the deployment will not be completed.',
    })

    exit(1)
  }
}
