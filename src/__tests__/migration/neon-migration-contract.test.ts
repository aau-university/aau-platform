import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const sha256 = (file: string) =>
  createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex')

const SIMULATION = 'migration/simulation'
const SCRIPTS = 'migration/scripts'

/**
 * The migration artifacts that were PROVEN against three fresh Neon copies of
 * `production` and against a real 619-object R2 export. They are pinned by
 * content hash rather than merely "not deleted": the productionization phase
 * wraps them, and the one thing it must never do is quietly rewrite the SQL
 * whose behaviour the rehearsal evidence describes.
 *
 * A failure here is not a reason to update the hash. It means either the
 * proven logic changed — which invalidates the recorded rehearsal results in
 * migration/simulation/README.md and needs a fresh rehearsal — or a defect was
 * found, in which case the README's evidence has to be re-established in the
 * same commit.
 */
const PROVEN_ARTIFACTS: Record<string, string> = {
  '00_preflight.sql': '2cacc7e3087b985292b87a62554353dcf788176a96d102f506338ebccd3b2aaa',
  '01_upgrade_working_copy.sql':
    'e67fbd8ce09b6b367e0999133e6b37bbce9c87752f095fb68dab55cdfa86f3e3',
  '02_verify.sql': '9ef0790bc13d75b20e36fc2bcd1e90730a3d7f98c2344236718179e422f66381',
  '03_public_media_manifest.csv':
    '9f4b28ed87f8df25ecf371c648ce2d8b1d01ff5e8b70e8e95c42c942dc7a1be4',
  // CHANGED DELIBERATELY, once, and the rehearsal evidence still stands.
  //
  // The downloader took its output root from argv[2] and began with
  // `rm -rf "$root"`. migration/RUNBOOK.md invokes it with a real path on the
  // staging VPS (`/srv/aau/staging/public-media`), so one mistyped argument
  // recursively deleted whatever was there — the live uploads tree included —
  // before a single byte was downloaded. It now refuses a non-empty output
  // directory, which is the rule migration/scripts/neon-export.sh already
  // applies to an export directory, with no override.
  //
  // Why the recorded rehearsal results are not invalidated: the change adds a
  // PRE-FLIGHT REFUSAL and alters nothing on the path the rehearsal took. The
  // 619-object run wrote into a fresh directory, so the new check passes and
  // every byte downloaded, every size compared and every checksum emitted is
  // produced by unchanged code. Covered by the "public-media downloader never
  // deletes an output root" section of tests/migration/neon-migration-contract-drill.sh,
  // which exercises the refusal for real and asserts the existing content
  // survives it.
  //
  // Amended a second time, for the same reason and with the same reasoning:
  // the refusal read `await stat(root).catch(() => null)`, which turns EACCES
  // or EIO — "I could not look" — into "nothing is there" and walks straight
  // past the non-empty check into a directory whose contents were never
  // observed. A guard that cannot distinguish those two states is not a guard.
  // Only ENOENT is now treated as an absent root; every other error
  // propagates. Still pre-flight only, still nothing on the path the 619-object
  // rehearsal took, so that evidence continues to stand.
  '04_fetch_public_media.mjs':
    '2afd5e58d674f8a6e4d507449f027bf79ab630a61c635bdde64d3b1e12b2755a',
}

const contract = (() => {
  const values: Record<string, string> = {}
  for (const line of read('migration/source-contract.env').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    values[trimmed.slice(0, trimmed.indexOf('='))] = trimmed.slice(trimmed.indexOf('=') + 1)
  }
  return values
})()

/** Manifest rows, parsed the same way 04_fetch_public_media.mjs parses them. */
const manifestRows = (() => {
  const text = read(`${SIMULATION}/03_public_media_manifest.csv`)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...data] = rows.filter((r) => r.length && r.some((v) => v !== ''))
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
})()

describe('the proven migration artifacts are preserved', () => {
  it.each(Object.entries(PROVEN_ARTIFACTS))('%s is byte-identical to the rehearsed version', (
    file,
    hash,
  ) => {
    expect(sha256(`${SIMULATION}/${file}`)).toBe(hash)
  })

  it('keeps the rehearsal README and its recorded evidence', () => {
    const readme = read(`${SIMULATION}/README.md`)
    expect(readme).toContain('Private Media is intentionally excluded from file migration')
    expect(readme).toContain('619')
    expect(readme).toContain('62,447,631')
  })
})

describe('the frozen source contract matches the committed manifest', () => {
  it('records the freeze rather than a refreshable snapshot', () => {
    expect(contract.NEON_SOURCE_FREEZE_DATE).toBe('2026-09-07')
    expect(contract.NEON_SOURCE_REFERENCE_COMMIT).toBe(
      '474728e9045e3a0bdee1e3601d0ba4b7a49b7b1e',
    )
  })

  it('agrees with the manifest on object count, originals and total bytes', () => {
    expect(manifestRows).toHaveLength(Number(contract.PUBLIC_MEDIA_OBJECTS))
    expect(manifestRows.filter((r) => r.variant === 'original')).toHaveLength(
      Number(contract.PUBLIC_MEDIA_ORIGINALS),
    )
    const bytes = manifestRows.reduce((sum, r) => sum + Number(r.expected_filesize), 0)
    expect(bytes).toBe(Number(contract.PUBLIC_MEDIA_BYTES))
  })

  it('has one public media row per original, and one target path per object', () => {
    expect(new Set(manifestRows.map((r) => r.media_id)).size).toBe(
      Number(contract.SOURCE_MEDIA_ROWS),
    )
    expect(new Set(manifestRows.map((r) => r.target_relative_path)).size).toBe(
      Number(contract.PUBLIC_MEDIA_OBJECTS),
    )
  })

  it('sources every object from the one frozen R2 origin, into uploads/media only', () => {
    const origin = `https://${contract.SOURCE_PUBLIC_MEDIA_HOST}/media/`
    for (const row of manifestRows) {
      expect(row.source_url.startsWith(origin)).toBe(true)
      expect(row.target_relative_path.startsWith('media/')).toBe(true)
      // A traversal in a manifest path would write outside the uploads tree.
      expect(row.target_relative_path).not.toContain('..')
      expect(Number(row.expected_filesize)).toBeGreaterThan(0)
    }
  })

  it('states that Private Media binaries are out of scope', () => {
    expect(contract.PRIVATE_MEDIA_BINARIES_MIGRATED).toBe('false')
  })

  it('carries the Golden target invariants the rehearsal measured', () => {
    expect(contract).toMatchObject({
      TARGET_TABLES: '346',
      TARGET_COLUMNS: '2584',
      TARGET_ENUM_TYPES: '113',
      TARGET_CONSTRAINTS: '1981',
      TARGET_INDEXES: '1285',
      TARGET_SEQUENCES: '280',
      TARGET_MIGRATION_LEDGER:
        '20260809_020424_baseline:1,20260815_025241_one_study_plan_per_program:1',
    })
  })

  it('adopts exactly the migrations this repository ships', () => {
    const ledger = contract.TARGET_MIGRATION_LEDGER.split(',').map((e) => e.split(':')[0])
    const index = read('src/migrations/index.ts')
    const upgrade = read(`${SIMULATION}/01_upgrade_working_copy.sql`)
    for (const entry of contract.TARGET_MIGRATION_LEDGER.split(',')) {
      const [name, batch] = entry.split(':')
      expect(index).toContain(name)
      expect(upgrade).toContain(`('${name}',${batch})`)
    }
    expect(ledger).toHaveLength(2)
  })
})

describe('the rewrite covers every public media URL column', () => {
  // Stage 4 rewrites the R2 origin out of the media table. If the schema ever
  // grows another size variant, the rewrite and the residual-URL check must
  // grow with it together — a column rewritten but not verified would pass
  // silently, and one verified but not rewritten would fail every run.
  const upgrade = read(`${SIMULATION}/01_upgrade_working_copy.sql`)
  const stage4 = upgrade.slice(upgrade.indexOf('-- Stage 4'))
  const residual = read(`${SCRIPTS}/sql/target_contract.sql`)
  const columns = [
    'url',
    'thumbnail_u_r_l',
    'sizes_thumbnail_url',
    'sizes_square_url',
    'sizes_small_url',
    'sizes_medium_url',
    'sizes_large_url',
    'sizes_xlarge_url',
    'sizes_og_url',
  ]

  it.each(columns)('%s is rewritten and then checked for residual R2 URLs', (column) => {
    expect(stage4).toContain(`${column} =`)
    expect(residual).toContain(`coalesce(${column},'') LIKE 'http%'`)
  })

  it('rewrites to the local Payload media route', () => {
    expect(stage4).toContain(contract.TARGET_LOCAL_MEDIA_PREFIX)
    expect(read(`${SIMULATION}/02_verify.sql`)).toContain('^/api/media/file/')
  })

  it('leaves Private Media rows alone', () => {
    expect(stage4).not.toContain('private_media')
    expect(stage4).toContain('public.media')
  })
})

describe('the import is staging-only and fails closed', () => {
  const importScript = read(`${SCRIPTS}/neon-import.sh`)

  it('refuses production with no override of any kind', () => {
    expect(importScript).toContain('aau_env_is_production')
    expect(importScript).toContain('STAGING ONLY')
    expect(importScript).toContain('[[ "$AAU_ENV" == "staging" ]]')
    // The acknowledgement lets an operator confirm they mean staging. It must
    // never be spelled in a way that also unlocks production.
    expect(importScript).toContain('I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT')
    expect(importScript).not.toMatch(/ALLOW_PRODUCTION|FORCE_PRODUCTION|AAU_ENV=production/)
  })

  it('reuses the proven deployment libraries rather than reimplementing them', () => {
    for (const lib of [
      'lib/environment.sh',
      'lib/oplock.sh',
      'lib/writers.sh',
      'read-env.sh',
    ]) {
      expect(importScript).toContain(`deploy/scripts/${lib}`)
    }
    expect(importScript).toContain('writers_freeze')
    expect(importScript).toContain('oplock_acquire')
    expect(importScript).toContain('set_app_login NOLOGIN')
  })

  it('runs the proven SQL, in order, against a scratch database first', () => {
    const order = ['00_preflight.sql', '01_upgrade_working_copy.sql', '02_verify.sql'].map((f) =>
      importScript.indexOf(f),
    )
    expect(order.every((i) => i > 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(importScript).toContain('SCRATCH_DB')
    // Promotion is two renames, so the pre-import database survives as the
    // rollback. The renames themselves live in lib/promote.sh so the window
    // between them can be fault-injected; nothing here drops the live database.
    expect(importScript).toContain(
      'promote_database "$POSTGRES_DB" "$PREVIOUS_DB" "$SCRATCH_DB"',
    )
    expect(read(`${SCRIPTS}/lib/promote.sh`)).toContain('rename_database "$live" "$previous"')
    expect(importScript).not.toMatch(/DROP DATABASE\s+:"(live|previous)"/)
    // The only DROP SCHEMA in this script prepares the SCRATCH database as an
    // empty restore target. Nothing here ever drops a schema in the live one —
    // that is what makes the promotion a rename rather than a destruction.
    const drops = (importScript.match(/DROP SCHEMA[^\n]*/g) ?? []).map((d) => d.trim())
    expect(drops).toHaveLength(1)
    expect(drops[0]).toContain('DROP SCHEMA IF EXISTS public;')
    expect(drops[0]).not.toContain('CASCADE')
    // ...and it is aimed at the scratch database, never the live one.
    expect(importScript).toMatch(
      /DROP SCHEMA IF EXISTS public;[\s\S]{0,300}-d "\$SCRATCH_DB"/,
    )
  })

  it('verifies the dump, the media and the target before promoting', () => {
    expect(importScript).toContain('sha256sum --check --status SHA256SUMS')
    expect(importScript).toContain('pg_restore --list')
    expect(importScript).toContain('verify-public-media.sh')
    expect(importScript).toContain('contract_verdict "the restored source"')
    expect(importScript).toContain('contract_verdict "the migrated database"')
    expect(importScript).toContain('private_media rows preserved')
  })

  it('runs only on the deployed staging release, with no override', () => {
    // The image comes from the release-state file and nowhere else. An override
    // existed here and was removed: it let the rehearsal run against a build
    // nobody had deployed, which is evidence about a configuration that exists
    // nowhere — and it bypassed the channel check entirely for a local tag,
    // because that check was conditional on the reference starting with ghcr.io.
    expect(importScript).toContain('IMPORT_IMAGE="$(aau_state_image)"')
    expect(importScript).not.toContain('${NEON_IMPORT_IMAGE:-$(aau_state_image)}')
    // Setting the removed variable is a hard error, never a silent no-op.
    expect(importScript).toContain('has no image override')
    // The old permissive form must not come back.
    expect(importScript).not.toContain('if [[ "$IMPORT_IMAGE" == ghcr.io/* ]]; then')
  })

  it('requires an immutable digest in the exact staging package', () => {
    expect(importScript).toContain(
      "readonly EXPECTED_IMPORT_REPO='ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging'",
    )
    // The same shape check deploy-entrypoint.sh makes, because it is the same
    // invariant: in this deployment a release IS a digest.
    expect(importScript).toContain('@sha256:([a-f0-9]{64})$')
    const entrypoint = read('deploy/scripts/deploy-entrypoint.sh')
    expect(entrypoint).toContain('ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging')
    expect(entrypoint).toContain('@sha256:([a-f0-9]{64})$')
  })
})

describe('the scratch database is a clean restore target', () => {
  const importScript = read(`${SCRIPTS}/neon-import.sh`)
  // This file EXPLAINS why --clean and --if-exists are not used, so assertions
  // about what the RESTORE does must ignore comment lines or they would find
  // those words in the explanation and report the opposite of the truth.
  const code = importScript
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')

  it('creates the scratch database from template0', () => {
    // template1 is the cluster's local template; anything ever installed into
    // it would be copied into a database that is about to become the live one.
    expect(code).toContain(
      'CREATE DATABASE :"scratch" OWNER :"app_user" TEMPLATE template0;',
    )
  })

  it('drops the default public schema before the restore', () => {
    // The Neon archive carries its own CREATE SCHEMA public — pg_dump emits it
    // whenever that schema is owned by a non-bootstrap role, which it is on
    // Neon — so the restore target has to be genuinely empty.
    expect(code).toContain('DROP SCHEMA IF EXISTS public;')
    // No CASCADE: the schema on a just-created database is empty, and anything
    // else in there was not put there by this script.
    expect(code).not.toContain('DROP SCHEMA IF EXISTS public CASCADE')
  })

  it('does not weaken the restore to get past the collision', () => {
    expect(code).toContain('--exit-on-error')
    expect(code).not.toContain('--clean')
    expect(code).not.toContain('--if-exists')
    // Scoped to the RESTORING invocation. The separate `pg_restore --list`
    // readability probe legitimately ends in `|| true` because its result is
    // checked explicitly afterwards.
    const restore = code.slice(code.indexOf('pg_restore --no-owner --role "$APP_DB_USER"'))
    const restoreStmt = restore.slice(0, restore.indexOf('log "dump restored'))
    expect(restoreStmt).toContain('|| fail')
    expect(restoreStmt).not.toContain('|| true')
  })

  it('applies the AAU privilege contract after the restore, not before', () => {
    // The archive recreated `public`, so anything applied to the original
    // schema is gone; and the export is taken with --no-privileges, so the
    // archive carries no ACLs of its own.
    const restoreAt = code.indexOf('pg_restore --no-owner --role "$APP_DB_USER"')
    const privAt = code.indexOf('ALTER SCHEMA public OWNER TO :"app_user";')
    const dropAt = code.indexOf('DROP SCHEMA IF EXISTS public;')
    const createAt = code.indexOf('TEMPLATE template0;')
    expect(createAt).toBeGreaterThan(-1)
    expect(createAt).toBeLessThan(dropAt)
    expect(dropAt).toBeLessThan(restoreAt)
    expect(restoreAt).toBeLessThan(privAt)
    expect(code).toContain('REVOKE CREATE ON SCHEMA public FROM PUBLIC;')
    expect(code).toContain("GRANT ALL PRIVILEGES ON DATABASE %I TO %I")
  })

  it('verifies the promoted database keeps the live encoding and collation', () => {
    // Changing the template changes where encoding/collation are inherited
    // from, and this database is renamed over the live one.
    expect(code).toContain('datcollate')
    expect(code).toContain("encoding/collation does not match")
  })

  it('matches the flags the export actually produces', () => {
    // The archive has no owners and no ACLs, which is exactly why the privilege
    // contract above has to be applied by hand.
    const exportScript = read(`${SCRIPTS}/neon-export.sh`)
    expect(exportScript).toContain('--no-owner --no-privileges')
    expect(exportScript).toContain('--schema=public')
  })
})

describe('the database promotion cannot strand or delete staging', () => {
  const promote = read(`${SCRIPTS}/lib/promote.sh`)
  const importScript = read(`${SCRIPTS}/neon-import.sh`)

  it('checks each rename separately so the window is distinguishable', () => {
    // One psql invocation for both renames cannot tell "nothing happened" from
    // "the live database is gone", and those need opposite handling.
    expect(promote).toContain('if ! rename_database "$live" "$previous"; then')
    expect(promote).toContain('if rename_database "$scratch" "$live"; then')
    expect(importScript).not.toContain(
      String.raw`ALTER DATABASE :"live" RENAME TO :"previous";\nALTER DATABASE`,
    )
  })

  it('rolls the original database name back automatically', () => {
    expect(promote).toContain('if rename_database "$previous" "$live"; then')
    const rollbackAt = promote.indexOf('rename_database "$previous" "$live"')
    expect(rollbackAt).toBeGreaterThan(0)
    // The unrecoverable state is reported only AFTER the rollback was
    // attempted. Searched from the rollback onwards rather than pinned to an
    // exact indentation, because promote_database also reports that state from
    // the step-1 reconciliation, which sits earlier in the file.
    const criticalAt = promote.indexOf('promotion_state=live_renamed', rollbackAt)
    expect(criticalAt).toBeGreaterThan(rollbackAt)
  })

  it('captures the promotion status without tripping set -e', () => {
    // A bare call that returns non-zero aborts under `set -e`, skipping every
    // diagnostic below it — including the automatic rollback's "nothing was
    // lost". Only the `||` (or `if`) form suspends it.
    expect(importScript).toContain(
      'promote_database "$POSTGRES_DB" "$PREVIOUS_DB" "$SCRATCH_DB" || promotion_status=$?',
    )
    expect(importScript).not.toMatch(
      /promote_database "\$POSTGRES_DB" "\$PREVIOUS_DB" "\$SCRATCH_DB"\npromotion_status=\$\?/,
    )
  })

  it('tracks the three states the cleanup path depends on', () => {
    for (const state of ['none', 'live_renamed', 'promoted']) {
      expect(promote).toContain(`promotion_state=${state}`)
    }
  })

  it('never drops the migrated database while the live name is missing', () => {
    // Both halves: the state flag AND a direct catalog check, because they can
    // only disagree when something outside this script moved a database — which
    // is exactly when guessing is worst.
    expect(importScript).toContain(
      'if [[ "$promotion_state" != "none" ]] || ! db_exists "$POSTGRES_DB"; then',
    )
    expect(importScript).toContain('REFUSING to drop ${SCRATCH_DB}')
    expect(importScript).toContain('SELECT 1 FROM pg_database WHERE datname')
  })

  it('lifts the LOGIN barrier independently of the live database name', () => {
    // ALTER ROLE is cluster-level, so it is issued against `postgres`. A barrier
    // that could only be lifted by connecting to a database that a failed
    // promotion had renamed would strand the app role NOLOGIN.
    const setLogin = importScript.slice(
      importScript.indexOf('set_app_login() {'),
      importScript.indexOf('# db_exists <name>'),
    )
    expect(setLogin).toContain('-d postgres')
    expect(setLogin).not.toContain('-d "$POSTGRES_DB"')
    // Asserted as an ORDER rather than an exact string: the handler legitimately
    // gained a third step (removing the staged uploads tree), and an exact match
    // would have to be edited every time it does — which is how an assertion
    // quietly stops meaning anything. What matters is that LOGIN is restored
    // FIRST, so the application role is usable even if a later step refuses and
    // exits early.
    // Two shapes, because `[^}]*` alone cannot span a body containing a
    // parameter expansion such as `${SCRATCH_DB}` — it would stop at the first
    // brace and silently truncate. The one-line form is what the script uses
    // today; the multi-line form keeps this honest if it is ever reformatted.
    // Both leave cleanupBody empty on no match, and the assertions below then
    // fail — this degrades to a failure, never to a pass.
    const cleanupBody =
      /^cleanup\(\)\s*\{(.*)\}\s*$/m.exec(importScript)?.[1] ??
      /^cleanup\(\)\s*\{\n([\s\S]*?)\n\}$/m.exec(importScript)?.[1] ??
      ''
    expect(cleanupBody).toContain('restore_app_login')
    expect(cleanupBody).toContain('drop_scratch')
    expect(cleanupBody.indexOf('restore_app_login')).toBeLessThan(
      cleanupBody.indexOf('drop_scratch'),
    )
  })
})

describe('the export is a one-time dump of a frozen source', () => {
  const exportScript = read(`${SCRIPTS}/neon-export.sh`)

  it('takes a real custom-format dump with the pinned PostgreSQL 18 client', () => {
    expect(exportScript).toContain('pg_dump')
    expect(exportScript).toContain('--format=custom')
    expect(exportScript).toContain('postgres:18.6-bookworm@sha256:')
    const vps = read('deploy/docker-compose.vps.yml')
    const pinned = exportScript.match(/postgres:18\.6-bookworm@sha256:[a-f0-9]{64}/)?.[0]
    expect(pinned).toBeTruthy()
    // The dump is produced by the SAME server version that will restore it.
    expect(vps).toContain(pinned as string)
  })

  it('writes an integrity envelope and proves the archive is readable', () => {
    for (const artifact of ['MANIFEST', 'SHA256SUMS', 'metadata.json']) {
      expect(exportScript).toContain(artifact)
    }
    expect(exportScript).toContain('pg_restore --list')
    expect(exportScript).toContain('neon-source-export')
  })

  it('asserts the frozen contract against the live source before dumping', () => {
    // Both must EXIST before their order means anything: a missing
    // contract_verdict gives indexOf -1, which is less than any real index, so
    // the ordering assertion passed on a script that no longer checked the
    // source contract at all.
    const contractAt = exportScript.indexOf('contract_verdict')
    const dumpAt = exportScript.indexOf('pg_dump "$SOURCE_URL"')
    expect(contractAt).toBeGreaterThan(-1)
    expect(dumpAt).toBeGreaterThan(-1)
    expect(contractAt).toBeLessThan(dumpAt)
  })

  it('builds no synchronisation machinery for a frozen source', () => {
    const tooling = [
      exportScript,
      read(`${SCRIPTS}/neon-import.sh`),
      read(`${SCRIPTS}/lib/contract.sh`),
    ].join('\n')
    expect(tooling).not.toMatch(/logical replication|CREATE PUBLICATION|CREATE SUBSCRIPTION|wal2json|pgoutput/i)
  })
})

describe('the canonical deployment core is untouched', () => {
  // The Neon import is deliberately a separate entry point. restore.sh is the
  // recovery path for backups this platform produced; teaching it to accept a
  // raw Neon dump would weaken the checks that make recovery trustworthy.
  //
  // The contract is that the deployment core cannot REACH the Neon tooling.
  // These are its named entry points and artifacts: a core file that mentions
  // none of them cannot invoke the migration however it is edited.
  const NEON_ENTRY_POINTS = /neon-import|neon-export|neon\.dump|migration\/scripts|migration\/simulation/i

  it.each([
    'deploy/scripts/restore.sh',
    'deploy/scripts/deploy.sh',
    'deploy/scripts/backup.sh',
    'deploy/scripts/seed.sh',
    'deploy/scripts/compose.sh',
    'deploy/docker-compose.vps.yml',
    'docker-compose.prod.yml',
    'Dockerfile',
  ])('%s cannot reach the Neon migration', (file) => {
    expect(read(file)).not.toMatch(NEON_ENTRY_POINTS)
  })

  // The files that have no operator-facing incident guidance keep the blunter
  // rule as well: for them the word itself has no legitimate reason to appear,
  // so its absence is a cheap tripwire worth keeping.
  it.each([
    'deploy/scripts/backup.sh',
    'deploy/scripts/seed.sh',
    'deploy/scripts/compose.sh',
    'deploy/docker-compose.vps.yml',
    'docker-compose.prod.yml',
    'Dockerfile',
  ])('%s does not mention Neon at all', (file) => {
    expect(read(file).toLowerCase()).not.toContain('neon')
  })

  // deploy.sh and restore.sh are the two exceptions, and only in one direction.
  // The first production deployment onto an imported baseline is exactly when
  // an operator might reach for the Neon import to "start again", so the
  // incident guidance names it in order to FORBID it. Every occurrence in these
  // two files must be part of such an instruction — never a code path.
  it.each(['deploy/scripts/restore.sh', 'deploy/scripts/deploy.sh'])(
    '%s mentions Neon only to rule it out',
    (file) => {
      const lines = read(file).split('\n').filter((line) => /neon/i.test(line))
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines) {
        // Guidance, not execution: a log line or a comment, and one that says
        // the import is NOT what happened or NOT what to do next.
        expect(line, `must be guidance: ${line}`).toMatch(/^\s*(#|log ")/)
        expect(line, `must forbid, not invoke: ${line}`).toMatch(/\bNOT\b|\bnever\b|\bunreachable\b/)
      }
    },
  )

  it('keeps the Neon import out of the canonical restore contract', () => {
    expect(read('deploy/scripts/restore.sh')).toContain('postgres.dump')
    expect(read(`${SCRIPTS}/neon-import.sh`)).toContain('neon.dump')
  })
})

describe('CI runs the migration drills', () => {
  it.each([
    'bash tests/migration/neon-migration-contract-drill.sh',
    'bash tests/migration/neon-promotion-drill.sh',
    'bash tests/migration/neon-scratch-restore-drill.sh',
  ])('%s is wired into the release gate', (step) => {
    expect(read('.github/workflows/release-gate.yml')).toContain(step)
  })
})
