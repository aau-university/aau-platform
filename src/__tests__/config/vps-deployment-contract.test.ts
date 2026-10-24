import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guards on the VPS deployment assets.
 *
 * The Docker simulation proves these files *work*; these tests prove they
 * keep the production-safety properties a future edit could quietly remove
 * without breaking any container.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')
const read = (relative: string) => readFileSync(path.resolve(REPO_ROOT, relative), 'utf8')

/**
 * Strip comment lines before a "must not contain" assertion.
 *
 * These files deliberately *document* the things they must not do ("never run
 * `docker system prune --volumes` here", "`read_only: true` is deliberately
 * NOT set"), so a naive match on the raw text would fail on the warning
 * rather than on a real regression.
 */
const withoutComments = (source: string) =>
  source
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')

/**
 * The `Refuse a manual publish attempt` step of build-publish.yml's `build`
 * job: its position among the job's steps, its `if:` condition (single-line or
 * a folded `>-` block) and its `run:` script.
 */
function manualPublishGuard(workflow: string) {
  const lines = workflow.split('\n')
  const jobStart = lines.findIndex((line) => line === '  build:')
  const jobEnd = lines.findIndex((line, i) => i > jobStart && /^ {2}\S/.test(line))
  const jobLines = lines.slice(jobStart, jobEnd === -1 ? undefined : jobEnd)
  const stepStarts = jobLines.flatMap((line, i) => (/^ {6}- /.test(line) ? [i] : []))
  const steps = stepStarts.map((start, n) => jobLines.slice(start, stepStarts[n + 1]))
  const stepIndex = steps.findIndex((step) => /name: Refuse a manual publish attempt$/.test(step[0]))
  if (stepIndex === -1) throw new Error('manual-publish guard step not found in the build job')
  const step = steps[stepIndex]

  const block = (key: string) => {
    const at = step.findIndex((line) => new RegExp(`^ {8}${key}:`).test(line))
    if (at === -1) return ''
    const inline = step[at].replace(new RegExp(`^ {8}${key}:\\s*`), '')
    if (!/^[>|]-?$/.test(inline)) return inline
    const body: string[] = []
    for (const line of step.slice(at + 1)) {
      if (!/^ {10}/.test(line) && line.trim() !== '') break
      body.push(line.trim())
    }
    return body.join(inline.startsWith('>') ? ' ' : '\n').trim()
  }
  return { stepIndex, condition: block('if'), run: block('run') }
}

/**
 * Evaluates the subset of the GitHub Actions expression language a guard uses:
 * context properties, string/boolean/null literals, `==`, `!=`, `!`, `&&`,
 * `||` and parentheses — with GitHub's semantics (case-insensitive string
 * equality; `&&`/`||` yield an operand; null, false, 0 and '' are falsy). An
 * identifier absent from `context` throws, so a scenario cannot silently leave
 * a referenced context undefined.
 */
function evaluateGuard(expression: string, context: Record<string, unknown>): boolean {
  const tokens = expression.match(/\|\||&&|==|!=|!|\(|\)|'(?:[^']|'')*'|[A-Za-z_][\w.-]*|\S/g) ?? []
  let pos = 0
  const peek = () => tokens[pos]
  const take = (expected?: string) => {
    const token = tokens[pos++]
    if (expected !== undefined && token !== expected) {
      throw new Error(`expected ${expected}, got ${token} in: ${expression}`)
    }
    return token
  }
  const truthy = (v: unknown) => !(v === null || v === false || v === 0 || v === '' || v === undefined)
  const equal = (a: unknown, b: unknown) =>
    typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b

  const primary = (): unknown => {
    const token = take()
    if (token === '(') {
      const value = or()
      take(')')
      return value
    }
    if (token === '!') return !truthy(primary())
    if (token?.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'")
    if (token === 'true') return true
    if (token === 'false') return false
    if (token === 'null') return null
    if (token && Object.hasOwn(context, token)) return context[token]
    throw new Error(`unknown identifier ${token} in: ${expression}`)
  }
  const comparison = (): unknown => {
    let left = primary()
    while (peek() === '==' || peek() === '!=') {
      const op = take()
      const right = primary()
      left = op === '==' ? equal(left, right) : !equal(left, right)
    }
    return left
  }
  const and = (): unknown => {
    let left = comparison()
    while (peek() === '&&') {
      take()
      const right = comparison()
      left = truthy(left) ? right : left
    }
    return left
  }
  const or = (): unknown => {
    let left = and()
    while (peek() === '||') {
      take()
      const right = and()
      left = truthy(left) ? left : right
    }
    return left
  }

  const value = or()
  if (pos !== tokens.length) throw new Error(`unparsed input at ${peek()} in: ${expression}`)
  return truthy(value)
}

const vpsCompose = read('deploy/docker-compose.vps.yml')
const deployScript = read('deploy/scripts/deploy.sh')
const backupScript = read('deploy/scripts/backup.sh')
const restoreScript = read('deploy/scripts/restore.sh')
const entrypointScript = read('deploy/scripts/deploy-entrypoint.sh')
const envExample = read('deploy/.env.production.example')
const dockerfile = read('Dockerfile')
const buildPublishWorkflow = read('.github/workflows/build-publish.yml')
const deployWorkflow = read('.github/workflows/deploy-production.yml')
const releaseWorkflow = read('.github/workflows/release-production.yml')
const publicVerifyWorkflow = read('.github/workflows/verify-production-public.yml')
const initializeScript = read('deploy/scripts/initialize-from-backup.sh')
const neonImportScript = read('migration/scripts/neon-import.sh')
const releaseGateWorkflow = read('.github/workflows/release-gate.yml')
const stagingWorkflow = read('.github/workflows/deploy-staging.yml')

describe('VPS runtime compose', () => {
  it('is runtime-only: no build context, no source-containing operations image', () => {
    expect(vpsCompose).not.toMatch(/build:/)
    expect(vpsCompose).not.toMatch(/target:\s*operations/)
    expect(vpsCompose).not.toMatch(/aau-payload-platform:operations/)
  })

  it('has no migrate or seed service — Payload migrates itself at runtime', () => {
    expect(vpsCompose).not.toMatch(/migrate-prod:/)
    expect(vpsCompose).not.toMatch(/seed-bootstrap-prod:/)
    expect(vpsCompose).toMatch(/PAYLOAD_RUNTIME_MIGRATIONS:\s*'true'/)
  })

  it('requires an immutable image reference to be supplied', () => {
    expect(vpsCompose).toMatch(/\$\{APP_IMAGE:\?/)
    // A floating tag must never be the identity of record.
    expect(vpsCompose).not.toMatch(/image:.*:latest/)
  })

  it('keeps PostgreSQL and Redis off the host network', () => {
    const services = vpsCompose.split(/^ {2}(?=\S)/m)
    for (const name of ['postgres-prod', 'redis-prod']) {
      const block = services.find((section) => section.startsWith(name))
      expect(block, `${name} service must exist`).toBeDefined()
      expect(block).not.toMatch(/^\s{4}ports:/m)
    }
  })

  it('isolates the data services on an internal network', () => {
    // Stronger than "no published port": an internal network has no gateway,
    // so PostgreSQL and Redis have no route off the host in either direction.
    expect(vpsCompose).toMatch(/^ {2}backend:\n {4}internal: true$/m)

    // Scanned line-by-line rather than matched as one regex: the `networks:`
    // blocks carry explanatory comments between the key and its entries.
    const serviceNetworks = (name: string): string[] => {
      const block = vpsCompose.split(/^ {2}(?=\S)/m).find((s) => s.startsWith(`${name}:`))
      expect(block, `${name} service must exist`).toBeDefined()

      const lines = block!.split('\n')
      const start = lines.findIndex((line) => line === '    networks:')
      expect(start, `${name} must declare explicit networks`).toBeGreaterThan(-1)

      const entries: string[] = []
      for (const line of lines.slice(start + 1)) {
        if (/^ {6}#/.test(line)) continue
        const entry = /^ {6}- (\S+)$/.exec(line)
        if (!entry) break
        entries.push(entry[1])
      }
      return entries
    }

    expect(serviceNetworks('postgres-prod')).toEqual(['backend'])
    expect(serviceNetworks('redis-prod')).toEqual(['backend'])
    // The app is the only bridge between the data services and the outside.
    expect(serviceNetworks('app-prod')).toEqual(['backend', 'frontend'])
  })

  it('binds the app to loopback only, on a per-environment port', () => {
    // The host port is now a variable so production (3000) and staging (13000)
    // can run side by side, but the 127.0.0.1 prefix is NOT a variable — it
    // must never become interpolatable, or an env file could publish the app
    // publicly and bypass the reverse proxy and CSF entirely.
    expect(vpsCompose).toMatch(/'127\.0\.0\.1:\$\{APP_HOST_PORT:-3000\}:3000'/)
    expect(vpsCompose).toMatch(/'127\.0\.0\.1:\$\{CANDIDATE_HOST_PORT:-3001\}:3000'/)
    expect(vpsCompose).not.toMatch(/'0\.0\.0\.0:/)
    expect(vpsCompose).not.toMatch(/'\$\{[A-Z_]*(HOST|BIND|ADDR)[A-Z_]*\}:\d/)
    expect(vpsCompose).not.toMatch(/^\s+- '\d+:3000'/m)
  })

  it('validates a candidate on a port no reverse proxy forwards to', () => {
    // Docker health status does not stop a proxy sending traffic to a port, and
    // Next starts listening before Payload has migrated. A candidate bound to
    // the stable port would therefore serve real users an unmigrated build.
    // Proven end to end by tests/docker/cutover-gating-drill.sh.
    expect(vpsCompose).toMatch(/app-candidate:/)
    expect(vpsCompose).toMatch(/profiles: \['candidate'\]/)
    // The candidate must never restart on its own: a crash-looping candidate
    // could apply further migrations after the rollback decision was made.
    const candidateBlock = vpsCompose.slice(vpsCompose.indexOf('app-candidate:'))
    expect(candidateBlock).toMatch(/restart: 'no'/)
  })

  it('has no default for APP_IMAGE anywhere', () => {
    // Release identity lives in the release-state file, not in configuration. A
    // default here — or an APP_IMAGE line in the env file — would let a bare
    // `docker compose up` silently resurrect a previous release months later.
    expect(vpsCompose).toMatch(/\$\{APP_IMAGE:\?/)
    expect(vpsCompose).not.toMatch(/\$\{APP_IMAGE:-/)
    expect(envExample).not.toMatch(/^\s*APP_IMAGE=/m)
  })

  it('requires Redis authentication and keeps the password out of argv', () => {
    // `internal: true` is not host isolation: the Docker host can reach
    // container IPs directly. And /proc/<pid>/cmdline is world-readable, so
    // `redis-server --requirepass <secret>` would disclose the password to any
    // local account on a host that also serves other cPanel users.
    expect(vpsCompose).toMatch(/REDIS_PASSWORD:\s*\$\{REDIS_PASSWORD:\?/)
    // The flag form must not be USED. It is named in the comment that explains
    // why, so assert against the executable content only.
    expect(withoutComments(vpsCompose)).not.toMatch(/--requirepass/)
    expect(vpsCompose).toMatch(/requirepass "%s"/)
    // The app must authenticate with the same credential, passed as DISCRETE
    // parts. A URI-assembled password breaks on '/', '#', '?' and '%'.
    expect(vpsCompose).toMatch(/REDIS_HOST: redis-prod/)
    expect(vpsCompose).toMatch(/REDIS_USERNAME: default/)
    expect(withoutComments(vpsCompose)).not.toMatch(/REDIS_URL:\s*redis:\/\//)
  })

  it('does not claim the internal network isolates services from the host', () => {
    // The host owns the bridge and can reach container IPs regardless. Claiming
    // otherwise would justify leaving Redis unauthenticated.
    expect(vpsCompose).toMatch(/does NOT mean[\s\S]{0,200}Docker HOST/)
    expect(vpsCompose).not.toMatch(/unreachable from the (Docker )?host/i)
  })

  it('uses the PostgreSQL 18+ volume target', () => {
    expect(vpsCompose).toMatch(/postgres-prod-data:\/var\/lib\/postgresql\b/)
    expect(vpsCompose).not.toMatch(/postgres-prod-data:\/var\/lib\/postgresql\/data/)
  })

  it('never runs Payload as a PostgreSQL superuser', () => {
    // The official image makes POSTGRES_USER a superuser, so the app must not
    // be handed that credential.
    expect(vpsCompose).toMatch(/POSTGRES_USER:\s*\$\{POSTGRES_ADMIN_USER/)
    const appBlock = vpsCompose.slice(vpsCompose.indexOf('app-prod:'))
    expect(appBlock).not.toMatch(/POSTGRES_ADMIN_PASSWORD/)
    expect(appBlock).not.toMatch(/POSTGRES_ADMIN_USER/)
  })

  it('pins production-unsafe switches off', () => {
    expect(vpsCompose).toMatch(/PAYLOAD_DB_PUSH:\s*'false'/)
    expect(vpsCompose).toMatch(/PAYLOAD_SEED_ENABLED:\s*'false'/)
    // The loopback-origin escape hatch is test-only and must never appear here.
    expect(vpsCompose).not.toMatch(/PAYLOAD_ALLOW_INSECURE_ORIGIN/)
  })

  it('bounds container logs', () => {
    expect(vpsCompose).toMatch(/driver:\s*local/)
    expect(vpsCompose).toMatch(/max-size:/)
  })

  it('applies container hardening that the app is compatible with', () => {
    expect(vpsCompose).toMatch(/no-new-privileges:true/)
    expect(vpsCompose).toMatch(/cap_drop:/)
    // read_only is deliberately NOT enabled: Next writes cache/temp files and
    // Payload writes local uploads.
    expect(withoutComments(vpsCompose)).not.toMatch(/read_only:\s*true/)
    // Never give the application the Docker socket.
    expect(withoutComments(vpsCompose)).not.toMatch(/docker\.sock/)
  })

  it('persists uploads outside the container writable layer', () => {
    expect(vpsCompose).toMatch(/UPLOADS_HOST_PATH.*:\/app\/uploads/)
    expect(vpsCompose).toMatch(/PAYLOAD_UPLOADS_DIR:\s*\/app\/uploads/)
  })

  it('gives the app a graceful shutdown window', () => {
    expect(vpsCompose).toMatch(/stop_grace_period:/)
    expect(vpsCompose).toMatch(/init:\s*true/)
  })
})

describe('deploy script', () => {
  it('deploys a resolved digest, not a mutable tag', () => {
    expect(deployScript).toMatch(/RepoDigests/)
    expect(deployScript).toMatch(/could not resolve a registry digest/)
  })

  it('serializes against every other destructive operation, not just other deploys', () => {
    // deploy, restore, standalone backup and seed all mutate the same cluster,
    // uploads tree and release state. A deploy-only lock left restore || backup
    // and restore || restore unguarded.
    for (const script of [deployScript, restoreScript, backupScript]) {
      expect(script).toMatch(/oplock_acquire "\$AAU_LOCK_FILE"/)
    }
    expect(oplockScript).toMatch(/flock/)
    // The nested case (deploy invoking backup) must use the exported handoff,
    // because a second flock on the same path from a child would deadlock.
    expect(oplockScript).toMatch(/AAU_OPLOCK_FILE/)
    expect(oplockScript).toMatch(/kill -0 "\$AAU_OPLOCK_PID"/)
  })

  it('blocks the cutover when the backup fails', () => {
    expect(deployScript).toMatch(/pre-cutover backup failed; refusing to change \$\{AAU_ENV\}/)
  })

  it('does not let the old release serve while the candidate migrates', () => {
    // Leaving the previous release up during migration makes the outage look
    // shorter and is wrong: once a migration applies, the old code runs against
    // a schema it was not built for, and anything it WRITES can produce rows
    // the new schema cannot represent. A deploy is therefore one continuous
    // maintenance window.
    expect(deployScript).toMatch(/RESTART_AFTER_QUIESCE=false/)
    expect(deployScript).toMatch(/entering the maintenance window/)
    expect(deployScript).toMatch(/Refusing to migrate underneath a live release/)
  })

  it('closes the window again when the failure is recoverable', () => {
    // A failed release must not become an indefinite outage. If the ledger did
    // not move, the previous release is still a correct pairing with the
    // database and is restarted.
    expect(deployScript).toMatch(/schema unchanged — restarting the previous release/)
    // And when the ledger DID move, the outage is deliberate and said to be so.
    expect(deployScript).toMatch(/A visible outage is the correct state here/)
  })

  it('a standalone backup still returns the service to its original state', () => {
    // deploy.sh opts out because it owns the lifecycle; every other caller must
    // get the app back, on every exit path.
    expect(backupScript).toMatch(/trap restore_service_state EXIT/)
    expect(backupScript).toMatch(/RESTART_AFTER_QUIESCE:-true/)
  })

  it('fails the deployment when the candidate never becomes healthy', () => {
    expect(deployScript).toMatch(/candidate failed its health gate/)
  })

  it('stops and PROVES the failed candidate stopped before reading the ledger', () => {
    // Time-of-check/time-of-use: reading the migration ledger while a candidate
    // is still crash-looping means the rollback decision can rest on evidence
    // that is already stale, because the candidate may migrate again in between.
    const stopIdx = deployScript.indexOf('stopping the failed candidate before deciding')
    const proofIdx = deployScript.indexOf('failed candidate confirmed stopped')
    const ledgerIdx = deployScript.indexOf('MIGRATIONS_AFTER="$(migration_state)"')
    expect(stopIdx).toBeGreaterThan(-1)
    expect(proofIdx).toBeGreaterThan(stopIdx)
    expect(ledgerIdx).toBeGreaterThan(proofIdx)
    // The shared stop-and-prove helper reports "STILL ACTIVE", not merely
    // "STILL RUNNING": a crash-looping container sits in `restarting`, which a
    // running-only check would miss, so the freeze proof covers every active
    // docker state.
    expect(deployScript).toMatch(/STILL ACTIVE after 'compose stop'/)
  })

  it('never treats an UNREADABLE migration ledger as "unchanged"', () => {
    // A failed ledger read (rc 2 from migration_state) must route to an explicit
    // UNKNOWN branch that leaves the service stopped and does NOT auto-restart
    // the previous image — restarting an old build against a possibly-migrated
    // schema is exactly what turns an outage into corruption. It must never fall
    // through to the "schema unchanged, restart previous image" path.
    expect(deployScript).toMatch(/migrations_after_rc=0\s*\n\s*MIGRATIONS_AFTER="\$\(migration_state\)" \|\| migrations_after_rc=\$\?/)
    expect(deployScript).toMatch(/migration state is UNKNOWN; automatic rollback is unsafe/)
    expect(deployScript).toMatch(/migration state is UNKNOWN; \$\{AAU_ENV\} was not declared successful/)
    // migration_state itself distinguishes KNOWN-EMPTY from UNKNOWN: a missing
    // ledger table is empty (rc 0), only a failed query is UNKNOWN (rc 2).
    expect(deployScript).toMatch(/to_regclass\('public\.payload_migrations'\) IS NOT NULL/)
  })

  it('retains the previous image for rollback', () => {
    expect(deployScript).toMatch(/PREVIOUS_IMAGE/)
    expect(deployScript).toMatch(/STATE_FILE/)
  })

  it('never prunes volumes and never runs the broad Seed', () => {
    const executable = withoutComments(deployScript)
    expect(executable).not.toMatch(/docker system prune/)
    expect(executable).not.toMatch(/pnpm\s+seed/)
    expect(executable).not.toMatch(/--volumes/)
  })

  it('classifies first install from an EMPTY schema, not the ledger alone', () => {
    // A database with tables but no payload_migrations must be refused, not
    // silently treated as a first install that skips the backup gate.
    // Counting BASE TABLEs alone treated a database carrying views,
    // materialised views, sequences, functions, custom types or extra schemas
    // as pristine — skipping the backup gate and migrating onto unknown state.
    expect(deployScript).toMatch(/user_object_count/)
    expect(deployScript).not.toMatch(/public_table_count/)
    expect(deployScript).toMatch(/pg_class/)
    expect(deployScript).toMatch(/pg_proc/)
    expect(deployScript).toMatch(/pg_type/)
    expect(deployScript).toMatch(/pg_namespace/)
    expect(deployScript).toMatch(/relkind IN \('r','p','v','m','S','f'\)/)
    expect(deployScript).toMatch(/no payload_migrations ledger/)
    expect(deployScript).toMatch(/neither a clean first install nor a normal upgrade/)
  })

  it('restores the previous app to service if the pre-cutover backup fails', () => {
    // A failed SAFETY backup must never itself be an outage.
    expect(deployScript).toMatch(/RUNNING_APP_IMAGE=/)
    expect(deployScript).toMatch(/restoring the previous app/)
    expect(deployScript).toMatch(/previous app was restored to service/)
  })

  it('does not tell the operator to restore a nonexistent first-install backup', () => {
    // On first install there is no pre-cutover backup; the failure guidance must
    // not point at restore.sh.
    expect(deployScript).toMatch(/no pre-cutover backup for a first install — do NOT run restore\.sh/)
  })
})

describe('backup script', () => {
  it('verifies the dump is readable before reporting success', () => {
    expect(backupScript).toMatch(/pg_restore --list/)
    expect(backupScript).toMatch(/not readable by pg_restore; treating backup as failed/)
  })

  it('backs up uploads as well as the database', () => {
    expect(backupScript).toMatch(/uploads\.tar\.gz/)
  })

  it('never verifies an archive with `tar --test`', () => {
    // Measured: GNU tar's --test seeks past data blocks, so it reports success
    // on archives whose member contents are corrupt or truncated. The archive
    // must instead be decompressed and read end to end.
    expect(withoutComments(backupScript)).not.toMatch(/tar --test/)
    expect(backupScript).toMatch(/gzip --test/)
    expect(backupScript).toMatch(/tar --extract --gzip --file "\$uploads" --to-stdout/)
  })

  it('fails closed when required uploads are absent', () => {
    expect(backupScript).toMatch(/REQUIRE_UPLOADS/)
    expect(backupScript).toMatch(/configured uploads directory does not exist/)
    // The only sanctioned way to omit local uploads is an external
    // object-storage profile.
    expect(backupScript).toMatch(/S3_ENABLED/)
  })

  it('writes a manifest of required artifacts and checksums every file', () => {
    expect(backupScript).toMatch(/MANIFEST/)
    expect(backupScript).toMatch(/sha256sum -- \*/)
  })

  it('records whether the restore point is coherent', () => {
    expect(backupScript).toMatch(/QUIESCE_APP/)
    expect(backupScript).toMatch(/"consistency":/)
    expect(backupScript).toMatch(/"uploads_included":/)
    expect(backupScript).toMatch(/"applied_migrations":/)
  })

  it('claims quiesced ONLY after proving EVERY writer actually stopped', () => {
    // A stop that silently failed, or that stopped only app-prod while an
    // orphan app-candidate kept writing, must not be recorded as a coherent
    // snapshot. The freeze is defined once in lib/writers.sh and shared with
    // restore, and quiesced=true comes only after writers_freeze proves it.
    expect(backupScript).toMatch(/writers_freeze/)
    const freezeIdx = backupScript.indexOf('writers_freeze "$AAU_PROJECT_NAME"')
    const quiescedIdx = backupScript.indexOf('quiesced=true')
    expect(freezeIdx).toBeGreaterThan(-1)
    expect(quiescedIdx).toBeGreaterThan(freezeIdx)
  })
})

describe('restore script', () => {
  it('verifies the whole backup before doing anything destructive', () => {
    // `lastIndexOf`: the header comment describes the destructive section, so
    // matching the FIRST occurrence would slice at the top of the file and make
    // this assertion vacuous.
    const verificationEnd = restoreScript.lastIndexOf('DROP SCHEMA')
    expect(verificationEnd).toBeGreaterThan(-1)
    const beforeDestruction = restoreScript.slice(0, verificationEnd)

    expect(beforeDestruction).toMatch(/MANIFEST/)
    expect(beforeDestruction).toMatch(/sha256sum --check/)
    expect(beforeDestruction).toMatch(/gzip --test/)
    // The dump itself must be proven readable BEFORE the live schema is
    // dropped. Without this a corrupt dump is discovered only after DROP SCHEMA
    // has already destroyed the data it was meant to replace.
    expect(beforeDestruction).toMatch(/pg_restore --list/)
    expect(beforeDestruction).toMatch(/refusing to drop the live schema/)
    // The uploads must be fully staged before the destructive section too, or a
    // failed extraction leaves the database at T1 and the uploads at T2.
    expect(beforeDestruction).toMatch(/extracting uploads into a staging tree/)
    // And EVERY writer must be PROVEN unable to write — not just app-prod.
    // app-candidate and one-off seed containers reach the same database, via
    // the shared writers_freeze helper; a crash-looping container is
    // reconnecting rather than idle.
    expect(beforeDestruction).toMatch(/writers_freeze/)
    expect(beforeDestruction).toMatch(/all application containers confirmed stopped/)
    expect(beforeDestruction).toMatch(/pg_terminate_backend/)
    expect(beforeDestruction).not.toMatch(/compose stop app-prod \|\| true/)

    // The write freeze is a LOGIN barrier, not a CONNECT revoke: REVOKE CONNECT
    // does not stop the app reconnecting (CONNECT is granted to PUBLIC and the
    // role inherits it). LOGIN is disabled BEFORE the surviving sessions are
    // counted — terminating then counting is a TOCTOU race — and the freeze is
    // PROVEN with a real TCP login that must be refused before the schema drops.
    // No EXECUTED CONNECT revoke (the explanatory comments may mention it).
    expect(beforeDestruction).not.toMatch(/psql_admin "REVOKE CONNECT/)
    const disableAt = beforeDestruction.indexOf('set_app_login NOLOGIN >/dev/null')
    const countAt = beforeDestruction.indexOf('client backend')
    const proveAt = beforeDestruction.indexOf('freeze_probe="$(app_tcp_login_probe)"')
    expect(disableAt).toBeGreaterThan(-1)
    expect(countAt).toBeGreaterThan(disableAt)
    expect(proveAt).toBeGreaterThan(countAt)
    // ...and LOGIN is restored by a trap, so a failed restore cannot leave the
    // application permanently locked out of its own database.
    expect(restoreScript).toMatch(/trap restore_app_login EXIT/)
  })

  it('fails closed on a backup whose completeness cannot be established', () => {
    // Warn-and-continue on a missing MANIFEST/SHA256SUMS/metadata meant an
    // unverifiable backup could drop the live schema on the strength of a log
    // line nobody read at 3am.
    expect(restoreScript).toMatch(/ALLOW_UNVERIFIED_BACKUP/)
    expect(restoreScript).toMatch(/I-ACCEPT-POSSIBLE-DATA-LOSS/)
    expect(restoreScript).toMatch(/refusing to drop the live schema for a backup whose completeness/)
  })

  it('treats backup retention and image retention as one recovery contract', () => {
    // A retained backup whose paired application build has been pruned is not a
    // restore point.
    expect(restoreScript).toMatch(/Backup retention and IMAGE retention are ONE recovery contract/)
  })

  it('never passes --ignore-missing to sha256sum', () => {
    // Measured: `sha256sum --check --ignore-missing` EXITS 0 when a listed file
    // has been deleted, so it would pass over exactly the partially-deleted
    // backup the manifest exists to reject.
    expect(withoutComments(restoreScript)).not.toMatch(/--ignore-missing/)
  })

  it('refuses to restore a schema without the build that matches it', () => {
    expect(restoreScript).toMatch(/no application image recorded with this backup/)
    expect(restoreScript).toMatch(/RESTORE_IMAGE/)
  })

  it('refuses to restore a database without the uploads it was paired with', () => {
    expect(restoreScript).toMatch(
      /metadata says this restore point includes local uploads/,
    )
  })

  it('records the image it actually started as the deployed identity', () => {
    expect(restoreScript).toMatch(/mkdir -p "\$\(dirname "\$AAU_STATE_FILE"\)"/)
    expect(restoreScript).toMatch(/printf '%s\\n' "\$RESTORE_IMAGE" > "\$AAU_STATE_FILE"/)
  })

  it('reproduces the uploads snapshot via staging + swap, not an overlay', () => {
    // A plain in-place extract would re-add backed-up files but leave files
    // created AFTER the backup, so the restore point would not match the
    // snapshot. Extraction must target a staging dir that is then swapped in.
    expect(restoreScript).toMatch(/staging="\$\{UPLOADS_PATH\}\.restore\.\$\$"/)
    expect(restoreScript).toMatch(/tar --extract --gzip --file "\$\{SOURCE\}\/uploads\.tar\.gz" --directory "\$staging"/)
    // The live tree must NOT be the direct extraction target any more.
    expect(restoreScript).not.toMatch(/tar --extract[^\n]*--directory "\$UPLOADS_PATH"/)
    expect(restoreScript).toMatch(/untouched/)
  })

  it('recovers the live uploads tree if the second rename fails', () => {
    // The dangerous window: `mv live -> previous` succeeded and
    // `mv staging -> live` failed, so the live path does not exist. The old
    // fallback branch then operated on that missing path and the live uploads
    // were simply gone. It must be put back explicitly.
    expect(restoreScript).toMatch(/SECOND RENAME FAILED/)
    expect(restoreScript).toMatch(/mv "\$previous" "\$UPLOADS_PATH"/)
    expect(restoreScript).toMatch(/ORIGINAL uploads/)
    expect(restoreScript).toMatch(/Nothing has been deleted/)
  })
})

const forcedCommandScript = read('deploy/scripts/ssh-forced-command.sh')
const readEnvScript = read('deploy/scripts/read-env.sh')
const oplockScript = read('deploy/scripts/lib/oplock.sh')
const environmentScript = read('deploy/scripts/lib/environment.sh')
const stagingEnvExample = read('deploy/.env.staging.example')
const deployReadme = read('deploy/README.md')
const dependabot = read('.github/dependabot.yml')

describe('root deployment entrypoint', () => {
  it('accepts ONLY an immutable digest for the exact production repository', () => {
    // The repository is a hardcoded constant, never read from the environment —
    // a `${VAR:-default}` fallback could be overridden by env injection at a
    // root privilege boundary.
    // Digest-only shape: <repo>@sha256:<64 lowercase hex>. No tag branch.
    expect(entrypointScript).toMatch(/@sha256:\(\[a-f0-9\]\{64\}\)\$/)
    expect(entrypointScript).toMatch(/not an immutable digest reference/)

    // Channel: production and staging are DIFFERENT GHCR packages, so a staging
    // artifact is structurally incapable of entering the production path.
    expect(entrypointScript).toMatch(
      /readonly EXPECTED_REPO="ghcr\.io\/mohammed7779948484-tech\/aau-payload-platform"/,
    )
    expect(entrypointScript).toMatch(
      /readonly EXPECTED_REPO="ghcr\.io\/mohammed7779948484-tech\/aau-payload-platform-staging"/,
    )
    expect(entrypointScript).toMatch(/not the approved \$\{AAU_ENV\} channel/)
    // Never from the environment: at a root boundary a `${VAR:-default}` could
    // be overridden by injection.
    expect(entrypointScript).not.toMatch(/EXPECTED_REPO="\$\{/)
  })

  it('derives the environment from its own installed path, not from the caller', () => {
    // Taking it from an argument or $AAU_ENV would let the staging deploy key
    // request a production deployment through a sudo rule that is otherwise
    // exact.
    expect(entrypointScript).toMatch(/self="\$\(readlink -f "\$\{BASH_SOURCE\[0\]\}"\)"/)
    expect(entrypointScript).toMatch(/\/srv\/aau\/production\/deploy\/scripts\/deploy-entrypoint\.sh\)/)
    expect(entrypointScript).toMatch(/\/srv\/aau\/staging\/deploy\/scripts\/deploy-entrypoint\.sh\)/)
    expect(entrypointScript).toMatch(/unrecognised path/)
    expect(entrypointScript).not.toMatch(/DEPLOY_ROOT="\$\{DEPLOY_ROOT:-/)
  })

  it('requires an explicit consumer-side release policy', () => {
    // Repository + digest shape prove WHICH artifact, not that it is an
    // APPROVED release. A stolen deploy credential must not be able to redeploy
    // any historical digest that happens to still exist in the package.
    expect(entrypointScript).toMatch(/POLICY_FILE/)
    expect(entrypointScript).toMatch(/missing release policy file/)
    expect(entrypointScript).toMatch(/authorized_digests_file/)
    expect(entrypointScript).toMatch(/any-in-channel/)
    // The policy file must never be `source`d: it is root-owned, and sourcing a
    // config file is a root code-execution surface.
    expect(withoutComments(entrypointScript)).not.toMatch(/source "\$POLICY_FILE"/)
    expect(withoutComments(entrypointScript)).not.toMatch(/\.\s+"\$POLICY_FILE"/)
  })

  it('hands off with a clean environment so the caller cannot relocate the deploy', () => {
    // Without `env -i`, an SSH caller could export SKIP_BACKUP or DEPLOY_ROOT
    // and bypass the backup gate through a sudo rule that is otherwise exact.
    expect(entrypointScript).toMatch(/exec env -i/)
    expect(entrypointScript).toMatch(/deploy\.sh" "\$REQUESTED_IMAGE"/)
  })
})

describe('restricted SSH deploy account', () => {
  it('is provisioned with a REAL shell, never nologin', () => {
    // OpenSSH runs a remote command through the login shell (`$SHELL -c`), so
    // `nologin` refuses command execution too and the deploy would never run.
    // The provisioning detail now lives in the formal host contract, which is
    // what the infrastructure operator actually works from.
    expect(hostContract).toMatch(/Why not `nologin`/)
    expect(hostContract).toMatch(/real shell/)
    expect(hostContract).toMatch(/does \*\*not\*\* work/)
  })

  it('is constrained by an authorized_keys forced command', () => {
    expect(hostContract).toContain('command="/srv/aau/production/deploy/scripts/ssh-forced-command.sh"')
    expect(hostContract).toContain('no-agent-forwarding,no-port-forwarding,no-x11-forwarding,no-pty')
  })

  it('keeps the wildcard-free sudo rule for the entrypoint only', () => {
    expect(hostContract).toContain(
      'aau-deploy         ALL=(root) NOPASSWD: /srv/aau/production/deploy/scripts/deploy-entrypoint.sh',
    )
    // No wildcard anywhere in a sudo rule, and never the docker group.
    expect(hostContract).not.toMatch(/NOPASSWD:[^\n]*\*/)
    expect(hostContract).toContain('`docker` group')
    // Production deliberately gets no seed rule: deploying and writing
    // canonical content are different capabilities, and production content is
    // the accepted migrated dataset rather than this repository's fixtures.
    expect(hostContract).toContain('Production has no seed rule, and must not be given one')
    expect(hostContract).toContain('initialize-from-backup.sh')
  })

  it('CI sends only the image reference over SSH (the forced command does the rest)', () => {
    // A bare `-- "${IMAGE}"`, not a `sudo ... entrypoint '<img>'` command string.
    expect(deployWorkflow).toMatch(/-- "\$\{IMAGE\}"/)
    expect(withoutComments(deployWorkflow)).not.toMatch(/ssh[\s\S]{0,400}"sudo -n [^\n]*deploy-entrypoint/)
  })
})

describe('safe env reader (no shell-sourcing of the secret file)', () => {
  it('provides read-env.sh and the scripts use it instead of `source`', () => {
    expect(readEnvScript).toMatch(/read_env_var\(\)/)
    for (const [name, script] of [
      ['deploy.sh', deployScript],
      ['backup.sh', backupScript],
      ['restore.sh', restoreScript],
    ] as const) {
      expect(script, `${name} must source read-env.sh`).toMatch(/read-env\.sh/)
      // The dangerous pattern: shell-sourcing the operator's secret env file.
      expect(withoutComments(script), `${name} must not source the env file`).not.toMatch(
        /source "\$ENV_FILE"/,
      )
      expect(withoutComments(script), `${name} must not set -a; source the env file`).not.toMatch(
        /set -a; source "\$ENV_FILE"/,
      )
    }
  })
})

// ── Build and publish artifact identity ────────────────────────────────────
// `NEXT_PUBLIC_SERVER_URL` is inlined into the client bundle by `next build`,
// so the git SHA alone does NOT identify a runner image: two images built from
// one commit for different origins are different artifacts. These guards keep
// a future edit from making the production tag reachable by a non-production
// build.
describe('build/publish workflow', () => {
  it('refuses to publish an image built for a non-production origin', () => {
    expect(buildPublishWorkflow).toMatch(/publishing requires an explicit https:\/\/ server_url/)
    expect(buildPublishWorkflow).toMatch(/\*\.invalid\|\*\.invalid\/\*\|\*localhost\*\|\*127\.0\.0\.1\*/)
    expect(buildPublishWorkflow).toMatch(/refusing to publish an image built for the non-production origin/)
  })

  it('keeps unpublished validation builds on a separate tag identity', () => {
    expect(buildPublishWorkflow).toMatch(/prefix=validation-/)
    // Both published tags must interpolate the prefix, or a validation build
    // could occupy the production tag for the same SHA.
    const tagLines = buildPublishWorkflow
      .split('\n')
      .filter((line) => line.includes('steps.identity.outputs.name }}:'))
    expect(tagLines.length).toBeGreaterThan(0)
    for (const line of tagLines) {
      expect(line, `tag must carry the identity prefix: ${line}`).toMatch(
        /steps\.origin\.outputs\.prefix/,
      )
    }
  })

  it('asserts the built image really carries the origin it was built for', () => {
    expect(buildPublishWorkflow).toMatch(/image does not contain the expected baked origin/)
  })

  it('only ever builds and publishes the source-free runner target', () => {
    const executable = withoutComments(buildPublishWorkflow)
    expect(executable).toMatch(/target:\s*runner/)
    expect(executable).not.toMatch(/target:\s*operations/)
    expect(buildPublishWorkflow).toMatch(/the operations image was about to be published/)
    expect(buildPublishWorkflow).toMatch(/assert-runner-image\.sh/)
  })

  it('verifies the provenance attestation rather than only creating one', () => {
    expect(buildPublishWorkflow).toMatch(/gh attestation verify/)
    expect(buildPublishWorkflow).toMatch(/--signer-workflow/)
    expect(buildPublishWorkflow).toMatch(/published image failed attestation verification/)
  })

  it('never bakes a secret into the image as a build argument', () => {
    const buildArgs = buildPublishWorkflow.slice(
      buildPublishWorkflow.indexOf('build-args:'),
      buildPublishWorkflow.indexOf('cache-from:'),
    )
    // Build args are recorded verbatim in SLSA provenance and image history.
    expect(buildArgs).not.toMatch(/SECRET|PASSWORD|DATABASE_URI|TOKEN/)
  })

  it('exposes server_url on workflow_dispatch so a manual publish is possible', () => {
    // Without a server_url input, a manual `workflow_dispatch` with publish=true
    // defaults to the .invalid validation origin, which the publish guard
    // (correctly) refuses — making the documented manual publish impossible.
    const dispatch = buildPublishWorkflow.slice(
      buildPublishWorkflow.indexOf('workflow_dispatch:'),
      buildPublishWorkflow.indexOf('workflow_call:'),
    )
    expect(dispatch).toMatch(/server_url:/)
  })
})

describe('workflow supply chain', () => {
  // A pinned reference carries a trailing `# v4` version comment, so the
  // capture must stop at the reference and not require end-of-line — an
  // end-anchored pattern silently matches nothing and asserts nothing.
  const uses = (source: string) =>
    [...source.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map((match) => match[1])

  // EVERY workflow, enumerated from disk rather than listed by hand. The
  // hand-written list omitted simulation-public-media.yml, which was therefore
  // free to use mutable `@v4` tags while this test stayed green — a guard that
  // covers a fixed subset of a growing directory stops covering it.
  const workflowDir = '.github/workflows'
  const workflowFiles = readdirSync(path.resolve(REPO_ROOT, workflowDir))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort()

  const externalActions = workflowFiles
    .flatMap((name) => uses(read(`${workflowDir}/${name}`)))
    // Reusable workflows in this repository are referenced by path and run at
    // the commit the caller already resolved.
    .filter((reference) => !reference.startsWith('./'))

  it('pins every third-party action to a full-length commit SHA', () => {
    // Guards against the regex above quietly matching nothing.
    expect(externalActions.length).toBeGreaterThanOrEqual(8)
    for (const reference of externalActions) {
      const version = reference.split('@')[1]
      expect(version, `action must be pinned by SHA: ${reference}`).toMatch(/^[0-9a-f]{40}$/)
    }
  })

  it('records which release each pinned SHA came from', () => {
    for (const workflow of [
      buildPublishWorkflow,
      deployWorkflow,
      releaseWorkflow,
      publicVerifyWorkflow,
      stagingWorkflow,
      releaseGateWorkflow,
    ]) {
      const pinned = workflow
        .split('\n')
        .filter((line) => /uses:\s*[^.\s]/.test(line) && !line.includes('./.github'))
      for (const line of pinned) {
        expect(line, `pinned action needs a version comment: ${line.trim()}`).toMatch(
          /@[0-9a-f]{40}\s+#\s*v?\d/,
        )
      }
    }
  })

  it('keeps Dockerfile AND the vps compose digests moving via Dependabot', () => {
    // The `docker` ecosystem is directory-scoped. The production Postgres/Redis
    // digests live in deploy/docker-compose.vps.yml, so a `/deploy` entry is
    // required or those pins would never get update PRs.
    const dockerBlocks = dependabot.match(/package-ecosystem:\s*docker[\s\S]*?(?=package-ecosystem:|$)/g) ?? []
    const dirs = dockerBlocks
      .map((block) => /directory:\s*(\S+)/.exec(block)?.[1])
      .filter(Boolean)
    expect(dirs).toContain('/')
    expect(dirs).toContain('/deploy')
  })
})

describe('production release workflow (prepare)', () => {
  it('resolves the requested ref to one immutable SHA and gates it', () => {
    expect(releaseWorkflow).toMatch(/could not resolve '.*' to a commit SHA/)
    expect(releaseWorkflow).toMatch(/uses:\s*\.\/\.github\/workflows\/release-gate\.yml/)
  })

  it('authorizes the resolved SHA against a configured release lineage', () => {
    // An Environment branch rule constrains the ref the RUN started from, not
    // a custom `ref` input, so containment has to be checked explicitly.
    expect(releaseWorkflow).toMatch(/git merge-base --is-ancestor/)
    expect(releaseWorkflow).toMatch(/PRODUCTION_RELEASE_REF/)
    expect(releaseWorkflow).toMatch(/is NOT contained in the release ref/)
    // Missing policy must deny, never default to authorized.
    expect(releaseWorkflow).toMatch(/authorized=false/)
    expect(releaseWorkflow).toMatch(/the resolved SHA was not authorized against a release lineage/)
  })

  it('publishes a production image ONLY after the gated authorize job', () => {
    // A job DEPENDENCY on `authorize`, which carries the production Environment
    // and the typed confirmation — so approval precedes publication rather than
    // following it.
    const buildJob = releaseWorkflow.slice(
      releaseWorkflow.indexOf('  build:'),
      releaseWorkflow.indexOf('  record:'),
    )
    expect(buildJob).toContain('needs: [resolve, release-gate, authorize]')
    expect(buildJob).toContain('publish: true')
    expect(buildJob).toContain('channel: production')
  })

  it('stops at publication and hands the operator the exact digest', () => {
    // Preparation must not cut over. Recording the digest in the host
    // allow-list happens between the two, which is the whole reason they are
    // separate workflows.
    expect(withoutComments(releaseWorkflow)).not.toMatch(/ssh -i/)
    expect(releaseWorkflow).toMatch(/authorized-releases/)
    expect(releaseWorkflow).toMatch(/Nothing has been deployed/)
  })
})

describe('production deploy workflow', () => {
  it('deploys a published digest and never builds one', () => {
    // The artifact that was gated, inspected and authorized must be
    // byte-for-byte the artifact that runs. A rebuild here would produce a
    // different digest — the image is not bit-reproducible — and that digest
    // would not be the one an operator recorded in the host allow-list.
    expect(withoutComments(deployWorkflow)).not.toMatch(/build-publish\.yml/)
    expect(withoutComments(deployWorkflow)).not.toMatch(/publish: true/)
    expect(deployWorkflow).toMatch(/digest:/)
  })

  it('proves the digest is a production-channel artifact before anything moves', () => {
    // Shape: an immutable digest, never a tag.
    expect(deployWorkflow).toMatch(/\[a-f0-9\]\{64\}/)
    // Channel: it must exist in the PRODUCTION package. The staging package is
    // a different name, so a staging digest cannot resolve here.
    expect(deployWorkflow).toMatch(/docker pull "\$image"/)
    expect(deployWorkflow).toMatch(/could not be pulled/)
  })

  it('re-derives the commit from the ARTIFACT, not from the dispatch input', () => {
    // An operator types a digest, not a commit. Reading the revision label off
    // the pulled image is what makes the lineage check unforgeable: it
    // authorizes the commit that actually built the artifact.
    expect(deployWorkflow).toMatch(/org\.opencontainers\.image\.revision/)
    expect(deployWorkflow).toMatch(/git merge-base --is-ancestor "\$REVISION"/)
    expect(deployWorkflow).toMatch(/PRODUCTION_RELEASE_REF/)
    expect(deployWorkflow).toMatch(/authorized=false/)
  })

  it('sends the immutable digest to the forced-command account, not a shell command', () => {
    expect(deployWorkflow).toMatch(/IMAGE: \$\{\{ needs\.verify\.outputs\.image \}\}/)
    // The forced command on the host does the sudo; the workflow sends only the
    // image reference. It must NOT ship a `sudo ...` command string, and never a
    // root login shell.
    expect(deployWorkflow).toMatch(/-- "\$\{IMAGE\}"/)
    expect(withoutComments(deployWorkflow)).not.toMatch(/ssh[\s\S]{0,400}sudo -n[^\n]*deploy-entrypoint/)
    expect(deployWorkflow).not.toMatch(/sudo\s+(-n\s+)?(su|bash|sh)\b/)
  })

  it('reaches LOCAL READY without treating an unrouted domain as a failure', () => {
    // The first production release is promoted onto the host's loopback port
    // before DNS moves. Probing the public origin then would fail a working
    // release, and the only "fix" would be to redeploy the same image.
    expect(deployWorkflow).toMatch(/PRODUCTION_PUBLIC_READY == 'true'/)
    expect(deployWorkflow).toMatch(/PRODUCTION LOCAL READY/)
    expect(deployWorkflow).toMatch(/PRODUCTION LIVE/)
    // A skipped probe must never read as a passed one.
    expect(deployWorkflow).toMatch(/was skipped rather than failed/)
  })

  it('offers a public check that does not redeploy anything', () => {
    // The post-DNS acceptance path. It must be reachable without a maintenance
    // window, a backup or a promotion, because none of those can change a DNS
    // record.
    expect(publicVerifyWorkflow).toMatch(/workflow_dispatch:/)
    expect(publicVerifyWorkflow).toMatch(/PRODUCTION_SERVER_URL/)
    expect(publicVerifyWorkflow).toMatch(/PRODUCTION LIVE/)
    expect(withoutComments(publicVerifyWorkflow)).not.toMatch(/ssh |docker |build-publish/)
    expect(publicVerifyWorkflow).toMatch(/Do NOT redeploy to 'fix' this/)
  })

  it('pins the VPS host key instead of trusting it on first use', () => {
    expect(deployWorkflow).toMatch(/StrictHostKeyChecking=yes/)
    // known_hosts comes from the out-of-band secret, and the deploy is refused
    // when that secret is absent rather than falling back.
    expect(deployWorkflow).toMatch(/"\$SSH_KNOWN_HOSTS" > ~\/\.ssh\/known_hosts/)
    expect(deployWorkflow).toMatch(/VPS_SSH_KNOWN_HOSTS is not set/)
    // `ssh-keyscan` may be *named* in the operator instructions; it must never
    // be what populates known_hosts, which is trust-on-first-use every run.
    expect(deployWorkflow).not.toMatch(/ssh-keyscan[^\n]*>[^\n]*known_hosts/)
    expect(withoutComments(deployWorkflow)).not.toMatch(/StrictHostKeyChecking=(no|accept-new)/)
  })

  it('refuses to report a cutover that did not happen', () => {
    expect(deployWorkflow).toMatch(/PRODUCTION_VPS_READY is not set — refusing to fake a deployment/)
  })
})

describe('production env example', () => {
  it('carries placeholders rather than real credentials', () => {
    // Every credential-shaped value must still be an obvious placeholder.
    const credentialLines = envExample
      .split('\n')
      .filter((line) => /^[A-Z_]*(PASSWORD|SECRET)[A-Z_]*=/.test(line))

    expect(credentialLines.length).toBeGreaterThan(0)
    for (const line of credentialLines) {
      expect(line, `credential must be a placeholder: ${line}`).toMatch(/REPLACE/)
    }

    // The application password must appear exactly ONCE. It used to be written
    // three times — as APP_DB_PASSWORD and inside two URIs — in two different
    // encodings, so a password containing a URI-reserved character was correct
    // in one place and broken in the others with nothing detecting the drift.
    expect(envExample).not.toMatch(/^\s*DATABASE_URI=/m)
    expect(envExample).not.toMatch(/^\s*DATABASE_DIRECT_URI=/m)
    expect(envExample).not.toMatch(/postgresql:\/\/[^\n]*:[^\n]*@/)

    // Every value must be single-quoted: measured, that is the only env-file
    // form compose passes through byte for byte.
    for (const line of envExample.split('\n').filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l))) {
      expect(line, `env value must be single-quoted: ${line}`).toMatch(/^[A-Z0-9_]+='[^']*'$/)
    }

    // There is no image reference here at all any more: release identity lives
    // in the release-state file, and the env file holds only configuration.
    expect(envExample).not.toMatch(/^\s*APP_IMAGE=/m)
    expect(envExample).toMatch(/DELIBERATELY ABSENT: there is no APP_IMAGE here/)
  })

  it('applies the same contract to the staging env example', () => {
    for (const line of stagingEnvExample.split('\n').filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l))) {
      expect(line, `staging env value must be single-quoted: ${line}`).toMatch(/^[A-Z0-9_]+='[^']*'$/)
    }
    expect(stagingEnvExample).not.toMatch(/^\s*APP_IMAGE=/m)
    for (const line of stagingEnvExample
      .split('\n')
      .filter((l) => /^[A-Z_]*(PASSWORD|SECRET)[A-Z_]*=/.test(l))) {
      expect(line, `staging credential must be a placeholder: ${line}`).toMatch(/REPLACE/)
    }
    // Staging bounds its resources; the host it shares with production also
    // runs cPanel, Exim, Dovecot, PowerDNS and MariaDB.
    expect(stagingEnvExample).toMatch(/^APP_MEM_LIMIT='/m)
    expect(stagingEnvExample).toMatch(/^POSTGRES_MEM_LIMIT='/m)
    // Production limits are deliberately NOT invented without measurement.
    expect(envExample).not.toMatch(/^APP_MEM_LIMIT=/m)
  })

  it('documents that the public origin is a build argument, not runtime config', () => {
    expect(envExample).toMatch(/NEXT_PUBLIC_SERVER_URL.*inlined at `next build`/s)
  })
})

describe('Dockerfile', () => {
  it('declares the BuildKit frontend explicitly', () => {
    expect(dockerfile.startsWith('# syntax=docker/dockerfile:1')).toBe(true)
  })

  it('never declares a production secret as ARG or ENV', () => {
    // A disposable build-only secret may be scoped to a RUN command, but no
    // secret-named ENV/ARG may persist in an image layer.
    expect(dockerfile).not.toMatch(/^ENV PAYLOAD_SECRET=/m)
    expect(dockerfile).not.toMatch(/^ARG PAYLOAD_SECRET/m)
    expect(dockerfile).not.toMatch(/^(ENV|ARG) (DATABASE_URI|DATABASE_DIRECT_URI|POSTGRES_PASSWORD|INITIAL_ADMIN_PASSWORD)/m)
  })

  it('pins the runtime-only flags off in the builder stage', () => {
    expect(dockerfile).toMatch(/ENV PAYLOAD_RUNTIME_MIGRATIONS=false/)
    expect(dockerfile).toMatch(/ENV PAYLOAD_RUNTIME_BOOTSTRAP=false/)
  })

  it('runs the final image as a non-root user', () => {
    expect(dockerfile).toMatch(/USER nextjs/)
  })

  it('pins every base image to an immutable digest', () => {
    const fromLines = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1])
    expect(fromLines.length).toBeGreaterThan(0)
    for (const image of fromLines) {
      // Stages built on earlier stages in this file are already pinned by it.
      if (['base', 'deps', 'builder'].includes(image)) continue
      expect(image, `base image must be digest-pinned: ${image}`).toMatch(/@sha256:[0-9a-f]{64}$/)
    }
  })

  it('treats the public origin as a build argument, not runtime config', () => {
    // `next build` inlines NEXT_PUBLIC_*, so the origin has to enter at build
    // time — and it must be an ARG the CI workflow supplies, never a hardcoded
    // production hostname.
    expect(dockerfile).toMatch(/^ARG NEXT_PUBLIC_SERVER_URL=/m)
    expect(dockerfile).toMatch(/^ENV NEXT_PUBLIC_SERVER_URL=\$NEXT_PUBLIC_SERVER_URL$/m)
  })

  it('records release identity as labels only, never as baked secrets', () => {
    expect(dockerfile).toMatch(/org\.opencontainers\.image\.revision/)
    expect(dockerfile).toMatch(/org\.opencontainers\.image\.source/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Second review round — invariants that are difficult to exercise dynamically
//
// Fault-injection drills cover the behaviour (tests/deploy/*.sh,
// tests/docker/*.sh). These guard the things a drill cannot: that a future
// edit does not quietly remove a control, reintroduce a bypass, or reword a
// claim into something untrue.
// ═══════════════════════════════════════════════════════════════════════════

const seedScript = read('deploy/scripts/seed.sh')
const seedEntrypoint = read('deploy/scripts/seed-entrypoint.sh')
const composeWrapper = read('deploy/scripts/compose.sh')
const seedRunner = read('src/seed/one-shot.ts')
const seedBundler = read('scripts/build-seed-runner.mjs')
const sourceBuildCompose = read('docker-compose.prod.yml')
const apacheReference = read('deploy/reverse-proxy/apache-cpanel.conf.example')
const hostContract = read('deploy/STAGING_VPS_CONTRACT.md')
const acceptance = read('deploy/ACCEPTANCE.md')

describe('publication trust boundary', () => {
  it('the build workflow cannot publish on its own', () => {
    // Production authorization lived only in the deployment workflow, which
    // made it bypassable: a manual dispatch with publish:true and the real
    // origin produced an artifact the VPS would accept as a production release.
    const dispatchBlock = buildPublishWorkflow.slice(
      buildPublishWorkflow.indexOf('workflow_dispatch:'),
      buildPublishWorkflow.indexOf('workflow_call:'),
    )
    expect(dispatchBlock).not.toMatch(/^\s+publish:/m)
  })

  // The guard used to be `github.event_name == 'workflow_dispatch' &&
  // inputs.publish`, and the old test only matched that TEXT. A reusable
  // workflow inherits its caller's `github` context, so every gated call from
  // release-production.yml (started by workflow_dispatch) was refused and no
  // production artifact could ever be published — while this suite stayed
  // green. So the guard is now EVALUATED against the real call graph, and both
  // directions are asserted: the direct dispatch is refused, the gated call is
  // not.
  const REPO = 'mohammed7779948484-tech/aau-payload-platform'
  const workflowRef = (file: string) => `${REPO}/.github/workflows/${file}@refs/heads/main`
  const guard = manualPublishGuard(buildPublishWorkflow)
  // Every workflow that calls build-publish.yml in ANY reference form
  // (`./`, `$/`, `owner/repo/…@ref`, quoted, commented) is inventoried,
  // whatever it passes as `publish`, so a new caller cannot reach the publish
  // path without being added to the allow-list below.
  const publishingCallers = readdirSync(path.resolve(REPO_ROOT, '.github/workflows'))
    .filter((file) => /\.ya?ml$/.test(file) && !/^build-publish\.ya?ml$/.test(file))
    .map((file) => ({ file, source: read(`.github/workflows/${file}`) }))
    .filter(({ source }) =>
      /^\s*(?:-\s+)?uses:\s*\S*\.github\/workflows\/build-publish\.ya?ml\b/m.test(source),
    )

  it('the manual-publish guard is the first step of the build job and fails the job', () => {
    expect(guard.stepIndex).toBe(0)
    expect(guard.run).toMatch(/exit 1/)
    // Identity, not event name, is what distinguishes the two cases.
    expect(guard.condition).toMatch(/job\.workflow_ref/)
    expect(guard.condition).toMatch(/github\.workflow_ref/)
  })

  it('invariant 1: a direct dispatch of build-publish.yml can never publish', () => {
    const direct = {
      'github.event_name': 'workflow_dispatch',
      'github.workflow_ref': workflowRef('build-publish.yml'),
      'job.workflow_ref': workflowRef('build-publish.yml'),
      'inputs.publish': true, // a future edit that reintroduces the input
    }
    expect(evaluateGuard(guard.condition, direct)).toBe(true)
    // Workflow identity unavailable: fail closed, never open.
    expect(evaluateGuard(guard.condition, { ...direct, 'job.workflow_ref': '' })).toBe(true)
    // Today's build-only dispatch has no publish input and is not refused.
    expect(evaluateGuard(guard.condition, { ...direct, 'inputs.publish': null })).toBe(false)
  })

  it('invariant 2: a gated workflow_call is not refused because its caller was dispatched', () => {
    expect(publishingCallers.map(({ file }) => file).sort()).toEqual([
      'deploy-staging.yml',
      'release-production.yml',
    ])
    for (const { file, source } of publishingCallers) {
      expect(source).toMatch(/^\s+publish:\s*(?:true|\$\{\{\s*true\s*\}\})\s*(?:#.*)?$/m)
      const events = ['workflow_dispatch', 'push'].filter((event) =>
        new RegExp(`^  ${event}:`, 'm').test(source),
      )
      expect(events).toContain('workflow_dispatch')
      for (const event of events) {
        const called = {
          // A called workflow sees its caller's event and workflow identity…
          'github.event_name': event,
          'github.workflow_ref': workflowRef(file),
          // …while `job` names the file that contains the job.
          'job.workflow_ref': workflowRef('build-publish.yml'),
          'inputs.publish': true,
        }
        expect({ file, event, refused: evaluateGuard(guard.condition, called) }).toEqual({
          file,
          event,
          refused: false,
        })
      }
    }
  })

  it('approval and the typed confirmation precede publication', () => {
    // Ordering is the whole point: `build` must DEPEND on the gated job, and
    // the confirmation must not be checked only after something was published.
    const authorizeIdx = releaseWorkflow.indexOf('  authorize:')
    const buildIdx = releaseWorkflow.indexOf('  build:')
    expect(authorizeIdx).toBeGreaterThan(-1)
    expect(buildIdx).toBeGreaterThan(authorizeIdx)

    const authorizeJob = releaseWorkflow.slice(authorizeIdx, buildIdx)
    expect(authorizeJob).toMatch(/environment:\s*\n\s*name: production/)
    expect(authorizeJob).toMatch(/inputs\.confirm != 'PUBLISH'/)

    const buildJob = releaseWorkflow.slice(buildIdx, releaseWorkflow.indexOf('  record:'))
    expect(buildJob).toMatch(/needs: \[resolve, release-gate, authorize\]/)
  })

  it('approval also precedes the cutover, as a second independent gate', () => {
    // The first approval authorizes creating a production artifact; this one
    // authorizes cutting production over to it, and by then the reviewer can
    // see the exact digest.
    const authorizeIdx = deployWorkflow.indexOf('  authorize:')
    const deployIdx = deployWorkflow.indexOf('  deploy:')
    expect(authorizeIdx).toBeGreaterThan(-1)
    expect(deployIdx).toBeGreaterThan(authorizeIdx)

    const authorizeJob = deployWorkflow.slice(authorizeIdx, deployIdx)
    expect(authorizeJob).toMatch(/environment:\s*\n\s*name: production/)
    expect(authorizeJob).toMatch(/inputs\.confirm != 'DEPLOY'/)

    const deployJob = deployWorkflow.slice(deployIdx)
    expect(deployJob).toMatch(/needs: \[verify, authorize\]/)
    expect(deployJob).toMatch(/environment:\s*\n\s*name: production/)
  })

  it('staging and production publish to different packages', () => {
    expect(buildPublishWorkflow).toMatch(/channel:/)
    expect(buildPublishWorkflow).toMatch(/staging\).*suffix=-staging/s)
    expect(releaseWorkflow).toMatch(/channel: production/)
    expect(stagingWorkflow).toMatch(/channel: staging/)
    // Fixed, never an input: the staging workflow must be structurally unable
    // to publish to production.
    expect(stagingWorkflow).not.toMatch(/channel: \$\{\{/)
  })

  it('is explicit about attestations being unavailable on this plan', () => {
    // GitHub artifact attestations require GitHub Enterprise Cloud for private
    // repositories. An unconditional attest step would be a workflow guaranteed
    // to fail the first time it was used for real — security theatre with an
    // outage attached.
    expect(buildPublishWorkflow).toMatch(/ARTIFACT_ATTESTATIONS_AVAILABLE/)
    expect(buildPublishWorkflow).toMatch(/Enterprise Cloud/)
    expect(buildPublishWorkflow).toMatch(/Record the provenance status honestly/)
    expect(buildPublishWorkflow).toMatch(/\*\*NOT attested\.\*\*/)
    expect(acceptance).toMatch(/PENDING GITHUB CONFIGURATION/)
  })

  it('keeps sbom disabled on the push and generates one separately', () => {
    // `sbom: true` makes buildx emit an OCI image index instead of a plain
    // manifest, changing the digest shape the VPS entrypoint pins.
    expect(buildPublishWorkflow).toMatch(/sbom: false/)
    expect(releaseGateWorkflow).toMatch(/--format cyclonedx/)
    expect(releaseGateWorkflow).toMatch(/name: sbom-/)
  })

  it('scans the final runnable image and the pinned data images', () => {
    expect(releaseGateWorkflow).toMatch(/pnpm audit:dependencies/)
    expect(releaseGateWorkflow).toMatch(/--scanners secret/)
    // The scanner itself is pinned by digest, like everything else here.
    expect(releaseGateWorkflow).toMatch(/aquasec\/trivy@sha256:[a-f0-9]{64}/)

    // The scan logic lives in a file so it can be EXECUTED by a test rather
    // than pattern-matched here. The previous inline version printed
    // HIGH/CRITICAL findings and exited 0, and every assertion in this test
    // still passed — which is why these now point at the script and at the
    // behavioural drill instead of at workflow text.
    expect(releaseGateWorkflow).toMatch(/scripts\/trivy-image-scan\.sh aau-runner:scan/)
    const scan = read('scripts/trivy-image-scan.sh')
    expect(scan).toMatch(/postgres:\[0-9\.\]\+/)
    expect(scan).toMatch(/redis:\[0-9\.\]\+/)
    // Exit statuses are captured explicitly; `set -e` is never load-bearing.
    expect(scan).not.toMatch(/^set -e/m)
    expect(scan).toMatch(/\|\| rc=\$\?/)
  })

  it('runs the drills that prove the security gates can actually fail', () => {
    // Both scanners in the `security` job once reported success while the
    // condition they guard was violated. A gate that has never been observed
    // to fail is an unverified claim, so its failure paths are exercised in CI.
    expect(releaseGateWorkflow).toMatch(/tests\/security\/trivy-scan-gate-drill\.sh/)
    expect(releaseGateWorkflow).toMatch(/tests\/security\/image-secret-scan-drill\.sh/)

    // Each drill contains a mutation step that runs the PREVIOUS logic and
    // requires it to fail; without that, the drill proves nothing about the
    // bug it was written for.
    expect(read('tests/security/trivy-scan-gate-drill.sh')).toMatch(/MUTATION/)
    expect(read('tests/security/image-secret-scan-drill.sh')).toMatch(/MUTATION/)
  })

  it('evaluates every secret-shaped value in the image, not the image as a whole', () => {
    // The previous check exempted the WHOLE image whenever the approved
    // build-time placeholder appeared anywhere in the layer history, so a real
    // credential in a different layer was suppressed by it.
    expect(releaseGateWorkflow).toMatch(/scripts\/assert-no-image-secrets\.sh/)
    const scanner = read('scripts/assert-no-image-secrets.sh')
    // Decided per occurrence, against an exact value.
    expect(scanner).toMatch(/APPROVED_PLACEHOLDER/)
    expect(scanner).toMatch(/\[ "\$value" = "\$APPROVED_PLACEHOLDER" \]/)
    // The config env is checked too: inherited ENV does not always render in
    // `docker history`.
    expect(scanner).toMatch(/Config\.Env/)
  })

  it('gates dependencies against a baseline that cannot rot', () => {
    // A bare `pnpm audit` was red on its first run against 24 pre-existing
    // advisories. A gate that is red on day one is a gate people learn to skip.
    // The baseline records what was already there and fails on anything new —
    // and ALSO fails when a baselined advisory disappears, so it cannot quietly
    // become a permanent exemption list.
    const gate = read('scripts/check-dependency-audit.mjs')
    expect(gate).toMatch(/introduced\.length > 0/)
    expect(gate).toMatch(/resolved\.length > 0/)
    expect(gate).toMatch(/review_by/)
    expect(gate).toMatch(/Adding it to the baseline is not the fix/)

    const baseline = JSON.parse(read('.github/security/audit-baseline.json'))
    expect(Object.keys(baseline.advisories).length).toBeGreaterThan(0)
    // A baseline with no review date is an exemption list.
    expect(baseline.review_by).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(baseline.review_by).getTime()).toBeGreaterThan(
      new Date(baseline.recorded_at).getTime(),
    )
  })

  it('covers npm dependencies in Dependabot', () => {
    expect(dependabot).toMatch(/package-ecosystem: npm/)
    // Payload packages must move as a set; a single-package bump would just
    // fail `check:payload-versions`.
    expect(dependabot).toMatch(/dependency-name: 'payload'/)
    expect(dependabot).toMatch(/dependency-name: '@payloadcms\/\*'/)
  })

  it('reports a public smoke failure truthfully', () => {
    expect(deployWorkflow).toMatch(/DEPLOYED ON THE HOST, BUT NOT SERVING PUBLICLY/)
    expect(deployWorkflow).toMatch(/Do NOT respond by redeploying an older image/)
    expect(deployWorkflow).toMatch(/\*\*NOT DEPLOYED\.\*\*/)
    // The old version printed "### Deployed" under always(), so a failed smoke
    // test still read as a successful release.
    expect(deployWorkflow).not.toMatch(/echo "### Deployed"/)
  })
})

describe('staging environment', () => {
  it('is deployable from a configurable ref, not a hardcoded branch', () => {
    expect(stagingWorkflow).toMatch(/STAGING_RELEASE_REF/)
    // The temporary implementation branch must not be baked into the workflow.
    expect(stagingWorkflow).not.toMatch(/claude\/docker-vps-production-hardening-0qttkt['"]/)
  })

  it('runs the same exact-SHA release gate production uses', () => {
    expect(stagingWorkflow).toMatch(/uses: \.\/\.github\/workflows\/release-gate\.yml/)
  })

  it('refuses a staging build for the production origin', () => {
    expect(stagingWorkflow).toMatch(/STAGING_SERVER_URL == vars\.PRODUCTION_SERVER_URL/)
  })

  it('never references production secrets', () => {
    expect(stagingWorkflow).not.toMatch(/secrets\.VPS_SSH/)
    expect(stagingWorkflow).not.toMatch(/vars\.PRODUCTION_VPS_READY/)
  })

  it('binds every host-touching job to the staging GitHub Environment', () => {
    // The Environment is where the staging SSH secrets live. A job that touches
    // the host without it either fails or -- worse -- picks up whatever the
    // repository-level secrets are, which is how a staging deployment reaches a
    // production host.
    const environments = stagingWorkflow.match(/^\s*environment:\n\s*name: (\S+)/gm) ?? []
    expect(environments.length).toBeGreaterThan(0)
    for (const block of environments) {
      expect(block, `every environment must be staging: ${block}`).toMatch(/name: staging$/m)
    }
    expect(stagingWorkflow).not.toMatch(/name: production/)
  })

  it('keeps the Seed explicit, opt-in and bounded to the three staging modes', () => {
    // preserve is the default on every path, including a `push` event where
    // there are no inputs at all, so a normal staging deployment never seeds.
    expect(stagingWorkflow).toMatch(/inputs\.seed_mode \|\| 'preserve'/)

    // The allow-list is the authority, not the `choice` type: an API dispatch
    // can submit any string. All three staging modes must survive it --
    // reset-and-full is a real staging operation and this gate must not be the
    // thing that quietly removes it.
    expect(stagingWorkflow).toMatch(/preserve\|full\|reset-and-full\) ;;/)
    expect(stagingWorkflow).toMatch(/invalid seed_mode/)

    // And the mode reaches the shell through the environment, never through
    // `${{ }}` interpolated into the script text.
    expect(stagingWorkflow).toMatch(/-- "seed \$\{SEED_MODE\}"/)
    expect(stagingWorkflow).not.toMatch(/-- "seed \$\{\{/)
  })

  it('authorizes the pinned SHA only against a lineage it successfully fetched', () => {
    // With `|| true` a network or authorization failure left a stale local
    // remote-tracking ref in place (checkout runs at fetch-depth: 0) and the
    // containment test authorized against lineage that may no longer be the
    // approved staging branch. `target` must bind only inside a successful fetch.
    expect(stagingWorkflow).toMatch(/target=""/)
    expect(stagingWorkflow).toMatch(/could not fetch STAGING_RELEASE_REF/)
    expect(stagingWorkflow).toMatch(/Refusing to authorize against a possibly stale local ref/)
    expect(stagingWorkflow).not.toMatch(/git fetch[^\n]*\|\| true/)

    // Both lineage shapes stay supported: `develop` is the steady state after
    // merge, and a tag remains deployable.
    expect(stagingWorkflow).toMatch(/refs\/heads\/\$\{RELEASE_REF\}/)
    expect(stagingWorkflow).toMatch(/refs\/tags\/\$\{RELEASE_REF\}/)
  })

  it('exercises the same shared deployment engine production uses', () => {
    // The rehearsal only means anything if staging runs the same scripts. These
    // are environment-scoped by the resolver, not reimplemented per environment.
    for (const script of ['deploy.sh', 'backup.sh', 'restore.sh', 'compose.sh']) {
      expect(readdirSync(path.resolve(REPO_ROOT, 'deploy/scripts'))).toContain(script)
    }
    // One deploy entry point, one forced-command contract, both environments.
    expect(entrypointScript).toMatch(/AAU_ENV/)
    expect(environmentScript).toMatch(/production\|staging\)/)
  })

  it('derives every isolated path from one environment resolver', () => {
    for (const name of [
      'AAU_DEPLOY_ROOT', 'AAU_ENV_FILE', 'AAU_STATE_FILE', 'AAU_LOCK_FILE',
      'AAU_BACKUP_ROOT', 'AAU_UPLOADS_PATH', 'AAU_PROJECT_NAME',
      'AAU_APP_PORT', 'AAU_CANDIDATE_PORT',
    ]) {
      expect(environmentScript).toMatch(new RegExp(`${name}=`))
    }
    expect(environmentScript).toMatch(/production\|staging\)/)
    expect(environmentScript).toMatch(/unknown environment/)
  })
})

describe('one-shot canonical Seed', () => {
  it('is never a startup toggle', () => {
    // A FULL_SEED-style flag would re-run the broad Seed after every reboot,
    // OOM kill and routine redeploy.
    // Executable content only: seed.sh's header explains WHY there is no such
    // flag, and that explanation has to be allowed to name it.
    for (const file of [vpsCompose, deployScript, seedScript, seedRunner]) {
      expect(withoutComments(file)).not.toMatch(/FULL_SEED/)
    }
    expect(vpsCompose).toMatch(/PAYLOAD_SEED_ENABLED: 'false'/)
    // deploy.sh must never INVOKE a seed. (It may name seed.sh in operator
    // guidance, so this looks for an invocation rather than the word.)
    expect(withoutComments(deployScript)).not.toMatch(/seed-runner|seed\.sh"/)
  })

  it('refuses a production Seed in three independent places', () => {
    expect(seedScript).toMatch(/STAGING-ONLY/)
    expect(seedEntrypoint).toMatch(/STAGING-ONLY/)
    expect(seedRunner).toMatch(/STAGING-ONLY/)
  })

  it('leaves no typed confirmation that could re-open a production Seed', () => {
    // `full` was once reachable in production behind
    // SEED_CONFIRM=I-UNDERSTAND-THIS-WRITES-CANONICAL-CONTENT, for a "deliberate
    // first-install content initialisation". That use case is now served by
    // deploy/scripts/initialize-from-backup.sh, which installs the ACCEPTED
    // migrated dataset rather than this repository's fixtures. A retired
    // confirmation left in the code reads as a supported escape hatch, so none
    // of the three layers may still mention one.
    for (const layer of [seedScript, seedEntrypoint, seedRunner]) {
      expect(layer).not.toMatch(/I-UNDERSTAND-THIS-WRITES-CANONICAL-CONTENT/)
      expect(layer).not.toMatch(/SEED_CONFIRM/)
    }
    expect(seedRunner).toMatch(/initialize-from-backup\.sh/)
    expect(seedScript).toMatch(/initialize-from-backup\.sh/)
    expect(seedEntrypoint).toMatch(/initialize-from-backup\.sh/)
  })

  it('ships as a source-free bundle, not a source tree plus a loader', () => {
    expect(dockerfile).toMatch(/node scripts\/build-seed-runner\.mjs/)
    expect(seedScript).toMatch(/node \/app\/seed-runner\.mjs/)
    // No Payload CLI and no TypeScript loader on the VPS.
    expect(withoutComments(seedScript)).not.toMatch(/pnpm|tsx|payload run/)
    // The image assertion must LOAD the artifact, not just look for the file:
    // a bundle whose externals cannot resolve is present but useless.
    expect(read('scripts/assert-runner-image.sh')).toMatch(/ERR_MODULE_NOT_FOUND/)
  })

  it('bundles the origin the image was built with', () => {
    // `next build` replaces process.env.NEXT_PUBLIC_* with literals; esbuild
    // does not. Without this the seed would read an undefined origin and throw
    // while the application beside it, built from the same source, works.
    expect(seedBundler).toMatch(/'process\.env\.NEXT_PUBLIC_SERVER_URL'/)
  })

  it('validates its arguments before loading the Payload config', () => {
    // A production reset-and-full must be refused even where the config cannot
    // be built, and a mistyped mode should not produce a stack trace from deep
    // inside configuration loading.
    expect(seedRunner).toMatch(/await import\('@payload-config'\)/)
    expect(seedRunner).not.toMatch(/^import config from '@payload-config'/m)
  })

  it('serializes against deploy, restore and backup', () => {
    expect(seedScript).toMatch(/oplock_acquire "\$AAU_LOCK_FILE"/)
  })

  it('takes a restore point before a destructive staging reset', () => {
    expect(seedScript).toMatch(/pre-seed backup/)
    expect(seedScript).toMatch(/refusing to run a destructive reset without a restore point/)
  })

  it('handles the two seed failure classes oppositely', () => {
    // Class A — the pre-seed backup fails BEFORE any destructive work. The
    // database is untouched, so the prior service must be RESTORED, not left
    // down. backup.sh is told RESTART_AFTER_QUIESCE=false, so seed.sh owns this.
    expect(seedScript).toMatch(/RESTART_AFTER_QUIESCE=false/)
    expect(seedScript).toMatch(/restoring the prior app service/)
    const classAIdx = seedScript.indexOf('restoring the prior app service')
    const refuseIdx = seedScript.indexOf('refusing to run a destructive reset without a restore point')
    expect(classAIdx).toBeGreaterThan(-1)
    expect(refuseIdx).toBeGreaterThan(classAIdx)
    // Class B — the destructive seed fails AFTER the reset began. The app must
    // be LEFT STOPPED (staging may be half-reset), and the trap must not restart.
    expect(seedScript).toMatch(/reset_seed_failed=true/)
    expect(seedScript).toMatch(/LEFT STOPPED on purpose/)
    expect(seedScript).toMatch(/may be PARTIALLY/)
  })
})

describe('privileged SSH vocabulary', () => {
  it('accepts exactly two shapes and no path', () => {
    expect(forcedCommandScript).toMatch(/case "\$\{1:-\}" in/)
    expect(forcedCommandScript).toMatch(/full\|reset-and-full\) ;;/)
    expect(forcedCommandScript).toMatch(/expected exactly one image reference/)
    // Never relocatable: an SSH client can request environment variables, so a
    // `${DEPLOY_ROOT:-...}` fallback would be caller-controlled here. And the
    // environment is derived from the file's own installed path rather than a
    // hand-edited constant, so copying the production file to the staging
    // account cannot silently point a staging key at production.
    expect(forcedCommandScript).not.toMatch(/DEPLOY_ROOT="\$\{DEPLOY_ROOT:-/)
    expect(forcedCommandScript).toMatch(/self="\$\(readlink -f "\$\{BASH_SOURCE\[0\]\}"\)"/)
    expect(forcedCommandScript).toMatch(/\/srv\/aau\/production\/deploy\/scripts\/ssh-forced-command\.sh\)/)
    expect(forcedCommandScript).toMatch(/\/srv\/aau\/staging\/deploy\/scripts\/ssh-forced-command\.sh\)/)
    expect(forcedCommandScript).toMatch(/unrecognised path/)
  })

  it('still refuses an interactive login, globs and multi-line requests', () => {
    expect(forcedCommandScript).toMatch(/no interactive shell is permitted/)
    expect(forcedCommandScript).toMatch(/refusing a multi-line command/)
    expect(forcedCommandScript).toMatch(/set -f/)
  })

  it('routes seeding through its own entrypoint and sudo rule', () => {
    // Deploying and writing canonical content are different capabilities, so
    // they must be grantable independently.
    expect(forcedCommandScript).toMatch(/SEED_ENTRYPOINT/)
    expect(seedEntrypoint).toMatch(/exec env -i/)
  })

  it('refuses to seed anything but staging, from its own installed path', () => {
    // The Seed writes this repository's canonical content. Production content
    // is the accepted migrated dataset, so there is no production Seed to
    // authorize — and therefore no confirmation string anywhere in this path
    // that a remote key could supply, or that a future edit could forward.
    expect(seedEntrypoint).toMatch(/\[\[ "\$AAU_ENV" == "staging" \]\]/)
    expect(seedEntrypoint).toMatch(/STAGING-ONLY/)
    expect(seedEntrypoint).toMatch(/initialize-from-backup\.sh/)
    expect(seedEntrypoint).not.toMatch(/SEED_CONFIRM/)
    expect(seedScript).not.toMatch(/SEED_CONFIRM/)
  })
})

describe('source-build regression contract is named truthfully', () => {
  it('does not call the broad Seed a bootstrap', () => {
    // `seed-bootstrap-prod` running `pnpm seed` read as the minimal identity
    // bootstrap while actually running the broad canonical Seed. Those have
    // very different blast radii.
    // The old name survives only in the comment explaining the rename.
    expect(withoutComments(sourceBuildCompose)).not.toMatch(/seed-bootstrap-prod/)
    expect(sourceBuildCompose).toMatch(/canonical-seed-source-build:/)
    expect(sourceBuildCompose).toMatch(/minimal identity bootstrap/)
    expect(releaseGateWorkflow).not.toMatch(/seed-bootstrap-prod/)
  })

  it('locks mutating compose subcommands and leaves read-only ones alone', () => {
    // `composeWrapper` was read and never used, which ESLint reports and which
    // meant deploy/scripts/compose.sh had no static guard at all. It has one
    // now, for the property that was missing from the script itself: the
    // documented bootstrap-password retirement step runs
    // `compose.sh up --force-recreate app-prod` straight from this wrapper, so
    // an unlocked mutating command could recreate a service while a deploy,
    // restore, backup or seed held the operation lock and was working on it.
    expect(composeWrapper).toMatch(/source "\$\{LIB\}\/oplock\.sh"/)
    expect(composeWrapper).toMatch(/oplock_acquire "\$AAU_LOCK_FILE"/)

    // Read-only inspection must NOT block during a deploy.
    expect(composeWrapper).toMatch(/ps\|logs\|config\|top\|port\|images\|events\|version\|ls\)\s*needs_lock=false/)

    // Default to locking, so a subcommand nobody listed is treated as
    // mutating rather than waved through.
    expect(withoutComments(composeWrapper)).toMatch(/needs_lock=true/)

    // And the locked path must not `exec`: bash marks the lock's file
    // descriptor close-on-exec, so replacing the shell would drop the lock
    // while the command it protects is still running.
    const lockedAt = composeWrapper.indexOf('oplock_acquire')
    expect(composeWrapper.slice(lockedAt)).not.toMatch(/^exec /m)
  })

  it('says plainly that it is not the VPS runtime', () => {
    expect(sourceBuildCompose).toMatch(/NOT the VPS runtime/)
  })

  it('declares the staging identity on the Seed service and nowhere else', () => {
    // `src/seed/run-seed.ts` refuses a broad Seed in production, and
    // `isProductionDeployment()` treats an UNSET AAU_ENV as production. So the
    // canonical-Seed service has to name itself staging — exactly as
    // `deploy/scripts/seed-entrypoint.sh` hard-binds AAU_ENV=staging before
    // invoking the Seed on the VPS.
    //
    // The narrowness is the point. If AAU_ENV=staging is hoisted into
    // `*runtime-environment` to silence the same failure, app-prod stops being
    // a production runtime and the redeploy drill below it — which proves a
    // production deployment never reseeds — silently proves nothing.
    const declarations = withoutComments(sourceBuildCompose).match(/^\s*AAU_ENV:.*$/gm) ?? []
    expect(declarations).toHaveLength(1)
    expect(declarations[0]?.trim()).toBe('AAU_ENV: staging')

    const anchorBlock = sourceBuildCompose.slice(0, sourceBuildCompose.indexOf('\nservices:'))
    expect(withoutComments(anchorBlock)).not.toMatch(/AAU_ENV/)

    const seedServiceIdx = sourceBuildCompose.indexOf('  canonical-seed-source-build:')
    const appServiceIdx = sourceBuildCompose.indexOf('  app-prod:')
    expect(seedServiceIdx).toBeGreaterThan(-1)
    expect(appServiceIdx).toBeGreaterThan(seedServiceIdx)
    const seedService = sourceBuildCompose.slice(seedServiceIdx, appServiceIdx)
    expect(withoutComments(seedService)).toMatch(/^\s*AAU_ENV: staging$/m)
  })
})

describe('host contract and documentation truthfulness', () => {
  it('the Apache reference never edits generated cPanel config', () => {
    expect(apacheReference).toMatch(/NOT A FILE TO COPY OVER httpd\.conf/)
    expect(apacheReference).toMatch(/userdata/)
    // Capturing ACME breaks AutoSSL renewal and takes the site down later in a
    // way that looks like an application fault.
    expect(apacheReference).toMatch(/\.well-known\/acme-challenge\s+!/)
    for (const excluded of ['cpanel', 'webmail', 'whm', 'autodiscover', 'autoconfig']) {
      expect(apacheReference).toMatch(new RegExp(`ProxyPass\\s+/${excluded}\\s+!`))
    }
    expect(apacheReference).toMatch(/127\.0\.0\.1:3000/)
    expect(apacheReference).toMatch(/127\.0\.0\.1:13000/)
  })

  it('the host contract carries no secret values', () => {
    // It is written for a different agent and must be safe to hand over.
    expect(hostContract).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/)
    expect(hostContract).toMatch(/contains NO secrets/)
    expect(hostContract).toMatch(/Names only\. Never send values/)
  })

  it('the host contract names every isolated path and the required drills', () => {
    for (const needle of [
      '/srv/aau/production', '/srv/aau/staging',
      '127.0.0.1:3000', '127.0.0.1:13000',
      'aau-production', 'aau-staging',
      'docker` group', 'ssh-forced-command.sh', 'release-policy.conf',
      'PENDING REAL VPS', 'off-host', 'Reboot', 'reset-and-full',
    ]) {
      expect(hostContract, `host contract must document ${needle}`).toContain(needle)
    }
  })

  it('does not claim a Docker network isolates services from the host', () => {
    for (const doc of [deployReadme, hostContract, acceptance]) {
      expect(doc).not.toMatch(/unreachable from the (Docker )?host/i)
    }
    expect(deployReadme).toContain('**It does not mean** the services are isolated from the Docker **host**')
  })

  it('does not describe an APP_IMAGE that no longer exists', () => {
    expect(deployReadme).not.toMatch(/APP_IMAGE=ghcr\.io/)
    expect(deployReadme).toMatch(/no default for `APP_IMAGE`/)
  })

  it('states that production has not been deployed and the plan gap is real', () => {
    expect(acceptance).toMatch(/Production has NOT been deployed/)
    expect(acceptance).toMatch(/Enterprise Cloud/)
    expect(acceptance).toMatch(/not "production ready"/)
  })
})

describe('first-install data initialization', () => {
  it('is a separate mechanism, never a weakening of restore.sh', () => {
    // restore.sh refuses a non-production backup against production with NO
    // override, because restoring a disposable environment over a live one is
    // data loss dressed up as recovery. Founding an EMPTY environment is the
    // opposite situation, so it gets its own script with its own — inverted —
    // safety property: prove nothing is being overwritten.
    expect(restoreScript).toMatch(/There is no override for this direction/)
    expect(initializeScript).toMatch(/VIRGIN/)
  })

  it('never becomes a second route into the Neon conversion', () => {
    // The migration tree is staging-only and is not installed on a production
    // host. This script restores an already-correct schema; it must not reach
    // for the converter.
    expect(withoutComments(initializeScript)).not.toMatch(/neon-import|neon\.dump/)
    expect(initializeScript).toMatch(/must never\n# become runnable against production/)
  })

  it('requires an acknowledgement that names the target environment', () => {
    // A command copied out of the staging runbook must not initialize
    // production, so the string is derived from AAU_ENV rather than fixed.
    expect(initializeScript).toMatch(/I-UNDERSTAND-THIS-INITIALIZES-\$\(printf/)
    expect(initializeScript).toMatch(/ALLOW_FIRST_INSTALL_FROM_BACKUP/)
  })

  it('verifies the artifact completely, with no unverified opt-in', () => {
    // restore.sh has ALLOW_UNVERIFIED_BACKUP because during an outage an
    // unverifiable backup can still be the least-bad option. A planned
    // initialization has no clock on it: an artifact that cannot be shown to be
    // complete is simply the wrong artifact.
    expect(initializeScript).not.toMatch(/ALLOW_UNVERIFIED/)
    expect(initializeScript).toMatch(/sha256sum --quiet --check SHA256SUMS/)
    expect(initializeScript).toMatch(/pg_restore --list/)
    expect(initializeScript).toMatch(/gzip --test/)
    // A `live` snapshot's dump and uploads describe two different instants,
    // which is tolerable for a restore point and not for a founding dataset.
    expect(initializeScript).toMatch(/recorded_consistency" == "quiesced"/)
  })

  it('proves the target is virgin from live system state, not a marker file', () => {
    // A receipt can be deleted. Every guard reads the running system.
    expect(initializeScript).toMatch(/AAU_STATE_FILE" \]\]/)
    expect(initializeScript).toMatch(/com\.docker\.compose\.service=app-prod/)
    expect(initializeScript).toMatch(/payload_migrations/)
    expect(initializeScript).toMatch(/user-created object/)
    expect(initializeScript).toMatch(/already contains files/)
    expect(initializeScript).toMatch(/It is NOT the rerun guard|NOT the rerun guard/i)
  })

  it('gives every restored object to the application role and checks it', () => {
    // The staging migration's defect, prevented rather than repeated: objects
    // created by the admin role are invisible in every schema count and produce
    // a blank Admin panel with SQLSTATE 42501.
    // Normalized first, exactly as restore.sh does before ITS pg_restore — a
    // schema still owned by the bootstrap superuser would take the restore's
    // objects and then refuse the application's own DDL at container start.
    expect(initializeScript).toMatch(/DROP SCHEMA IF EXISTS public CASCADE;/)
    expect(initializeScript).toMatch(/ALTER SCHEMA public OWNER TO "\$\{APP_DB_USER\}";/)
    expect(initializeScript).toMatch(/REVOKE CREATE ON SCHEMA public FROM PUBLIC;/)
    expect(restoreScript).toMatch(/DROP SCHEMA IF EXISTS public CASCADE;/)
    expect(initializeScript).toMatch(/--no-owner --no-acl/)
    expect(initializeScript).toMatch(/--role "\$APP_DB_USER"/)
    expect(initializeScript).toMatch(/--exit-on-error/)
    expect(initializeScript).toMatch(/tables_not_owned_by_app/)
    expect(initializeScript).toMatch(/sequences_not_owned_by_app/)
    expect(initializeScript).toMatch(/types_not_owned_by_app/)
    expect(initializeScript).toMatch(/ownership contract satisfied/)
  })

  it('compares privilege probes against the value PostgreSQL actually returns', () => {
    // An explicit `::text` cast renders a boolean as `true`/`false`. `t`/`f` is
    // only psql's DISPLAY form for an uncast boolean, so comparing a cast probe
    // against `t` is an assertion that can never pass — it fails closed, which
    // hides as "the database is misconfigured" rather than "the check is wrong".
    // CI caught exactly that here. migration/scripts/neon-import.sh compares the
    // same probes against `true`; both must stay that way.
    // Every privilege probe in this script is `::text`-cast, so every one of
    // them returns `true`/`false`. Counted so the assertions below cannot
    // quietly stop covering the probes they name.
    const casts = [...initializeScript.matchAll(/::text/g)]
    expect(casts.length).toBeGreaterThanOrEqual(4)
    expect(initializeScript).toMatch(/\[\[ "\$role_ready" == "true" \]\]/)
    expect(initializeScript).toMatch(/\[\[ "\$value" == "true" \]\]/)
    expect(initializeScript).not.toMatch(/\$role_ready" == "t"/)
    expect(neonImportScript).toMatch(/contract_expect 'application schema USAGE'\s+'true'/)

    // The uncast probes in the same file must keep comparing against psql's
    // display form, which is the opposite mistake.
    expect(initializeScript).toMatch(/to_regclass\('public\.payload_migrations'\) IS NOT NULL/)
    expect(initializeScript).toMatch(/\[\[ "\$migrations_present" == "f" \]\]/)
  })

  it('never seeds, never replaces a password, and never claims a release', () => {
    expect(withoutComments(initializeScript)).not.toMatch(/seed-runner|seed\.sh"/)
    // The migrated Super Admin is validated, not recreated: the first
    // deployment's bootstrap would otherwise add an administrator the accepted
    // dataset never had.
    expect(initializeScript).toMatch(/INITIAL_ADMIN_EMAIL/)
    expect(initializeScript).toMatch(/Migrated user passwords are never replaced/)
    expect(initializeScript).not.toMatch(/INITIAL_ADMIN_PASSWORD=/)
    // No release has been deployed, so no release identity may be recorded.
    expect(initializeScript).toMatch(/release-state file is deliberately NOT written/)
  })

  it('starts only the database, never an application container', () => {
    // It runs before any release exists, so its compose invocations carry a
    // parse-only placeholder. That is only safe because nothing it starts is an
    // application service.
    const lifecycle = [...initializeScript.matchAll(/compose (up|run|start|restart)[^\n]*/g)].map(
      (match) => match[0],
    )
    expect(lifecycle.length).toBeGreaterThan(0)
    for (const line of lifecycle) {
      expect(line, `initialization must not start an app container: ${line}`).not.toMatch(
        /app-prod|app-candidate/,
      )
    }
  })
})

describe('backup never refuses for a bookkeeping reason', () => {
  it('falls back to a parse-only image rather than refusing to protect data', () => {
    // Compose parses the whole file for every subcommand and APP_IMAGE has no
    // default, so backup.sh needs SOME value even to `exec postgres-prod`. There
    // genuinely may be neither a release-state file nor a caller-supplied image:
    // a first deployment onto a database founded from a platform backup, or a
    // stack an operator brought up by hand. Refusing the backup there would mean
    // declining to protect real data because of a missing bookkeeping file.
    expect(backupScript).toMatch(/aau-compose-parse-only/)
    expect(backupScript).not.toMatch(/no release has ever been deployed to/)
  })

  it('never starts anything from that placeholder', () => {
    // The placeholder is only safe because nothing is ever created from it. The
    // one lifecycle command in this script is `compose start`, which restarts an
    // existing container with the image it already has; a `compose up` would
    // create one from whatever APP_IMAGE says.
    const executable = withoutComments(backupScript)
    expect(executable).not.toMatch(/compose up\b/)
    expect(executable).toMatch(/compose start app-prod/)
  })

  it('records the release-state digest, never the placeholder and never compose output', () => {
    // metadata.json pairs a restore point with the build that made it, and
    // restore.sh reads it. Two different values must never reach it.
    //
    // The placeholder, which exists only so compose can parse the file: it is
    // never read from APP_IMAGE, only from the release-state file, which a
    // successful deploy or restore writes and nothing else does.
    const executable = withoutComments(backupScript)
    expect(executable).toMatch(/deployed_image="\$\(<"\$AAU_STATE_FILE"\)"/)
    expect(executable).not.toMatch(/deployed_image="\$\{?APP_IMAGE/)

    // And the running container's configured image, which `compose ps` reports
    // and which can be a tag, a manually started container or a stale one. It
    // used to OVERRIDE the release-state digest unconditionally. It may now be
    // used only in the branch where there is NO release state — where it is the
    // only evidence that exists, and recording nothing would produce an archive
    // restore.sh must refuse for having no paired image.
    expect(backupScript).toMatch(/running_image="\$\(compose ps --all --format '\{\{\.Image\}\}' app-prod/)
    expect(backupScript).toMatch(/WARNING: app-prod is running/)
    expect(backupScript).toMatch(/NOT an authorized release identity/)

    // The override is gone: the assignment from the running image must sit
    // inside the `elif` that only runs when deployed_image is empty, never
    // after a successful read of the release-state file.
    const stateReadAt = executable.indexOf('deployed_image="$(<"$AAU_STATE_FILE")"')
    const overrideAt = executable.indexOf('deployed_image="$running_image"')
    expect(stateReadAt).toBeGreaterThan(-1)
    expect(overrideAt).toBeGreaterThan(stateReadAt)
    expect(executable.slice(stateReadAt, overrideAt)).toMatch(/elif \[\[ -n "\$running_image" \]\]/)
  })
})

/**
 * The first production launch passes through a state no other deployment ever
 * sees: the database is real, the uploads are real, and no release has ever
 * been deployed. These are the contracts that make that state recoverable.
 */
describe('the imported-baseline recovery contract', () => {
  it('recognises a backup with no paired image only when nothing was ever released', () => {
    // Entering this mode on an environment that HAS a release would turn a
    // bookkeeping failure into a silent data-only restore under a running
    // release. All four conditions must be present in the guard.
    expect(restoreScript).toMatch(/BASELINE_RECOVERY=false/)
    expect(restoreScript).toMatch(/if \[\[ ! -e "\$AAU_STATE_FILE" && -z "\$existing_app_containers" \]\]/)
    expect(restoreScript).toMatch(/BASELINE_RECOVERY=true/)

    // And it is reachable only when no image was recorded AND none was given.
    const executable = withoutComments(restoreScript)
    const resolveAt = executable.indexOf('RESTORE_IMAGE="${RESTORE_IMAGE:-$recorded_image}"')
    const guardAt = executable.indexOf('BASELINE_RECOVERY=false')
    expect(resolveAt).toBeGreaterThan(-1)
    expect(guardAt).toBeGreaterThan(resolveAt)
    expect(executable.slice(guardAt)).toMatch(/if \[\[ -z "\$RESTORE_IMAGE" \]\]/)
  })

  it('treats an unreadable container list as "a release exists", not as virgin', () => {
    // `docker ps` failing must never be the reason an environment is declared
    // never-released: that is the one assumption this branch must not make.
    expect(restoreScript).toMatch(/existing_app_containers="<unreadable>"/)
  })

  it('starts nothing and records no release identity in baseline recovery', () => {
    const executable = withoutComments(restoreScript)
    const baselineAt = executable.lastIndexOf('if [[ "$BASELINE_RECOVERY" == "true" ]]; then')
    expect(baselineAt).toBeGreaterThan(-1)

    // The start and the release-state write must both sit in the `else`, after
    // the baseline branch — never on the path a baseline recovery takes.
    const startAt = executable.indexOf('compose up --detach --force-recreate --wait app-prod')
    const stateWriteAt = executable.indexOf('printf \'%s\\n\' "$RESTORE_IMAGE" > "$AAU_STATE_FILE"')
    expect(startAt).toBeGreaterThan(baselineAt)
    expect(stateWriteAt).toBeGreaterThan(baselineAt)
    expect(executable.slice(baselineAt, startAt)).toMatch(/rm -f "\$AAU_STATE_FILE"/)
    expect(executable.slice(baselineAt, startAt)).toMatch(/^\s*else\s*$/m)
  })

  it('proves no application is active before declaring the baseline clean', () => {
    // Repeated `--filter label=` arguments are AND-ed by docker, so both app
    // services have to be queried separately or the probe matches nothing and
    // always reports a clean baseline.
    expect(restoreScript).toMatch(/for app_service in app-prod app-candidate; do/)
    expect(restoreScript).toMatch(/running\|restarting\|paused\|removing\) baseline_leftover\+=/)
    expect(restoreScript).toMatch(/an\n {2}application container is STILL ACTIVE/)
  })

  it('never substitutes the incoming release as the previous image', () => {
    // The failed candidate's own digest is exactly the build that must not be
    // paired with the pre-migration schema, nor written as a release identity.
    const executable = withoutComments(restoreScript)
    expect(executable).not.toMatch(/RESTORE_IMAGE="\$\{?RESOLVED_DIGEST/)
    expect(restoreScript).toMatch(/aau-compose-parse-only:no-release-recorded/)
  })

  it('points the operator at the recovery that works for this state', () => {
    // deploy.sh's migration-changed branch used to name restore.sh
    // unconditionally, including for the first imported-baseline deployment
    // whose only restore point restore.sh then refused.
    expect(deployScript).toMatch(/if \[\[ -z "\$PREVIOUS_IMAGE" \]\]; then/)
    expect(deployScript).toMatch(/BASELINE RECOVERY/)
    expect(deployScript).toMatch(/Do NOT re-import from Neon, do NOT seed/)
  })

  it('does not claim the stable service is still serving after a failed candidate', () => {
    // The previous release is stopped when the maintenance window opens,
    // BEFORE the candidate starts, so an incident message promising it is
    // "still serving the previous release" tells the operator the opposite of
    // the truth at the moment they most need it.
    expect(deployScript).not.toMatch(/is still serving the previous release/)
    expect(deployScript).toMatch(/The stable service is DOWN and stays down/)

    // And the claim must remain impossible to reintroduce accidentally: the
    // stop happens before candidate validation.
    const executable = withoutComments(deployScript)
    const stopAt = executable.indexOf('if ! stop_and_prove_stopped app-prod; then')
    const candidateAt = executable.indexOf('compose --profile candidate up --detach --force-recreate app-candidate')
    expect(stopAt).toBeGreaterThan(-1)
    expect(candidateAt).toBeGreaterThan(stopAt)
  })
})

describe('the uploads ownership contract', () => {
  it('fails closed when the application identity cannot write the uploads tree', () => {
    // This was `chown ... || log WARNING` and carried on: an initialization
    // that reported SUCCESS and then could not accept a single upload.
    expect(initializeScript).not.toMatch(/WARNING: could not chown/)
    expect(initializeScript).toMatch(/uploads ownership contract satisfied/)
    expect(initializeScript).toMatch(/cannot be written by the\n {2}application identity/)
  })

  it('defaults to the container identity, whatever a caller overrides', () => {
    // The drills point APP_UID/APP_GID at their own identity so the tree they
    // create stays inspectable to a non-root process. That override must never
    // become the production value: the runner image runs as 10001:10001 and
    // the default is what the operator gets.
    expect(initializeScript).toMatch(/APP_UID="\$\{APP_UID:-10001\}"/)
    expect(initializeScript).toMatch(/APP_GID="\$\{APP_GID:-10001\}"/)
  })

  it('does not stamp the staging directory\'s mode onto the uploads directory', () => {
    // `cp -a "${staged}/." "${dest}/"` names the STAGING DIRECTORY as the
    // source, so cp copies ITS attributes onto the destination -- and it came
    // from `mktemp -d`, which is 0700. The operator's uploads directory would
    // silently acquire 0700 from a temporary directory, replacing the modes
    // the host contract set on it, with no mention anywhere that it happened.
    const executable = withoutComments(initializeScript)
    expect(executable).not.toMatch(/cp -a "\$\{staged_uploads\}\/\."/)
    expect(executable).toMatch(/find "\$staged_uploads" -mindepth 1 -maxdepth 1 -print0/)
    expect(executable).toMatch(/cp -a "\$staged_entry" "\$\{AAU_UPLOADS_PATH\}\/"/)
  })

  it('establishes ownership the same way restore.sh does', () => {
    // Both scripts install the same uploads tree for the same runtime
    // identity, so they must not disagree about how to get there. On the VPS
    // this runs as root and the direct chown succeeds; the sudo fallback is
    // inert in production and exists so the recovery drills, which run as an
    // unprivileged CI user, can still reach a UID that is not their own.
    expect(initializeScript).toMatch(/sudo chown -R "\$\{APP_UID\}:\$\{APP_GID\}"/)
    expect(restoreScript).toMatch(/sudo chown -R "\$\{APP_UID\}:\$\{APP_GID\}"/)
    // Same default, same concept, in both scripts.
    expect(restoreScript).toMatch(/APP_UID="\$\{APP_UID:-10001\}"/)
    expect(restoreScript).toMatch(/APP_GID="\$\{APP_GID:-10001\}"/)
  })

  it('does not let an unreadable staging tree kill restore.sh silently', () => {
    // `find ... 2>/dev/null | head -5` under `set -euo pipefail`: a find that
    // cannot descend exits non-zero, fails the pipeline, fails the assignment
    // and kills the script -- with its stderr discarded and no message of its
    // own. The operator sees the restore stop after "extracting uploads" with
    // no idea whether anything was destroyed.
    const executable = withoutComments(restoreScript)
    expect(executable).not.toMatch(/find "\$staging"[^\n]*2>\/dev\/null \| head/)
    expect(executable).toMatch(/owner_probe_rc=\$\?/)
    expect(restoreScript).toMatch(/could not enumerate the staged uploads to verify their ownership/)
    expect(restoreScript).toMatch(/Nothing has been destroyed/)
  })

  it('keeps the assertion as the gate, not the chown or its fallback', () => {
    // The fallback must not become the thing that decides. A tree the sudo
    // chown could not fix, or one it "fixed" into modes the app still cannot
    // use, has to fail here.
    const executable = withoutComments(initializeScript)
    const chownAt = executable.indexOf('sudo chown -R')
    const gateAt = executable.indexOf('unwritable_count > 0')
    expect(chownAt).toBeGreaterThan(-1)
    expect(gateAt).toBeGreaterThan(chownAt)
  })

  it('asserts the resulting state rather than trusting chown\'s exit status', () => {
    // A partial `chown -R` can fail after succeeding on a thousand entries,
    // and a chown that "succeeds" on an untraversable tree is not the contract.
    expect(initializeScript).toMatch(/find "\$AAU_UPLOADS_PATH" -printf '%U\|%G\|%m\|%y\|%p/)
    expect(initializeScript).toMatch(/entry_rwx="\$\{entry_mode: -3\}"/)
    expect(initializeScript).toMatch(/\(\( class_digit & 2 \)\)/)
    // Directories need traversal as well as write.
    expect(initializeScript).toMatch(/\(\( class_digit & 1 \)\) \|\| writable=false/)
  })

  it('fails closed when the uploads tree cannot be enumerated at all', () => {
    // A `find` that dies mid-walk would produce fewer rows, every one of them
    // passing, and the contract would be declared satisfied on a tree nobody
    // inspected.
    expect(initializeScript).toMatch(/if ! uploads_inventory="\$\(find "\$AAU_UPLOADS_PATH"/)
    expect(initializeScript).toMatch(/could not enumerate \$\{AAU_UPLOADS_PATH\} to verify its ownership/)
  })
})

describe('production can never re-run the Neon migration', () => {
  it('keeps the Neon import structurally staging-only with no production override', () => {
    expect(neonImportScript).toMatch(/if aau_env_is_production; then/)
    expect(neonImportScript).toMatch(/STAGING ONLY/)
    expect(neonImportScript).toMatch(/\[\[ "\$AAU_ENV" == "staging" \]\]/)
    expect(neonImportScript).not.toMatch(/ALLOW_PRODUCTION|FORCE_PRODUCTION|AAU_ENV=production/)
  })

  it.each([
    ['deploy/scripts/deploy.sh', deployScript],
    ['deploy/scripts/backup.sh', backupScript],
    ['deploy/scripts/restore.sh', restoreScript],
    ['deploy/scripts/initialize-from-backup.sh', withoutComments(initializeScript)],
    ['.github/workflows/deploy-production.yml', deployWorkflow],
    ['.github/workflows/release-production.yml', releaseWorkflow],
  ])('%s cannot reach the Neon import', (_name, source) => {
    // Named entry points, not the word: restore.sh's baseline-recovery log
    // deliberately tells the operator that Neon was NOT involved, and
    // initialize-from-backup.sh documents that the import is unreachable from
    // it. Those sentences are the contract being kept, not broken.
    expect(source).not.toMatch(/neon-import|neon-export|neon\.dump/)
  })

  it('initializes production only from a verified platform backup', () => {
    // The one supported production data path. It consumes a backup.sh artifact
    // — manifest, checksums and metadata — and nothing else.
    expect(initializeScript).toMatch(/postgres\.dump/)
    expect(initializeScript).toMatch(/SHA256SUMS/)
    expect(initializeScript).toMatch(/MANIFEST/)
    expect(initializeScript).toMatch(/metadata\.json/)
    // And it is not a seed path.
    expect(withoutComments(initializeScript)).not.toMatch(/seed\.sh|SEED_MODE/)
  })
})

/**
 * One deployment engine, two environments.
 *
 * The invariant this PR is built on is that production reuses the machinery
 * staging has already exercised, and that the two differ only by the
 * environment descriptor. The way that invariant dies is gradually: one
 * `if production` here for a special case, another there, until there are two
 * deployment systems sharing a filename and only one of them has been proven.
 *
 * So the branching itself is bounded. Every environment conditional in the
 * shared engine must be a POLICY decision that is listed here by name; an
 * implementation that forks on the environment is not allowed to appear
 * silently.
 */
describe('staging and production run one deployment engine', () => {
  // The engine proper. Deliberately NOT lib/environment.sh, which IS the
  // environment resolver and is supposed to know the difference, and not the
  // four policy files enumerated in the next test.
  const SHARED_ENGINE = [
    'deploy/scripts/deploy.sh',
    'deploy/scripts/backup.sh',
    'deploy/scripts/compose.sh',
    'deploy/scripts/read-env.sh',
    'deploy/scripts/retention-report.sh',
    'deploy/scripts/lib/oplock.sh',
    'deploy/scripts/lib/writers.sh',
  ]

  // An environment conditional: a test on which environment this is, as opposed
  // to a value RESOLVED from it (every path, port and name is resolved, and
  // that is the mechanism, not a fork).
  const ENV_CONDITIONAL =
    /aau_env_is_production|\$\{?AAU_ENV\}?" *(==|!=) *"(production|staging)|case "\$\{?AAU_ENV\}?"/

  it.each(SHARED_ENGINE)('%s does not fork on the environment', (file) => {
    // These files run identically in both environments. Everything that
    // differs reaches them as a RESOLVED value -- a path, a port, a project
    // name -- so staging genuinely rehearses the production code path rather
    // than a sibling of it.
    expect(withoutComments(read(file))).not.toMatch(ENV_CONDITIONAL)
  })

  it('confines environment policy to the places it belongs', () => {
    // These are deliberate policy, each with a data-safety reason, and each is
    // a refusal rather than a different implementation:
    //
    //   restore.sh          a non-production backup may never overwrite
    //                       production, in either direction, with no override
    //   seed.sh             the canonical Seed is staging-only
    //   seed-entrypoint.sh  the same refusal, hard-bound on the host
    expect(restoreScript).toMatch(/if aau_env_is_production; then/)
    expect(read('deploy/scripts/seed.sh')).toMatch(/if aau_env_is_production; then/)
    expect(read('deploy/scripts/seed-entrypoint.sh')).toMatch(/\[\[ "\$AAU_ENV" == "staging" \]\]/)

    // initialize-from-backup.sh is the fourth, and is a lineage TABLE rather
    // than a fork: the pair of (target, source) environments is matched, so a
    // new environment cannot be waved through by falling off the end.
    expect(initializeScript).toMatch(/case "\$\{AAU_ENV\}:\$\{recorded_environment\}" in/)
    expect(initializeScript).toMatch(/production:staging\)/)
    expect(initializeScript).toMatch(/production:production\|staging:staging\)/)

    // deploy-entrypoint.sh is the fifth, and is the release TRUST BOUNDARY:
    // it maps the environment to the one GHCR package that environment may
    // run. That mapping is the whole point of separate packages, and it is
    // the same shape restore.sh enforces for a restore image.
    expect(entrypointScript).toMatch(/case "\$AAU_ENV" in/)
    expect(entrypointScript).toMatch(/is not the approved \$\{AAU_ENV\} channel/)

    // And the entrypoint derives AAU_ENV from its own installed path, never
    // from the caller -- otherwise a staging key could request a production
    // deployment simply by asking for one.
    expect(entrypointScript).toMatch(/readonly AAU_ENV=production/)
    expect(entrypointScript).toMatch(/readonly AAU_ENV=staging/)
  })

  it('gives each environment its own state, and shares none of it', () => {
    // The other half of one-engine: everything that must NOT be shared is
    // derived from AAU_ENV in exactly one place, so an environment cannot
    // inherit production's database, uploads, backups, lock or credentials.
    for (const name of [
      'AAU_ENV_ROOT', 'AAU_DEPLOY_ROOT', 'AAU_ENV_FILE', 'AAU_STATE_FILE',
      'AAU_LOCK_FILE', 'AAU_BACKUP_ROOT', 'AAU_UPLOADS_PATH',
      'AAU_PROJECT_NAME', 'AAU_APP_PORT', 'AAU_CANDIDATE_PORT',
      'AAU_DOCKER_CONFIG',
    ]) {
      expect(environmentScript).toMatch(new RegExp(`${name}="\\$\\{`))
    }
    // Separate registry credentials per environment: without this every docker
    // call shares /root/.docker/config.json and one login authorizes both
    // channels, undoing the package boundary the publish side is built on.
    expect(environmentScript).toMatch(/DOCKER_CONFIG="\$AAU_DOCKER_CONFIG"/)
  })
})
