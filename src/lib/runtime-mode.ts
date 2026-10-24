/**
 * Runtime-mode gates for behaviour that must happen inside the production
 * *container*, never during `next build`.
 *
 * `next build` evaluates `src/payload.config.ts` with `NODE_ENV=production`,
 * and Next's static generation can initialize Payload through the Local API.
 * Neither of those has (or should have) production database credentials, so
 * database-mutating startup behaviour — Payload `prodMigrations` and the
 * identity bootstrap — is opted into explicitly by the runtime environment
 * instead of being inferred from `NODE_ENV`.
 *
 * The contract is deliberately fail-closed in both directions:
 *
 *   - the flag must be the exact string `'true'`;
 *   - it is ignored outright while Next reports a build phase.
 *
 * `docker-compose.vps.yml` sets both flags to `true`; the `builder` stage of
 * the Dockerfile pins both to `false`.
 */

const BUILD_PHASES = new Set([
  'phase-production-build',
  'phase-export',
])

/**
 * True while Next.js is compiling the application rather than serving it.
 *
 * Next sets `NEXT_PHASE` for the build/export processes. Any code path that
 * would touch the database must treat this as "not runtime".
 */
export function isNextBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE
  return typeof phase === 'string' && BUILD_PHASES.has(phase)
}

function runtimeFlagEnabled(name: string): boolean {
  if (isNextBuildPhase()) return false
  return process.env[name] === 'true'
}

/**
 * Whether Payload should apply pending migrations from the statically
 * imported migration list during initialization (`prodMigrations`).
 */
export function runtimeMigrationsEnabled(): boolean {
  return runtimeFlagEnabled('PAYLOAD_RUNTIME_MIGRATIONS')
}

/**
 * Whether `onInit` should ensure the canonical system Roles and the
 * configured Super Admin account exist.
 */
export function runtimeBootstrapEnabled(): boolean {
  return runtimeFlagEnabled('PAYLOAD_RUNTIME_BOOTSTRAP')
}
