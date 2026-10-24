/**
 * The explicit, one-shot canonical Seed operation.
 *
 * ── What this is NOT ──────────────────────────────────────────────────────
 * It is not a startup step, not an env toggle, and not an HTTP endpoint.
 * Normal application startup is: migrations -> minimal identity bootstrap ->
 * serve. The broad Seed writes canonical taxonomy, departments, programs,
 * academic and editorial content, navigation and globals; running it because a
 * container restarted would silently rewrite production content. So it is a
 * separate process that runs once, verifies, and exits.
 *
 * ── Modes ─────────────────────────────────────────────────────────────────
 *   full            Run the canonical Seed once against the current database.
 *                   Stages are idempotent create-or-skip; see the stage
 *                   definitions for which ones update existing records.
 *
 *   reset-and-full  Explicitly destructive: reset the disposable seeded state
 *                   first, then seed.
 *
 * "preserve" is not a mode here because it is the absence of this operation:
 * deploy normally and nothing broad is written.
 *
 * ── Both modes are STAGING-ONLY ───────────────────────────────────────────
 * Production content is the ACCEPTED migrated dataset. It arrives once, from a
 * verified platform backup, via `deploy/scripts/initialize-from-backup.sh`, and
 * afterwards it is edited by the university in the Admin panel. The canonical
 * Seed writes a DIFFERENT dataset — this repository's idea of the taxonomy,
 * departments, programs, editorial content, navigation and globals — so running
 * it against production would overlay repository fixtures onto real content
 * that nobody asked to have changed.
 *
 * `full` used to be reachable in production behind a typed confirmation
 * variable, for a "deliberate first-install content initialisation". That use
 * case no longer exists: initialization is the platform backup. So the
 * confirmation is gone rather than left lying around — a retired escape hatch
 * still named in the code reads as a supported one — and production is refused
 * outright.
 *
 * The check is on AAU_ENV, which the root-owned entrypoint derives from its own
 * installed path and the caller cannot set.
 */
import { realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { getPayload } from 'payload'

import { deploymentName, isProductionDeployment } from './lib/deployment-environment'
import { seedResetTargets, type SeedResetTarget } from './lib/types'
import { runSeed } from './run-seed'

type SeedMode = 'full' | 'reset-and-full'

export interface OneShotOptions {
  mode: SeedMode
  /** Human-readable deployment name, for logs and error messages. */
  environment: string
  /**
   * Whether this counts as production. Derived once, by the shared
   * fail-closed rule, rather than re-compared against the string
   * 'production' here — two independent definitions of "is this production"
   * is exactly how staging ended up unable to reset itself.
   */
  isProduction: boolean
}

export function parseOneShotArgs(argv: readonly string[], env: NodeJS.ProcessEnv): OneShotOptions {
  const modeIndex = argv.indexOf('--mode')
  const mode = modeIndex >= 0 ? argv[modeIndex + 1] : undefined

  if (mode !== 'full' && mode !== 'reset-and-full') {
    throw new Error(
      `--mode must be 'full' or 'reset-and-full'; received ${JSON.stringify(mode ?? null)}`,
    )
  }

  return {
    mode,
    environment: deploymentName(env),
    isProduction: isProductionDeployment(env),
  }
}

/**
 * Refuse the combinations that must never be possible, before Payload is even
 * initialised.
 */
export function assertSeedAllowed(options: OneShotOptions): void {
  const { isProduction } = options

  if (!isProduction) return

  // Named separately because it is the most destructive combination and
  // deserves its own diagnosis, not because it is refused for a different
  // reason — every mode is refused below.
  if (options.mode === 'reset-and-full') {
    throw new Error(
      'reset-and-full is a STAGING-ONLY operation and can never run against production. ' +
        'It deletes seeded content before re-creating it; in production that is data loss, ' +
        'not a reset. Restore from a backup instead if that is genuinely what is wanted.',
    )
  }

  throw new Error(
    'The canonical Seed is a STAGING-ONLY operation and can never run against production. ' +
      'It writes this repository\'s canonical content (taxonomy, departments, programs, ' +
      'academic and editorial content, navigation, globals) over whatever the university ' +
      'actually has. Production content is the accepted migrated dataset: it is installed ' +
      'once by deploy/scripts/initialize-from-backup.sh from a verified platform backup, ' +
      'and recovered with deploy/scripts/restore.sh. There is no confirmation string for ' +
      'this.',
  )
}

async function main(): Promise<void> {
  const options = parseOneShotArgs(process.argv.slice(2), process.env)
  assertSeedAllowed(options)

  console.log(`[seed] environment: ${options.environment}`)
  console.log(`[seed] mode: ${options.mode}`)

  // Imported HERE, not at module scope, so the refusals above are evaluated
  // before the Payload config is. A production `reset-and-full` must be refused
  // even on a host where the config cannot be built at all, and an operator who
  // mistypes the mode should get an argument error rather than a stack trace
  // from deep inside configuration loading.
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })

  try {
    if (options.mode === 'reset-and-full') {
      // Reset each disposable target first. `runSeed` already understands
      // reset targets and holds the advisory lock while it works.
      for (const target of seedResetTargets as readonly SeedResetTarget[]) {
        console.log(`[seed] resetting staging target: ${target}`)
        await runSeed(payload, { resetTarget: target })
      }
    }

    const result = await runSeed(payload)

    console.log(
      `[seed] completed: created=${result.created} updated=${result.updated} ` +
        `skipped=${result.skipped} conflict=${result.conflict}`,
    )

    // Verify rather than assume. A Seed that created nothing AND updated
    // nothing on a database that has no canonical Roles has not done its job —
    // it has silently no-opped, which is the failure mode worth catching.
    const roles = await payload.count({ collection: 'roles', overrideAccess: true })
    if (roles.totalDocs === 0) {
      throw new Error('Seed reported success but no Roles exist; refusing to report success.')
    }
    console.log(`[seed] verified: ${roles.totalDocs} roles present`)
  } finally {
    await payload.destroy()
  }
}

/**
 * Only run when this module IS the process entry point.
 *
 * Without this guard, merely importing the module to unit-test its
 * authorisation rules executed the seed and called process.exit — so the
 * refusals could not be tested, and any future import of this file from
 * application code would have silently started a seed run.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  try {
    if (import.meta.url === pathToFileURL(entry).href) return true
    // Compare again through realpath. `import.meta.url` is already resolved,
    // while `process.argv[1]` keeps whatever path the caller typed — so
    // invoking the runner through a SYMLINK made the two differ, main() was
    // skipped, and the process exited 0. deploy/scripts/seed.sh reads that exit
    // status as a completed seed, so a run that never happened reported
    // success. Resolving both sides makes the symlinked invocation run, which
    // is what the operator asked for.
    //
    // A genuine import (a unit test, or application code) still returns false
    // here, because argv[1] is then some OTHER file and no amount of resolving
    // makes it this one. That distinction is the point: importing must stay
    // side-effect free, which is what lets the refusals above be tested at all.
    // fileURLToPath, not `new URL(...).pathname`: pathname keeps the URL's
    // percent-encoding, so a path containing a space or any non-ASCII
    // character resolves to a name that does not exist, realpathSync throws
    // ENOENT, the catch below returns false — and this runner exits 0 without
    // seeding, which seed.sh reads as a completed seed. That is the exact
    // failure this function was written to remove, reintroduced by the
    // conversion.
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isEntryPoint()) {
  main().then(
    () => {
      process.exit(0)
    },
    (error: unknown) => {
      console.error(`[seed] FAILED: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error && error.stack) console.error(error.stack)
      // Non-zero exit is the contract the host script relies on.
      process.exit(1)
    },
  )
}
