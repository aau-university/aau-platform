/**
 * The explicit, one-shot canonical version backfill.
 *
 * ── What this is NOT ──────────────────────────────────────────────────────
 * It is not a startup step, not an `onInit` hook, not part of the identity
 * bootstrap, not a stage of the canonical Seed, and not something a normal
 * deploy runs. It is a separate process, invoked once by
 * `migration/scripts/neon-import.sh` against the SCRATCH database — the
 * migrated copy, before it is promoted — and never against a database that is
 * already serving.
 *
 * That separation is the point. The backfill writes a version row for every
 * document in five collections. Run by accident against a live database it
 * would be nearly harmless (it skips any document that already has a version)
 * and still wrong: a migration step that can fire on a container restart is a
 * migration step nobody can reason about.
 *
 * ── Runtime migrations and bootstrap are refused, not merely unset ────────
 * Payload applies `prodMigrations` inside `db.connect()` and runs the identity
 * bootstrap from `onInit`, both gated on runtime flags. This process opens a
 * Payload instance, so if those flags were true it would migrate the scratch
 * database and create roles and a super-admin account as a side effect of
 * counting versions. The caller sets them to false; this REFUSES if they are
 * not, because a side effect that depends on the caller remembering is a side
 * effect that eventually happens.
 *
 * ── Packaging ─────────────────────────────────────────────────────────────
 * Bundled to a single compiled `.mjs` inside the immutable application image by
 * `scripts/build-version-backfill-runner.mjs`, exactly like `seed-runner.mjs`,
 * so the VPS never receives the source tree or a TypeScript loader.
 */
import { pathToFileURL } from 'node:url'

import { getPayload } from 'payload'

import { runVersionBackfill } from './backfill'

export const BACKFILL_MODE = 'backfill-initial-versions'

export interface BackfillOneShotOptions {
  mode: typeof BACKFILL_MODE
}

/**
 * The mode is required and has exactly one accepted value. There is no default:
 * running the artifact with no arguments must fail at argument parsing rather
 * than start writing, which is also how `scripts/assert-runner-image.sh` proves
 * the bundle loads without touching a database.
 */
export function parseBackfillArgs(argv: readonly string[]): BackfillOneShotOptions {
  const modeIndex = argv.indexOf('--mode')
  const mode = modeIndex >= 0 ? argv[modeIndex + 1] : undefined

  if (mode !== BACKFILL_MODE) {
    throw new Error(
      `--mode must be '${BACKFILL_MODE}'; received ${JSON.stringify(mode ?? null)}`,
    )
  }

  return { mode }
}

/**
 * Only the two flags this refusal reads. Typed as a plain string map rather
 * than `NodeJS.ProcessEnv` so a test can pass the two variables under test
 * without having to construct a whole environment.
 */
export type BackfillEnvironment = Readonly<Record<string, string | undefined>>

/**
 * Refuse the combinations that must never be possible, before Payload is
 * initialised — so a wrong invocation cannot even open a database connection.
 */
export function assertBackfillAllowed(env: BackfillEnvironment): void {
  const enabled: string[] = []
  if (env.PAYLOAD_RUNTIME_MIGRATIONS === 'true') enabled.push('PAYLOAD_RUNTIME_MIGRATIONS')
  if (env.PAYLOAD_RUNTIME_BOOTSTRAP === 'true') enabled.push('PAYLOAD_RUNTIME_BOOTSTRAP')

  if (enabled.length > 0) {
    throw new Error(
      `${enabled.join(' and ')} must be 'false' for the version backfill. ` +
        'This operation opens a Payload instance purely to write version rows; with those ' +
        'flags enabled Payload would also apply migrations and create identity records as a ' +
        'side effect. Re-run with them explicitly disabled.',
    )
  }
}

async function main(): Promise<void> {
  parseBackfillArgs(process.argv.slice(2))
  assertBackfillAllowed(process.env)

  // Imported HERE, not at module scope, so the refusals above are evaluated
  // before the Payload config is: a mistyped mode should produce an argument
  // error, not a stack trace from inside configuration loading.
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })

  try {
    const result = await runVersionBackfill(payload)

    for (const entity of result.entities) {
      console.log(
        `[version-backfill] ${entity.kind} ${entity.slug}: ` +
          `examined=${entity.examined} created=${entity.created} skipped=${entity.skipped}`,
      )
    }
    console.log(
      `[version-backfill] completed: examined=${result.examined} ` +
        `created=${result.created} skipped=${result.skipped}`,
    )
  } finally {
    await payload.destroy()
  }
}

/**
 * Only run when this module IS the process entry point, for the same reason
 * `src/seed/one-shot.ts` has this guard: without it, importing the module to
 * unit-test its refusals would perform the backfill and exit the test runner.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  try {
    return import.meta.url === pathToFileURL(entry).href
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
      console.error(
        `[version-backfill] FAILED: ${error instanceof Error ? error.message : String(error)}`,
      )
      if (error instanceof Error && error.stack) console.error(error.stack)
      process.exit(1)
    },
  )
}
