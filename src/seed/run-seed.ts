import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
} from 'payload'

import {
  SeedAlreadyRunningError,
  SeedConnectionError,
  withSeedAdvisoryLock,
} from './lib/advisory-lock'
import { deploymentName, isProductionDeployment } from './lib/deployment-environment'
import { createSeedOperations } from './lib/local-api'
import {
  emptySeedCounts,
  seedResetTargets,
  type SeedCounts,
  type SeedResetTarget,
  type SeedRunState,
  type SeedRunResult,
  type SeedStage,
  type SeedStageResult,
  type SeedStageSuccess,
} from './lib/types'
import { defaultSeedStages } from './stages'

export { SeedAlreadyRunningError, SeedConnectionError }

export interface RunSeedOptions {
  onStageResult?: (result: SeedStageResult) => void
  resetTarget?: SeedResetTarget
  stages?: readonly SeedStage[]
}

export async function runSeed(
  payload: Payload,
  options: RunSeedOptions = {},
): Promise<SeedRunResult> {
  const configuredStages = options.stages ?? defaultSeedStages
  validateStageConfiguration(configuredStages)
  assertSeedPermittedInThisDeployment(options)
  validateResetConfiguration(options)
  const stagesToRun = selectStages(configuredStages, options.resetTarget)

  return withSeedAdvisoryLock(payload, async () => {
    const stages: SeedStageSuccess[] = []
    const state: SeedRunState = {
      created: new Map(),
      initializeGlobals: parseInitializeGlobals(process.env.SEED_INITIALIZE_GLOBALS),
      ...(options.resetTarget ? { resetTarget: options.resetTarget } : {}),
    }

    for (const stage of stagesToRun) {
      stages.push(await runStage(payload, stage, state, options.onStageResult))
    }

    return stages.reduce<SeedRunResult>(
      (result, stage) => ({
        conflict: result.conflict + stage.conflict,
        created: result.created + stage.created,
        skipped: result.skipped + stage.skipped,
        stages: [...result.stages, stage],
        updated: result.updated + stage.updated,
      }),
      { ...emptySeedCounts(), stages: [] },
    )
  })
}

export function parseInitializeGlobals(value: string | undefined): boolean {
  return value === 'true'
}

function selectStages(
  stages: readonly SeedStage[],
  resetTarget: SeedResetTarget | undefined,
): readonly SeedStage[] {
  if (!resetTarget) return stages

  const owners = stages.filter((stage) => stage.resetTargets?.includes(resetTarget))
  if (owners.length !== 1) {
    throw new Error(
      `Content seed reset target "${resetTarget}" must have exactly one configured owning stage.`,
    )
  }
  return owners
}

async function runStage(
  payload: Payload,
  stage: SeedStage,
  state: SeedRunState,
  onResult?: (result: SeedStageResult) => void,
): Promise<SeedStageSuccess> {
  const context = {
    disableRevalidate: true,
    seed: true,
    ...(state.resetTarget ? { canonicalSeedReset: true } : {}),
  }
  const req = await createLocalReq(
    {
      context,
      fallbackLocale: false,
      ...(state.bootstrapAdmin ? { user: state.bootstrapAdmin } : {}),
    },
    payload,
  )
  let bootstrapUserCreated = false
  let bootstrapCapabilityActive = true

  try {
    const started = await initTransaction(req)
    if (!started) {
      throw new SeedTransactionError(stage.name)
    }

    let counts: SeedCounts
    try {
      counts = await stage.run({
        createBootstrapUser: async (args) => {
          if (!bootstrapCapabilityActive) {
            throw new SeedBootstrapUserError(
              `Seed stage "${stage.name}" bootstrap user capability is no longer active.`,
            )
          }
          if (!stage.allowBootstrapUser) {
            throw new SeedBootstrapUserError(
              `Seed stage "${stage.name}" is not allowed to create a bootstrap user.`,
            )
          }
          if (bootstrapUserCreated) {
            throw new SeedBootstrapUserError('A seed stage may create a bootstrap user only once.')
          }
          bootstrapUserCreated = true

          const bootstrapReq = await createLocalReq(
            {
              context: { ...context, allowUnauthenticatedBootstrap: true },
              fallbackLocale: false,
              req: { transactionID: req.transactionID },
            },
            payload,
          )

          try {
            return await createSeedOperations(payload, bootstrapReq).create({
              ...args,
              collection: 'users',
            })
          } finally {
            delete bootstrapReq.context.allowUnauthenticatedBootstrap
            delete bootstrapReq.transactionID
          }
        },
        operations: createSeedOperations(payload, req),
        payload,
        req,
        state,
      })
    } finally {
      bootstrapCapabilityActive = false
    }
    const result: SeedStageSuccess = {
      ...validateCounts(stage.name, counts),
      name: stage.name,
      status: 'success',
    }
    await commitTransaction(req)

    reportResult(onResult, result)
    return result
  } catch (error) {
    await killTransaction(req)
    reportResult(onResult, {
      ...emptySeedCounts(),
      error,
      name: stage.name,
      status: 'failed',
    })
    throw error
  }
}

export class SeedTransactionError extends Error {
  constructor(stageName: string) {
    super(`Seed stage "${stageName}" could not start a database transaction.`)
    this.name = 'SeedTransactionError'
  }
}

export class SeedBootstrapUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeedBootstrapUserError'
  }
}

function validateStageConfiguration(stages: readonly SeedStage[]): void {
  if (stages.filter((stage) => stage.allowBootstrapUser).length > 1) {
    throw new SeedBootstrapUserError(
      'Only one seed stage may allow bootstrap user creation per run.',
    )
  }
}

function validateResetConfiguration(options: RunSeedOptions): void {
  if (Object.prototype.hasOwnProperty.call(options, 'resetTargets')) {
    throw new Error('Content seed reset target must be singular.')
  }
  const resetTarget = options.resetTarget
  if (resetTarget !== undefined && typeof resetTarget !== 'string') {
    throw new Error('Content seed reset target must be singular.')
  }
  if (resetTarget !== undefined && !(seedResetTargets as readonly string[]).includes(resetTarget)) {
    throw new Error(`Unsupported content seed reset target: ${resetTarget}`)
  }
}

/**
 * Refuses ANY seed run against the production deployment — not only a reset.
 *
 * This guard used to live inside `validateResetConfiguration` and fire only
 * when `resetTarget` was set, which left the broad `full` seed reachable in
 * production through every caller that does not go through the one-shot
 * runner: `src/seed/run.ts` (`runSeed(payload)` at module load) and the
 * authenticated seed route both call `runSeed` directly. `seed.sh`,
 * `seed-entrypoint.sh` and `src/seed/one-shot.ts` each refuse production, but
 * none of them is on those two paths — so the canonical seed content could
 * still be written over production data.
 *
 * It lives HERE, at the single function every entry point must call, because
 * that is the only place the refusal cannot be walked around by adding a
 * caller. The outer refusals stay: they fail earlier and say more.
 *
 * Keyed on the DEPLOYMENT, not on NODE_ENV. The VPS runner sets
 * NODE_ENV=production in staging too — it is the same prebuilt artifact — so a
 * NODE_ENV check refused this in staging, the only place it is meant to run.
 * See src/seed/lib/deployment-environment.ts.
 */
function assertSeedPermittedInThisDeployment(options: RunSeedOptions): void {
  if (!isProductionDeployment()) return

  const what = options.resetTarget === undefined ? 'Content seed' : 'Content seed reset'
  throw new Error(
    `${what} is not permitted in production (deployment: ${deploymentName()}). ` +
      'Production content arrives through deploy/scripts/initialize-from-backup.sh, ' +
      'from a verified platform backup — never from the Seed.',
  )
}

function validateCounts(stageName: string, counts: SeedCounts): SeedCounts {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    throw new Error(
      `Seed stage "${stageName}" must return exactly created, updated, skipped, and conflict counts.`,
    )
  }

  const countNames = ['created', 'updated', 'skipped', 'conflict'] as const
  const keys = Object.keys(counts)
  if (
    keys.length !== countNames.length ||
    countNames.some((name) => !Object.prototype.hasOwnProperty.call(counts, name))
  ) {
    throw new Error(
      `Seed stage "${stageName}" must return exactly created, updated, skipped, and conflict counts.`,
    )
  }

  for (const name of countNames) {
    const value = counts[name]
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Seed stage "${stageName}" returned an invalid ${name} count.`)
    }
  }

  return counts
}

function reportResult(
  onResult: ((result: SeedStageResult) => void) | undefined,
  result: SeedStageResult,
): void {
  try {
    onResult?.(result)
  } catch {
    // Diagnostics must not change transaction outcomes or mask the stage failure.
  }
}
