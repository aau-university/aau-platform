/**
 * Which DEPLOYMENT this process belongs to, as distinct from how Node is built.
 *
 * These are two different questions and conflating them broke staging.
 *
 * `NODE_ENV` answers "is this an optimised build?". The VPS runner image sets
 * `NODE_ENV=production` in EVERY environment, staging included — that is the
 * point of a source-free prebuilt runner: staging must exercise the identical
 * artifact production runs, or it is not a rehearsal of anything.
 *
 * `AAU_ENV` answers "which deployment is this?". The root-owned entrypoint
 * derives it from its own installed path (/srv/aau/{production,staging}/...),
 * so a caller cannot set it, spoof it, or pass it in over SSH.
 *
 * Destructive-operation policy must key on the SECOND question. Keying it on
 * `NODE_ENV` made `reset-and-full` refuse itself in staging — the one place it
 * is supposed to work — while providing no additional protection in
 * production, which `AAU_ENV` already covers.
 */

/** The deployments this codebase knows how to be. */
const KNOWN_DEPLOYMENTS = ['production', 'staging'] as const

/**
 * True when this process is running against the production deployment.
 *
 * Fails CLOSED in three ways, because the cost of being wrong in this
 * direction is a refused reset, and the cost of being wrong in the other
 * direction is deleting production content:
 *
 *   - `AAU_ENV` unset or empty in an optimised build -> production;
 *   - `AAU_ENV` set to anything NOT in KNOWN_DEPLOYMENTS -> production. A
 *     typo ("stagin", "prod") must not read as "not production and therefore
 *     safe to destroy";
 *   - only the exact string "staging" opts out.
 */
export function isProductionDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  const deployment = env.AAU_ENV?.trim()

  if (deployment === undefined || deployment === '') {
    // No deployment identity available. In an optimised build that is
    // indistinguishable from production, so assume the worst.
    return env.NODE_ENV === 'production'
  }

  if (!(KNOWN_DEPLOYMENTS as readonly string[]).includes(deployment)) return true

  return deployment === 'production'
}

/** The deployment name, for logging and for messages that must name it. */
export function deploymentName(env: NodeJS.ProcessEnv = process.env): string {
  const deployment = env.AAU_ENV?.trim()

  if (deployment === undefined || deployment === '') {
    return env.NODE_ENV === 'production' ? 'production (assumed: AAU_ENV is unset)' : 'local'
  }

  if (!(KNOWN_DEPLOYMENTS as readonly string[]).includes(deployment)) {
    return `production (assumed: AAU_ENV=${JSON.stringify(deployment)} is not a known deployment)`
  }

  return deployment
}
