#!/usr/bin/env bash
# Import the frozen Neon export into the STAGING VPS stack — the real rehearsal.
#
# ── Relationship to deploy/scripts/restore.sh ─────────────────────────────
# This is deliberately a SEPARATE path. restore.sh is the canonical AAU
# recovery path: it restores a backup this platform produced, of this
# platform's own final schema, paired with the image that made it. A raw Neon
# dump is none of those things — it carries the OLD schema, no migration
# ledger, and R2 media URLs — so teaching restore.sh to accept one would mean
# weakening the checks that make recovery trustworthy, on the path used at 3am.
# The two share their libraries (environment/oplock/writers/read-env) and their
# ordering discipline; they do not share their entry point.
#
# ── Build-then-promote, so nothing is destroyed until everything passed ───
# The whole migration is performed in a SCRATCH database alongside the live
# one, and promoted with two `ALTER DATABASE ... RENAME`s only after the source
# contract, the upgrade and the target verification have all passed:
#
#   create scratch -> pg_restore -> source contract -> 01_upgrade -> verify
#   -> [ freeze writers -> rename live aside -> rename scratch into place
#        -> swap uploads ] -> restart
#
# Every fallible and expensive step is outside the brackets. A failure before
# the brackets leaves staging EXACTLY as it was — not "mostly", exactly — and
# the rollback afterwards is a rename back, not a restore.
#
# ── Staging only ──────────────────────────────────────────────────────────
# There is no acknowledgement string that runs this against production. The
# production cutover is a separate, later decision with its own plan; making it
# reachable from here by typing one more variable is how it happens by accident.
#
# Usage:
#   AAU_ENV=staging \
#   ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
#     migration/scripts/neon-import.sh <export-dir> <public-media-root>
#
# See migration/RUNBOOK.md for the full procedure and the rollback.

set -euo pipefail

readonly HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly MIGRATION_ROOT="$(cd "${HERE}/.." && pwd)"
readonly REPO_ROOT="$(cd "${MIGRATION_ROOT}/.." && pwd)"
readonly DEPLOY_SCRIPTS="${REPO_ROOT}/deploy/scripts"

# shellcheck source=deploy/scripts/lib/environment.sh
source "${DEPLOY_SCRIPTS}/lib/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${DEPLOY_SCRIPTS}/lib/oplock.sh"
# shellcheck source=deploy/scripts/lib/writers.sh
source "${DEPLOY_SCRIPTS}/lib/writers.sh"
# shellcheck source=deploy/scripts/read-env.sh
source "${DEPLOY_SCRIPTS}/read-env.sh"
# shellcheck source=migration/scripts/lib/contract.sh
source "${HERE}/lib/contract.sh"
# shellcheck source=migration/scripts/lib/promote.sh
source "${HERE}/lib/promote.sh"

readonly IMPORT_ACK='I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT'
readonly NO_BACKUP_ACK='I-ACCEPT-NO-PRE-IMPORT-BACKUP'

log() { printf '[neon-import] %s\n' "$*" >&2; }
fail() { printf '[neon-import] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 2 ]] || fail "usage: $0 <export-dir> <public-media-root>"
readonly SOURCE="$1"
readonly MEDIA_ROOT="$2"
readonly DUMP="${SOURCE}/neon.dump"

#############################################################################
# PHASE 0 — the staging-only safety guard. Before anything else, including
#           reading secrets or touching docker.
#############################################################################
aau_env_resolve

if aau_env_is_production; then
  fail "REFUSING: this is the Neon migration rehearsal and it runs against STAGING ONLY.

  The resolved environment is '${AAU_ENV}'. There is no override for this — not
  a variable, not a flag. A raw Neon dump carries the OLD schema and no
  migration ledger; importing it into production is not a migration, it is an
  outage with a data-loss tail.

  If AAU_ENV was simply unset, note that it DEFAULTS to production. Re-run with:

      AAU_ENV=staging ${ALLOW_NEON_IMPORT:+ALLOW_NEON_IMPORT=<ack> }$0 ${SOURCE} ${MEDIA_ROOT}"
fi
[[ "$AAU_ENV" == "staging" ]] \
  || fail "REFUSING: unsupported environment '${AAU_ENV}'; this rehearsal is staging-only"

if [[ "${ALLOW_NEON_IMPORT:-}" != "$IMPORT_ACK" ]]; then
  fail "this replaces the ENTIRE staging database and the staging uploads tree with the
  frozen Neon content. That is deliberate, so it is not a boolean:

      AAU_ENV=staging \\
      ALLOW_NEON_IMPORT=${IMPORT_ACK} \\
        $0 ${SOURCE} ${MEDIA_ROOT}"
fi

contract_load || fail "could not load the frozen source contract"
log "environment: ${AAU_ENV} (project ${AAU_PROJECT_NAME})"
log "frozen source contract: ${CONTRACT_NEON_SOURCE_FREEZE_DATE} (${CONTRACT_FILE})"

[[ -d "$SOURCE" ]] || fail "no such export directory: ${SOURCE}"
[[ -s "$DUMP" ]] || fail "missing or empty ${DUMP}"
[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

oplock_acquire "$AAU_LOCK_FILE" "neon-import(${AAU_ENV})" \
  || fail "refusing to import while another operation is running"

POSTGRES_ADMIN_USER="$(require_env_var "$AAU_ENV_FILE" POSTGRES_ADMIN_USER)" \
  || fail "POSTGRES_ADMIN_USER missing from ${AAU_ENV_FILE}"
POSTGRES_DB="$(require_env_var "$AAU_ENV_FILE" POSTGRES_DB)" \
  || fail "POSTGRES_DB missing from ${AAU_ENV_FILE}"
APP_DB_USER="$(require_env_var "$AAU_ENV_FILE" APP_DB_USER)" \
  || fail "APP_DB_USER missing from ${AAU_ENV_FILE}"
APP_DB_PASSWORD="$(require_env_var "$AAU_ENV_FILE" APP_DB_PASSWORD)" \
  || fail "APP_DB_PASSWORD missing from ${AAU_ENV_FILE}"
readonly UPLOADS_PATH="$AAU_UPLOADS_PATH"

readonly STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
readonly SCRATCH_DB="${POSTGRES_DB}_neon_${STAMP}"
readonly PREVIOUS_DB="${POSTGRES_DB}_pre_neon_${STAMP}"
# PostgreSQL identifiers are truncated at 63 bytes, and a truncated database
# name is a different database than the one the rollback instructions name.
for candidate in "$SCRATCH_DB" "$PREVIOUS_DB"; do
  (( ${#candidate} <= 63 )) \
    || fail "derived database name '${candidate}' exceeds PostgreSQL's 63-byte identifier limit;
  shorten POSTGRES_DB before running the import"
done

compose() {
  env \
    APP_IMAGE="${APP_IMAGE:-$(aau_state_image)}" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

# psql as the admin role. `$1` is the database, `$2` the statement.
psql_db() {
  compose exec -T postgres-prod \
    psql -U "$POSTGRES_ADMIN_USER" -d "$1" -v ON_ERROR_STOP=1 -Atc "$2"
}

# Identifiers are interpolated with psql's :"var" quoting, never concatenated,
# for the same reason restore.sh does it: a value that arrives from a file must
# not be able to become SQL.
psql_maint() {
  compose exec -T postgres-prod \
    psql -U "$POSTGRES_ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -Atq \
      -v scratch="$SCRATCH_DB" -v previous="$PREVIOUS_DB" \
      -v live="$POSTGRES_DB" -v app_user="$APP_DB_USER"
}

# LOGIN is a CLUSTER-level property (pg_authid), so this is issued against the
# `postgres` maintenance database rather than the application one. That is not a
# stylistic choice: a failed promotion can leave the application database under
# a DIFFERENT NAME for a moment, and a barrier that can only be lifted by
# connecting to a database that no longer exists would strand the application
# role NOLOGIN exactly when recovery needs it most. `postgres` is the same
# database psql_maint uses and always exists.
set_app_login() {
  printf 'ALTER ROLE :"role" %s;\n' "$1" \
    | compose exec -T postgres-prod \
        psql -U "$POSTGRES_ADMIN_USER" -d postgres \
          -v ON_ERROR_STOP=1 -v role="$APP_DB_USER" -Atq
}

# db_exists <name> — true only when a database with EXACTLY that name is
# present. Used to CONFIRM, rather than assume, that the live database is where
# it should be before anything is dropped.
db_exists() {
  local found
  found="$(printf "SELECT 1 FROM pg_database WHERE datname = :'name';\n" \
    | compose exec -T postgres-prod \
        psql -U "$POSTGRES_ADMIN_USER" -d postgres \
          -v ON_ERROR_STOP=1 -Atq -v name="$1" 2>/dev/null || true)"
  [[ "${found//[[:space:]]/}" == "1" ]]
}

# rename_database <from> <to> — one rename, individually checked. Identifiers go
# through psql's :"var" quoting, never string concatenation.
rename_database() {
  printf 'ALTER DATABASE :"from" RENAME TO :"to";\n' \
    | compose exec -T postgres-prod \
        psql -U "$POSTGRES_ADMIN_USER" -d postgres \
          -v ON_ERROR_STOP=1 -Atq -v from="$1" -v to="$2" >/dev/null
}

app_tcp_login_probe() {
  compose exec -T -e PGPASSWORD="$APP_DB_PASSWORD" postgres-prod \
    psql -h 127.0.0.1 -p 5432 -U "$APP_DB_USER" -d "$POSTGRES_DB" \
      -Atc "select 'APP_LOGIN_OK'" 2>&1 || true
}

# Same reasoning as restore.sh: if this script dies with the app role NOLOGIN,
# the safety mechanism itself becomes the outage.
app_login_disabled=false
restore_app_login() {
  [[ "$app_login_disabled" == "true" ]] || return 0
  set_app_login LOGIN >/dev/null 2>&1 \
    || log "WARNING: could not restore LOGIN for ${APP_DB_USER}; run 'ALTER ROLE \"${APP_DB_USER}\" LOGIN' as ${POSTGRES_ADMIN_USER}"
  app_login_disabled=false
}

# `promotion_state` (none | live_renamed | promoted) is defined and maintained by
# lib/promote.sh; the cleanup path below reads it.

# A scratch database left behind after a failure is confusing at best and a disk
# leak at worst, so it is dropped on any exit before promotion.
#
# But dropping it is only safe while the live database is genuinely still there.
# In the `live_renamed` window the scratch database is the ONLY copy carrying the
# migrated content, and the live name does not exist — dropping it there would
# turn a recoverable failed rename into staging with no application database at
# all. So this refuses on the state flag AND on a direct catalog check, because
# the two can only disagree if something outside this script moved a database,
# and that is precisely when guessing is worst.
scratch_created=false
drop_scratch() {
  [[ "$scratch_created" == "true" ]] || return 0

  if [[ "$promotion_state" != "none" ]] || ! db_exists "$POSTGRES_DB"; then
    log "REFUSING to drop ${SCRATCH_DB}: the live database ${POSTGRES_DB} is not in place"
    log "  ${SCRATCH_DB} holds the migrated content and is the only copy of it."
    log "  Repair the database names by hand before dropping anything:"
    log "    docker compose -p ${AAU_PROJECT_NAME} exec postgres-prod \\"
    log "      psql -U ${POSTGRES_ADMIN_USER} -d postgres -c '\\l'"
    return 0
  fi

  log "dropping the scratch database ${SCRATCH_DB}"
  printf 'DROP DATABASE IF EXISTS :"scratch" WITH (FORCE);\n' | psql_maint >/dev/null 2>&1 || true
  scratch_created=false
}
# Order matters: LOGIN is restored FIRST, so the application role is usable even
# if the drop path below decides to refuse and exit early.
# The staged Public Media tree is a full second copy of the media — ~62 MB — and
# it is written before promotion. Every `fail` between staging it and completing
# the swap would otherwise leave it behind on the host, under a PID-suffixed
# name nobody will recognise later. It is removed on any exit that did NOT
# promote; once the swap has completed the path holds the PREVIOUS tree, which
# is the rollback material and must survive.
staged_uploads_path=""
drop_staged_uploads() {
  [[ -n "$staged_uploads_path" ]] || return 0
  [[ "$promotion_state" == "none" ]] || return 0
  rm -rf "$staged_uploads_path"
  staged_uploads_path=""
}
cleanup() { restore_app_login; drop_scratch; drop_staged_uploads; }
trap cleanup EXIT

#############################################################################
# PHASE 1 — verify the export. Nothing here touches staging state.
#############################################################################
manifest="${SOURCE}/MANIFEST"
[[ -f "$manifest" ]] || fail "missing ${manifest}; this is not a neon-export.sh archive.
  Produce the export with migration/scripts/neon-export.sh, which writes the
  MANIFEST, SHA256SUMS and metadata.json this import requires."
missing=()
while IFS= read -r required; do
  [[ -z "$required" ]] && continue
  [[ -s "${SOURCE}/${required}" ]] || missing+=("$required")
done < "$manifest"
(( ${#missing[@]} == 0 )) \
  || fail "export is incomplete — declared artifact(s) missing: ${missing[*]}"

[[ -f "${SOURCE}/SHA256SUMS" ]] || fail "missing ${SOURCE}/SHA256SUMS.
  There is no acknowledgement to skip this. Unlike a legacy backup, a Neon
  export is produced by neon-export.sh minutes earlier and always has one; its
  absence means the archive was assembled by something else."
log "verifying export checksums"
( cd "$SOURCE" && sha256sum --check --status SHA256SUMS ) \
  || fail "export checksums do not match or a listed file is missing; refusing to import"

metadata="${SOURCE}/metadata.json"
[[ -f "$metadata" ]] || fail "missing ${metadata}"
recorded_kind="$(sed -n 's/.*"kind": *"\([^"]*\)".*/\1/p' "$metadata")"
[[ "$recorded_kind" == "neon-source-export" ]] \
  || fail "metadata.json records kind '${recorded_kind:-<none>}', not 'neon-source-export'.
  A platform backup is restored with deploy/scripts/restore.sh, not with this script."
recorded_freeze="$(sed -n 's/.*"source_freeze_date": *"\([^"]*\)".*/\1/p' "$metadata")"
[[ "$recorded_freeze" == "$CONTRACT_NEON_SOURCE_FREEZE_DATE" ]] \
  || fail "this export was taken against source freeze '${recorded_freeze:-<none>}' but the
  committed contract is '${CONTRACT_NEON_SOURCE_FREEZE_DATE}'. The source is frozen; a
  different freeze date means the two disagree about what is being migrated."
recorded_sha="$(sed -n 's/.*"dump_sha256": *"\([^"]*\)".*/\1/p' "$metadata")"
actual_sha="$(sha256sum "$DUMP" | awk '{print $1}')"
[[ -n "$recorded_sha" && "$recorded_sha" == "$actual_sha" ]] \
  || fail "the dump's SHA-256 (${actual_sha}) does not match the one recorded at export
  time (${recorded_sha:-<none>}); refusing to import an archive that changed."
log "export verified (dump sha256 ${actual_sha})"

#############################################################################
# PHASE 2 — verify the Public Media tree. Also before anything is touched:
#           a database migrated without its media is a broken rehearsal.
#############################################################################
log "verifying the Public Media tree"
"${HERE}/verify-public-media.sh" "$MEDIA_ROOT" \
  || fail "the Public Media tree did not verify; refusing to import"

#############################################################################
# PHASE 3 — the application image, and the pre-import recovery point.
#############################################################################
# The rehearsal runs on the image staging is ALREADY running: the immutable
# digest recorded in the release-state file by the last successful deploy or
# restore. There is NO override.
#
# An override was available here and has been removed. It let the rehearsal be
# run against an image nobody had deployed, which quietly destroys what the
# rehearsal is for: the point is to prove the migrated schema works with the
# build staging actually serves, and a result obtained against some other build
# is evidence about a configuration that exists nowhere. Worse, the check it
# bypassed was conditional (`if [[ $IMPORT_IMAGE == ghcr.io/* ]]`), so a local
# tag like `aau-runner:ci` skipped the channel boundary entirely.
#
# Setting the removed variable is a hard error rather than a silent no-op: an
# operator who exports it believes it will be honoured, and the dangerous
# failure is the one where the tool ignores what it was told without saying so.
if [[ -n "${NEON_IMPORT_IMAGE:-}" ]]; then
  fail "NEON_IMPORT_IMAGE is set, but this import has no image override.

  The rehearsal must run on the image staging is already running, which is the
  digest recorded in ${AAU_STATE_FILE}. To rehearse against a different build,
  deploy that build to staging first:

      AAU_ENV=staging deploy/scripts/deploy.sh <image@sha256:...>"
fi

IMPORT_IMAGE="$(aau_state_image)"
[[ -n "$IMPORT_IMAGE" ]] \
  || fail "no release is recorded in ${AAU_STATE_FILE}, so staging is not running a
  known build. The migrated schema is the FINAL schema and must be paired with a
  build that speaks it. Deploy staging first:

      AAU_ENV=staging deploy/scripts/deploy.sh <image@sha256:...>"

# SHAPE — an immutable digest, never a mutable tag. Identical to the check
# deploy-entrypoint.sh makes, because it is the same invariant: in this
# deployment a release IS a digest. A tag can be repointed between the moment
# the rehearsal is planned and the moment it runs.
if ! [[ "$IMPORT_IMAGE" =~ ^([a-zA-Z0-9._/-]+)@sha256:([a-f0-9]{64})$ ]]; then
  fail "REFUSING: the recorded staging release is not an immutable digest reference.
  recorded: ${IMPORT_IMAGE}
  expected: <repository>@sha256:<64 hex>

  A mutable tag or a local image is not a release identity, so a rehearsal
  against one proves nothing about what staging will actually run."
fi
import_repository="${BASH_REMATCH[1]}"

# CHANNEL — the exact package published for staging, matched in full. A suffix
# heuristic is not a boundary: `ghcr.io/attacker/anything-staging` would pass
# one. This constant MUST match deploy-entrypoint.sh's staging EXPECTED_REPO
# and restore.sh's staging channel.
readonly EXPECTED_IMPORT_REPO='ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging'
[[ "$import_repository" == "$EXPECTED_IMPORT_REPO" ]] \
  || fail "REFUSING: the recorded release is not from the approved staging channel.
  expected repository: ${EXPECTED_IMPORT_REPO}
  got:                 ${import_repository}

  A production artifact is never a staging artifact, a local build is neither,
  and a third-party repository is none of them."

export APP_IMAGE="$IMPORT_IMAGE"
docker image inspect "$IMPORT_IMAGE" >/dev/null 2>&1 || docker pull "$IMPORT_IMAGE" >/dev/null \
  || fail "cannot obtain the staging application image ${IMPORT_IMAGE}"
log "importing against application image ${IMPORT_IMAGE}"

# The import needs the one-shot version-backfill artifact from inside this
# image. Checked HERE, before the export is verified and the media tree is
# staged, because the only fix is to deploy a newer build to staging first —
# and discovering that after the dump has been restored and the whole schema
# upgraded wastes the entire run.
docker run --rm --entrypoint sh "$IMPORT_IMAGE" -c 'test -f /app/version-backfill-runner.mjs' >/dev/null 2>&1 \
  || fail "the recorded staging release does not contain /app/version-backfill-runner.mjs.

  recorded: ${IMPORT_IMAGE}

  That artifact writes the canonical initial versions for the five collections
  and five globals that PR #25 gave versioning, and without it the migrated
  content would be present in the database and invisible in the Admin. It is
  built into every image from the commit that added it onwards, so this image
  predates it.

  Deploy a current build to staging first, then re-run this import:

      AAU_ENV=staging deploy/scripts/deploy.sh <image@sha256:...>"

# A pre-import backup is the recovery path that does not depend on this script
# having got the promotion right. The database rename below is a faster
# rollback, but it is not a substitute for one.
if [[ -z "$(find "$AAU_BACKUP_ROOT" -mindepth 2 -maxdepth 2 -name postgres.dump -print -quit 2>/dev/null)" ]]; then
  [[ "${NEON_IMPORT_ALLOW_NO_BACKUP:-}" == "$NO_BACKUP_ACK" ]] \
    || fail "no backup found under ${AAU_BACKUP_ROOT}. Take one first:

      AAU_ENV=staging deploy/scripts/backup.sh

  On a staging host that has never held real content there may be nothing worth
  backing up; say so explicitly:

      NEON_IMPORT_ALLOW_NO_BACKUP=${NO_BACKUP_ACK} ..."
  log "WARNING: proceeding without a pre-import backup by explicit acknowledgement"
else
  log "pre-import backup present under ${AAU_BACKUP_ROOT}"
fi

log "starting the data services"
compose up --detach --wait postgres-prod redis-prod >/dev/null

log "verifying the dump is readable by pg_restore"
toc="$(compose exec -T postgres-prod pg_restore --list < "$DUMP" 2>/dev/null || true)"
entries="$(printf '%s\n' "$toc" | grep -c ';' || true)"
[[ "${entries:-0}" -gt 0 ]] || fail "the dump is not readable by pg_restore; nothing has been touched"
log "dump readable (${entries} archive entries)"

#############################################################################
# PHASE 4 — build the migrated database in a SCRATCH database. Staging is
#           still completely untouched throughout this phase.
#############################################################################
# ── The scratch database must be an EMPTY restore target ──────────────────
# `TEMPLATE template0` rather than the implicit template1: template1 is the
# cluster's local template and anything ever installed into it would be copied
# into a database that is about to BECOME the live one.
log "creating the scratch database ${SCRATCH_DB}"
printf 'CREATE DATABASE :"scratch" OWNER :"app_user" TEMPLATE template0;\n' | psql_maint >/dev/null \
  || fail "could not create the scratch database; nothing has been touched"
scratch_created=true

# Changing the template changes where the new database inherits its encoding and
# collation from, and this database is promoted over the live one — a collation
# that differs from the live database's would silently reorder every text index
# in it. Cheap to check, so it is checked rather than assumed.
scratch_locale="$(psql_db "$SCRATCH_DB" "SELECT pg_encoding_to_char(encoding) || '|' || datcollate || '|' || datctype
   FROM pg_database WHERE datname = current_database()" 2>/dev/null || true)"
live_locale="$(psql_db "$POSTGRES_DB" "SELECT pg_encoding_to_char(encoding) || '|' || datcollate || '|' || datctype
   FROM pg_database WHERE datname = current_database()" 2>/dev/null || true)"
[[ -n "${scratch_locale//[[:space:]]/}" && "$scratch_locale" == "$live_locale" ]] \
  || fail "the scratch database's encoding/collation does not match ${POSTGRES_DB}:
      ${POSTGRES_DB}: ${live_locale:-<unreadable>}
      ${SCRATCH_DB}: ${scratch_locale:-<unreadable>}
  This database is promoted over the live one, so a different collation would
  silently reorder its text indexes. Nothing has been touched."

# ── Make room for the schema the archive itself creates ───────────────────
# A freshly created database already has a `public` schema, and the Neon archive
# contains `CREATE SCHEMA public` (pg_dump emits it whenever that schema is
# owned by a non-bootstrap role, which it is on Neon). With --exit-on-error —
# which stays — the restore then dies on:
#
#     ERROR: schema "public" already exists
#
# This is the real failure the first staging rehearsal hit. The fix is to hand
# pg_restore an genuinely empty database, NOT to weaken the restore: --clean,
# --if-exists or tolerating the error would each turn a real "this archive does
# not apply cleanly" signal into a warning nobody reads.
#
# No CASCADE: the schema on a just-created database is empty, so a RESTRICT drop
# succeeds — and if it somehow does not, something is in there that this script
# did not put there, and stopping is right.
log "dropping the default public schema so the archive can create its own"
printf 'DROP SCHEMA IF EXISTS public;\n' \
  | compose exec -T postgres-prod \
      psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 -Atq >/dev/null \
  || fail "could not empty the scratch database before the restore; nothing has been touched"

log "restoring the Neon dump into ${SCRATCH_DB}"
compose exec -T postgres-prod \
  pg_restore --no-owner --role "$APP_DB_USER" \
    --username "$POSTGRES_ADMIN_USER" --dbname "$SCRATCH_DB" --exit-on-error \
    < "$DUMP" \
  || fail "pg_restore failed. The live staging database has NOT been touched."
log "dump restored into the scratch database"

# ── Reapply the AAU privilege contract, AFTER the restore ─────────────────
# It has to run here rather than before: the archive DROPped-and-recreated the
# public schema, so anything applied to the original one is gone. The export is
# taken with --no-privileges, so the archive carries no ACLs of its own and this
# is the only thing that establishes them.
#
# This reproduces deploy/postgres/initdb/10-application-role.sh, so the promoted
# database is indistinguishable from one this platform created itself.
log "applying the AAU database and schema privilege contract"
compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 -Atq \
    -v app_user="$APP_DB_USER" <<'EOSQL' >/dev/null || fail "could not apply the privilege contract to the restored database.
  If this failed because schema \"public\" does not exist, the archive did not
  recreate it — that would mean the dump is not the export this import expects.
  The live staging database has NOT been touched."
ALTER SCHEMA public OWNER TO :"app_user";
SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', current_database(), :'app_user')
\gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

# ── 4a. Fail-closed source preflight, against the RESTORED source ─────────
# 00_preflight.sql is the human-readable report and is kept verbatim; the
# machine-readable probe asserts the same facts so the run can fail closed.
log "running 00_preflight.sql (read-only report)"
compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 \
  < "${MIGRATION_ROOT}/simulation/00_preflight.sql" >&2 \
  || fail "00_preflight.sql failed against the restored source"

source_probe="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -At -v ON_ERROR_STOP=1 \
    -v r2_host="$CONTRACT_SOURCE_PUBLIC_MEDIA_HOST" \
  < "${HERE}/sql/source_contract.sql")" \
  || fail "could not probe the restored source"

contract_expect 'payload_migrations rows'          "$CONTRACT_SOURCE_PAYLOAD_MIGRATIONS_ROWS"         "$(contract_probe_value "$source_probe" payload_migrations_rows)"
contract_expect 'payload_jobs rows'                "$CONTRACT_SOURCE_PAYLOAD_JOBS_ROWS"               "$(contract_probe_value "$source_probe" payload_jobs_rows)"
contract_expect 'payload_jobs_log rows'            "$CONTRACT_SOURCE_PAYLOAD_JOBS_LOG_ROWS"           "$(contract_probe_value "$source_probe" payload_jobs_log_rows)"
contract_expect 'duplicate StudyPlans per program' "$CONTRACT_SOURCE_DUPLICATE_STUDY_PLAN_GROUPS"     "$(contract_probe_value "$source_probe" duplicate_study_plan_groups)"
contract_expect 'NULL publication flags'           "$CONTRACT_SOURCE_NULL_PUBLICATION_FLAGS"          "$(contract_probe_value "$source_probe" null_publication_flags)"
contract_expect 'offers status mismatches'         "$CONTRACT_SOURCE_OFFER_STATUS_MISMATCHES"         "$(contract_probe_value "$source_probe" offer_status_mismatches)"
contract_expect 'offer version status mismatches'  "$CONTRACT_SOURCE_OFFER_VERSION_STATUS_MISMATCHES" "$(contract_probe_value "$source_probe" offer_version_status_mismatches)"
contract_expect 'public media rows'                "$CONTRACT_SOURCE_MEDIA_ROWS"                      "$(contract_probe_value "$source_probe" media_rows)"
contract_expect 'public media rows off the frozen R2 origin' \
                                                   "$CONTRACT_SOURCE_MEDIA_FOREIGN_URL_ROWS"          "$(contract_probe_value "$source_probe" media_foreign_url_rows)"
source_private_media="$(contract_probe_value "$source_probe" private_media_rows)"
contract_record 'private_media rows (preserved, binaries out of scope)' "$source_private_media"
for key in users_rows roles_rows colleges_rows academic_departments_rows \
           academic_programs_rows faculty_members_rows study_plans_rows; do
  contract_record "$key" "$(contract_probe_value "$source_probe" "$key")"
done
contract_verdict "the restored source" \
  || fail "source preflight failed. The live staging database has NOT been touched."

# ── 4b. The proven upgrade, executed AS THE APPLICATION ROLE ──────────────
# The upgrade file itself is unchanged and byte-identical (it is SHA-256 pinned
# by the migration contract test). What changed is WHO runs it.
#
# In PostgreSQL the owner of an object is whoever created it, so running the
# upgrade over the admin connection made aau_admin the owner of all 42 tables it
# creates — including the ten version tables PR #25 introduced — while the
# application connects as aau_app. Objects restored by pg_restore were fine,
# because pg_restore is given `--role` and issues its own SET ROLE; the split
# was invisible in every schema count and surfaced on live staging as blank
# Admin pages with `permission denied for table _colleges_v` (SQLSTATE 42501).
#
# The prologue is prepended at INVOCATION rather than merged into the proven
# file, and the resulting ownership is verified below in 4d — a `SET ROLE` that
# silently did not apply would recreate the defect exactly.
log "applying 01_upgrade_working_copy.sql as ${APP_DB_USER}"
{
  cat "${HERE}/sql/upgrade_prologue.sql"
  cat "${MIGRATION_ROOT}/simulation/01_upgrade_working_copy.sql"
} | compose exec -T postgres-prod \
      psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 \
        -v app_user="$APP_DB_USER" -f - >&2 \
  || fail "the schema/data upgrade failed. The live staging database has NOT been touched."

# ── 4c. The application-ownership gate ────────────────────────────────────
# Fail-closed proof that the execution model above actually held, checked
# against the catalog rather than inferred from the fact that no statement
# errored. Every count is "how many objects are wrong", so a kind of object
# nobody thought to enumerate cannot pass by being unlisted.
#
# This runs BEFORE the backfill, deliberately: the backfill connects as the
# application role, and a privilege defect would surface there as a confusing
# mid-write failure rather than as the precise catalog difference it is.
log "verifying application ownership of every migrated object"
ownership_probe="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -At -v ON_ERROR_STOP=1 \
    -v app_user="$APP_DB_USER" \
  < "${HERE}/sql/ownership_contract.sql")" \
  || fail "could not probe object ownership in the migrated database"

contract_expect 'tables not owned by the application role'      '0' "$(contract_probe_value "$ownership_probe" tables_not_owned_by_app)"
contract_expect 'tables the application role cannot fully use'  '0' "$(contract_probe_value "$ownership_probe" tables_missing_app_dml)"
contract_expect 'sequences not owned by the application role'   '0' "$(contract_probe_value "$ownership_probe" sequences_not_owned_by_app)"
contract_expect 'sequences the application role cannot use'     '0' "$(contract_probe_value "$ownership_probe" sequences_missing_app_usage)"
contract_expect 'views not owned by the application role'       '0' "$(contract_probe_value "$ownership_probe" views_not_owned_by_app)"
contract_expect 'types not owned by the application role'       '0' "$(contract_probe_value "$ownership_probe" types_not_owned_by_app)"
contract_expect 'routines not owned by the application role'   '0' "$(contract_probe_value "$ownership_probe" routines_not_owned_by_app)"
contract_expect 'public schema owner'        "$APP_DB_USER" "$(contract_probe_value "$ownership_probe" public_schema_owner)"
contract_expect 'database owner'             "$APP_DB_USER" "$(contract_probe_value "$ownership_probe" database_owner)"
contract_expect 'application schema USAGE'   'true'  "$(contract_probe_value "$ownership_probe" app_schema_usage)"
contract_expect 'application schema CREATE'  'true'  "$(contract_probe_value "$ownership_probe" app_schema_create)"
contract_expect 'application database CONNECT' 'true' "$(contract_probe_value "$ownership_probe" app_database_connect)"
contract_expect 'PUBLIC may create in the schema' 'false' "$(contract_probe_value "$ownership_probe" public_role_schema_create)"
contract_verdict "application ownership" \
  || fail "the migrated database contains objects the application role does not own or
  cannot use. This is the defect that made the Admin pages blank on staging: the
  tables exist, every schema count matches, and Payload gets SQLSTATE 42501.

  The upgrade is executed under ${APP_DB_USER} via migration/scripts/sql/upgrade_prologue.sql;
  a failure here means that did not take effect. The live staging database has
  NOT been touched and the scratch database will be dropped."

# ── 4d. Post-migration verification ───────────────────────────────────────
log "running 02_verify.sql (readable report)"
compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -v ON_ERROR_STOP=1 \
  < "${MIGRATION_ROOT}/simulation/02_verify.sql" >&2 \
  || fail "02_verify.sql failed"

target_probe="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -At -v ON_ERROR_STOP=1 \
  < "${HERE}/sql/target_contract.sql")" \
  || fail "could not probe the migrated database"

contract_expect 'tables'                      "$CONTRACT_TARGET_TABLES"            "$(contract_probe_value "$target_probe" tables)"
contract_expect 'columns'                     "$CONTRACT_TARGET_COLUMNS"           "$(contract_probe_value "$target_probe" columns)"
contract_expect 'enum types'                  "$CONTRACT_TARGET_ENUM_TYPES"        "$(contract_probe_value "$target_probe" enum_types)"
contract_expect 'constraints'                 "$CONTRACT_TARGET_CONSTRAINTS"       "$(contract_probe_value "$target_probe" constraints)"
contract_expect 'indexes'                     "$CONTRACT_TARGET_INDEXES"           "$(contract_probe_value "$target_probe" indexes)"
contract_expect 'sequences'                   "$CONTRACT_TARGET_SEQUENCES"         "$(contract_probe_value "$target_probe" sequences)"
contract_expect 'migration ledger'            "$CONTRACT_TARGET_MIGRATION_LEDGER"  "$(contract_probe_value "$target_probe" migration_ledger)"
contract_expect 'invalid public media URLs'   "$CONTRACT_TARGET_INVALID_PUBLIC_URLS"       "$(contract_probe_value "$target_probe" invalid_public_urls)"
contract_expect 'invalid public thumbnails'   "$CONTRACT_TARGET_INVALID_PUBLIC_THUMBNAILS" "$(contract_probe_value "$target_probe" invalid_public_thumbnails)"
contract_expect 'residual absolute R2 URLs'   '0'                                  "$(contract_probe_value "$target_probe" residual_r2_urls)"
contract_expect 'duplicate StudyPlans per program (after)' '0'                     "$(contract_probe_value "$target_probe" duplicate_study_plan_groups)"
contract_expect 'public media rows (preserved)' "$CONTRACT_SOURCE_MEDIA_ROWS"      "$(contract_probe_value "$target_probe" media_rows)"
# Private Media ROWS are in scope and must survive untouched; their BINARIES
# are deliberately not migrated. Asserting the count against what the source
# actually held is stronger than a frozen constant: it proves preservation.
contract_expect 'private_media rows preserved' "$source_private_media"            "$(contract_probe_value "$target_probe" private_media_rows)"
for key in users_rows roles_rows colleges_rows academic_departments_rows \
           academic_programs_rows faculty_members_rows study_plans_rows; do
  contract_expect "${key} preserved" "$(contract_probe_value "$source_probe" "$key")" \
                                     "$(contract_probe_value "$target_probe" "$key")"
done
contract_verdict "the migrated database" \
  || fail "post-migration verification failed. The live staging database has NOT been
  touched and the scratch database will be dropped."

# ── 4e. The canonical initial-version backfill ────────────────────────────
# PR #25 gave five collections a draft workflow and five globals an audit
# history. Payload writes a version row when a document is SAVED, so the
# migrated content — which predates that change — has none, and Payload serves
# the Admin list view for a draft-enabled collection through `queryDrafts`,
# which reads the version table. Without this step every one of those documents
# exists in the database and is invisible in the Admin.
#
# It runs HERE, against the scratch database, for the same reason everything
# else does: this is still entirely reversible, and a failure costs nothing but
# the scratch database.
#
# The runner is the compiled one-shot artifact inside the SAME immutable image
# staging runs — not a script, not the source tree. It connects as
# ${APP_DB_USER} over the application's own configuration, which makes it the
# end-to-end proof of the ownership gate above: if the application role could
# not write the version tables, this is where that would show.
#
# DATABASE_NAME is what aims it at the scratch database: the application
# assembles its connection URI from the discrete DATABASE_* parts, and the
# deployment env contract deliberately carries no DATABASE_URI (the password
# lives in exactly one place — see src/lib/database-url.ts). But that assembly
# is only reached when neither DATABASE_DIRECT_URI nor DATABASE_URI is set, and
# either of them would silently win — pointing this run at the LIVE database
# while every log line said SCRATCH. Both are therefore blanked explicitly
# rather than assumed absent; an empty value is falsy to the same check.
#
# The runtime flags are set false EXPLICITLY, and the runner refuses to start if
# they are not: opening a Payload instance with them true would apply migrations
# and create identity records as a side effect of writing version rows.
log "backfilling canonical initial versions in ${SCRATCH_DB}"
compose run --rm --no-deps \
  -e DATABASE_NAME="$SCRATCH_DB" \
  -e DATABASE_URI= \
  -e DATABASE_DIRECT_URI= \
  -e PAYLOAD_RUNTIME_MIGRATIONS=false \
  -e PAYLOAD_RUNTIME_BOOTSTRAP=false \
  -e PAYLOAD_SEED_ENABLED=false \
  app-prod node /app/version-backfill-runner.mjs --mode backfill-initial-versions >&2 \
  || fail "the canonical version backfill failed. The live staging database has NOT been
  touched and the scratch database will be dropped."

# ── 4f. The canonical-version acceptance gate ─────────────────────────────
# Asserts the OUTCOME against the live schema, independently of the runner that
# produced it.
log "verifying canonical version coverage"
versions_probe="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$SCRATCH_DB" -At -v ON_ERROR_STOP=1 \
  < "${HERE}/sql/versions_contract.sql")" \
  || fail "could not probe canonical version coverage"

contract_expect 'documents without exactly one latest version' '0' "$(contract_probe_value "$versions_probe" documents_without_exactly_one_latest)"
contract_expect 'documents missing a latest version'           '0' "$(contract_probe_value "$versions_probe" documents_missing_latest)"
contract_expect 'documents with a duplicate latest version'    '0' "$(contract_probe_value "$versions_probe" documents_with_duplicate_latest)"
contract_expect 'orphan latest versions'                       '0' "$(contract_probe_value "$versions_probe" orphan_latest_versions)"
contract_expect 'latest versions whose _status differs from the document' '0' "$(contract_probe_value "$versions_probe" latest_version_status_mismatches)"
contract_expect 'canonical versions marked autosave'           '0' "$(contract_probe_value "$versions_probe" autosave_latest_versions)"
contract_expect 'globals without a version'                    '0' "$(contract_probe_value "$versions_probe" globals_without_version)"

# One latest version per migrated document, counted from both ends. The five
# collections are the same five whose row counts were asserted above, so this
# also proves the backfill covered every document rather than a subset.
versioned_documents=0
for key in colleges_rows academic_departments_rows academic_programs_rows \
           faculty_members_rows study_plans_rows; do
  versioned_documents=$(( versioned_documents + $(contract_probe_value "$target_probe" "$key") ))
done
contract_expect 'documents in the versioned collections' "$versioned_documents" "$(contract_probe_value "$versions_probe" documents_total)"
contract_expect 'canonical latest versions'              "$versioned_documents" "$(contract_probe_value "$versions_probe" latest_versions_total)"
contract_record 'globals holding content' "$(contract_probe_value "$versions_probe" globals_with_content)"
contract_record 'global version rows' "$(contract_probe_value "$versions_probe" global_version_rows_total)"

contract_verdict "canonical versions" \
  || fail "the canonical version backfill did not produce the expected coverage. The live
  staging database has NOT been touched and the scratch database will be dropped."

log "the migrated database is fully verified in ${SCRATCH_DB}"

#############################################################################
# PHASE 5 — prove no writer can act, then stage the uploads. Still reversible.
#############################################################################
log "stopping every application container"
writers_freeze "$AAU_PROJECT_NAME" compose \
  || fail "application containers are STILL ACTIVE after being stopped; refusing to promote"

log "disabling LOGIN on ${APP_DB_USER}"
set_app_login NOLOGIN >/dev/null || fail "could not disable LOGIN for ${APP_DB_USER}"
app_login_disabled=true

psql_db "$POSTGRES_DB" "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid()" >/dev/null 2>&1 || true

# A rename needs the database to have NO other sessions, so this is both a
# safety check and a precondition. Retried rather than sampled once: the
# postgres healthcheck's `pg_isready` is briefly a client backend of its own,
# and failing the import on that would be a spurious refusal — while a session
# genuinely holding the database open never clears.
remaining=""
for _ in $(seq 1 20); do
  remaining="$(psql_db "$POSTGRES_DB" "SELECT count(*) FROM pg_stat_activity
     WHERE datname = current_database() AND pid <> pg_backend_pid()
       AND backend_type = 'client backend'" 2>/dev/null || echo "")"
  [[ "${remaining//[[:space:]]/}" == "0" ]] && break
  sleep 0.5
done
[[ -n "${remaining//[[:space:]]/}" ]] \
  || fail "could not query pg_stat_activity to prove no sessions remain; refusing to promote"
[[ "$remaining" -eq 0 ]] || {
  offenders="$(psql_db "$POSTGRES_DB" "SELECT usename || '@' || coalesce(host(client_addr)::text, 'local')
     FROM pg_stat_activity
     WHERE datname = current_database() AND pid <> pg_backend_pid()
       AND backend_type = 'client backend'" 2>/dev/null || true)"
  fail "${remaining} client session(s) are still connected to ${POSTGRES_DB}:

${offenders}

  A database cannot be renamed while it has sessions, and something outside this
  stack is holding one. Refusing to promote."
}
log "no client database sessions remain"

freeze_probe="$(app_tcp_login_probe)"
case "$freeze_probe" in
  *"not permitted to log in"*) log "verified: writes are frozen" ;;
  *APP_LOGIN_OK*) fail "the write freeze did NOT hold; refusing to promote" ;;
  *) fail "could not prove the write freeze. Got:

${freeze_probe}

  Refusing to promote on an unproven freeze." ;;
esac

staging_uploads="${UPLOADS_PATH}.neon.$$"
rm -rf "$staging_uploads"
mkdir -p "$staging_uploads"
staged_uploads_path="$staging_uploads"
log "staging the Public Media tree (live uploads untouched)"
cp -a "${MEDIA_ROOT}/uploads/media" "${staging_uploads}/media" \
  || { rm -rf "$staging_uploads"; fail "could not stage the Public Media tree"; }

# Same runtime-identity contract restore.sh enforces: the runner image runs as
# UID:GID 10001:10001, and a tree the application cannot read is a silent
# failure that surfaces as missing images long after the import looks done.
chown -R 10001:10001 "$staging_uploads" 2>/dev/null \
  || sudo chown -R 10001:10001 "$staging_uploads" 2>/dev/null || true
wrong_owner="$(find "$staging_uploads" \( ! -uid 10001 -o ! -gid 10001 \) -printf '%p\n' 2>/dev/null | head -5)"
[[ -z "$wrong_owner" ]] || {
  rm -rf "$staging_uploads"
  fail "could not give the staged uploads UID:GID 10001:10001. Examples:

$(printf '    %s\n' $wrong_owner)

  Nothing has been promoted; the live database and uploads are unchanged."
}
staged_files="$(find "${staging_uploads}/media" -type f | wc -l | tr -d ' ')"
[[ "$staged_files" == "$CONTRACT_PUBLIC_MEDIA_OBJECTS" ]] \
  || { rm -rf "$staging_uploads"; fail "staged ${staged_files} media files, expected ${CONTRACT_PUBLIC_MEDIA_OBJECTS}"; }
log "uploads staged and verified (${staged_files} objects)"

#############################################################################
# PHASE 6 — promotion. Two renames and one directory swap; everything that
#           could fail has already succeeded.
#############################################################################
log "=== promoting the migrated database ==="

# The two renames are issued and CHECKED SEPARATELY inside promote_database.
# Sending both to one psql invocation cannot distinguish "nothing happened" from
# "the live database has been renamed aside and nothing has taken its name" —
# and those two states need opposite handling.
#
# The status is captured with `|| promotion_status=$?`, NOT by calling the
# function bare and reading `$?` on the next line. Under `set -e` a bare call
# that returns non-zero aborts the script immediately: the case below would
# never run, the operator would get no diagnostic at all, and the automatic
# rollback's "nothing was lost" message would be replaced by a silent exit 1.
# (`set -e` is only suspended for a function used as the left operand of `||`
# or in an `if` condition — which is exactly what this idiom arranges.)
promotion_status=0
promote_database "$POSTGRES_DB" "$PREVIOUS_DB" "$SCRATCH_DB" || promotion_status=$?

case "$promotion_status" in
  0) ;;   # promoted; falls through to the uploads swap below

  1)
    # Either the first rename never happened, or it happened and was rolled
    # back. Both leave the live database under its own name with its original
    # content, and the live uploads were never touched — so the scratch database
    # is safe to drop and the cleanup handler will do exactly that.
    fail "the database promotion failed and staging was left UNCHANGED.

  ${POSTGRES_DB} is under its own name with its original pre-import content, and
  the live uploads were never touched. The migrated database ${SCRATCH_DB} will
  now be dropped, because the live database is confirmed present.

  Nothing was lost. The usual cause is a session that opened on ${POSTGRES_DB}
  after the freeze was proved — a database cannot be renamed while it has one.
  Re-run the import once the cause is fixed.

  The DATA is unchanged, but the application containers are still STOPPED —
  they were stopped to prove the write freeze, several steps before this. Bring
  staging back up:

      AAU_ENV=staging deploy/scripts/compose.sh up --detach --wait app-prod" ;;

  *)
    # The promotion AND the rollback failed. `promotion_state` is left at
    # live_renamed, which is what stops drop_scratch deleting the only copy of
    # the migrated database.
    fail "CRITICAL: the promotion failed AND the automatic rollback failed.

  NOTHING HAS BEEN DELETED. The databases are:
      ${PREVIOUS_DB}   the pre-import content (was ${POSTGRES_DB})
      ${SCRATCH_DB}    the migrated content
  and no database is currently named ${POSTGRES_DB}.

  Rename exactly ONE of them to ${POSTGRES_DB} by hand, then start the app:

      docker compose -p ${AAU_PROJECT_NAME} exec -T postgres-prod \\
        psql -U ${POSTGRES_ADMIN_USER} -d postgres -v ON_ERROR_STOP=1 \\
          -c 'ALTER DATABASE \"${PREVIOUS_DB}\" RENAME TO \"${POSTGRES_DB}\"'

  Use ${PREVIOUS_DB} to get back to the pre-import state, or ${SCRATCH_DB} to
  complete the migration. Do NOT start the application until exactly one
  database is named ${POSTGRES_DB}." ;;
esac

# promote_database has already set promotion_state=promoted.
scratch_created=false   # the scratch database IS the live one now
log "database promoted (pre-import database retained as ${PREVIOUS_DB})"

previous_uploads="${UPLOADS_PATH}.pre-neon.${STAMP}"
mkdir -p "$UPLOADS_PATH"
if mv "$UPLOADS_PATH" "$previous_uploads" 2>/dev/null; then
  if mv "$staging_uploads" "$UPLOADS_PATH" 2>/dev/null; then
    staged_uploads_path=""
    log "uploads swapped (previous tree retained at ${previous_uploads})"
  else
    if mv "$previous_uploads" "$UPLOADS_PATH" 2>/dev/null; then
      fail "could not move the staged uploads into place, so the ORIGINAL uploads tree was
  restored. The DATABASE has been promoted but the uploads have NOT. Do not
  start the application: roll the database back (see migration/RUNBOOK.md) or
  re-run the uploads swap manually from ${staging_uploads}."
    fi
    fail "CRITICAL: could not move the staged uploads into place AND could not put the
  original tree back. Nothing has been deleted. The trees are at:
      ${previous_uploads}   (live before this import)
      ${staging_uploads}    (the migrated Public Media)
  Move one to ${UPLOADS_PATH} manually."
  fi
else
  # UPLOADS_PATH is likely a mount point and cannot be renamed. Replacing its
  # contents in place is safe here because nothing has moved yet.
  log "rename swap unavailable (uploads path may be a mount point) — replacing contents in place"
  mkdir -p "$previous_uploads"
  # Checked, not left to `set -e`: an unchecked failure here exits with no
  # diagnostic at all, while the DATABASE is already promoted and the tree is
  # half-moved — the one moment an operator most needs to be told where the
  # content actually is. The rename branch above handles the same failure
  # explicitly; this branch now does too.
  find "$UPLOADS_PATH" -mindepth 1 -maxdepth 1 -exec mv -t "$previous_uploads" {} + \
    || fail "CRITICAL: could not move the live uploads aside. The DATABASE has been
  promoted. Nothing has been deleted, but the media may now be split between:
      ${UPLOADS_PATH}        (what is left of the live tree)
      ${previous_uploads}    (what was moved)
      ${staging_uploads}     (the migrated Public Media)
  Do NOT start the application until the trees are reconciled by hand."
  find "$staging_uploads" -mindepth 1 -maxdepth 1 -exec mv -t "$UPLOADS_PATH" {} + \
    || fail "CRITICAL: could not move the staged uploads into ${UPLOADS_PATH}. The DATABASE
  has been promoted. Nothing has been deleted; the trees are at:
      ${previous_uploads}   (live before this import)
      ${staging_uploads}    (the migrated Public Media)
  Complete the move by hand before starting the application."
  rm -rf "$staging_uploads"
  staged_uploads_path=""
  log "uploads contents replaced (previous tree retained at ${previous_uploads})"
fi
log "=== promotion complete ==="

#############################################################################
# PHASE 7 — bring staging back up on the migrated database.
#############################################################################
restore_app_login
reconnect_probe="$(app_tcp_login_probe)"
case "$reconnect_probe" in
  *APP_LOGIN_OK*) log "verified: ${APP_DB_USER} can log in again" ;;
  *) fail "import finished but ${APP_DB_USER} still cannot log in over TCP:

${reconnect_probe}

  Re-enable the role with 'ALTER ROLE \"${APP_DB_USER}\" LOGIN' before starting the app." ;;
esac

log "starting app-prod"
APP_IMAGE="$IMPORT_IMAGE" compose up --detach --force-recreate --wait app-prod

mkdir -p "$(dirname "$AAU_STATE_FILE")"
printf '%s\n' "$IMPORT_IMAGE" > "$AAU_STATE_FILE"

cat >&2 <<EOF
[neon-import] ==========================================================
[neon-import] Neon -> staging import complete.
[neon-import]
[neon-import]   environment:        ${AAU_ENV}
[neon-import]   live database:      ${POSTGRES_DB}   (migrated)
[neon-import]   pre-import database:${PREVIOUS_DB}
[neon-import]   pre-import uploads: ${previous_uploads}
[neon-import]   application image:  ${IMPORT_IMAGE}
[neon-import]   public media:       ${staged_files} objects
[neon-import]   private media:      rows preserved (${source_private_media}); binaries intentionally NOT migrated
[neon-import]
[neon-import] ROLLBACK (fast, while the pre-import database still exists):
[neon-import]
[neon-import]   Run these IN ORDER and stop at the first failure. The two renames are
[neon-import]   separate on purpose: if the second fails after the first succeeded, no
[neon-import]   database is named ${POSTGRES_DB} and the site is down until you undo it.
[neon-import]   The uploads tree is MOVED aside, never deleted first.
[neon-import]
[neon-import]   AAU_ENV=staging deploy/scripts/compose.sh stop app-prod
[neon-import]
[neon-import]   docker compose -p ${AAU_PROJECT_NAME} exec -T postgres-prod \\
[neon-import]     psql -U ${POSTGRES_ADMIN_USER} -d postgres -v ON_ERROR_STOP=1 \\
[neon-import]       -c 'ALTER DATABASE "${POSTGRES_DB}" RENAME TO "${SCRATCH_DB}"'
[neon-import]
[neon-import]   docker compose -p ${AAU_PROJECT_NAME} exec -T postgres-prod \\
[neon-import]     psql -U ${POSTGRES_ADMIN_USER} -d postgres -v ON_ERROR_STOP=1 \\
[neon-import]       -c 'ALTER DATABASE "${PREVIOUS_DB}" RENAME TO "${POSTGRES_DB}"'
[neon-import]
[neon-import]     ^ if THIS one fails, put the first one back immediately:
[neon-import]       docker compose -p ${AAU_PROJECT_NAME} exec -T postgres-prod \\
[neon-import]         psql -U ${POSTGRES_ADMIN_USER} -d postgres -v ON_ERROR_STOP=1 \\
[neon-import]           -c 'ALTER DATABASE "${SCRATCH_DB}" RENAME TO "${POSTGRES_DB}"'
[neon-import]
[neon-import]   mv ${UPLOADS_PATH} ${UPLOADS_PATH}.neon.${STAMP}
[neon-import]   mv ${previous_uploads} ${UPLOADS_PATH}
[neon-import]
[neon-import]     ^ if the second move fails, restore the first:
[neon-import]       mv ${UPLOADS_PATH}.neon.${STAMP} ${UPLOADS_PATH}
[neon-import]
[neon-import]   AAU_ENV=staging deploy/scripts/compose.sh up --detach --wait app-prod
[neon-import]
[neon-import]   Then, only after verifying the rollback, delete ${SCRATCH_DB} and
[neon-import]   ${UPLOADS_PATH}.neon.${STAMP}. migration/RUNBOOK.md §6 has the same
[neon-import]   sequence as one fail-fast block you can paste.
[neon-import]
[neon-import] Verify before declaring the rehearsal successful:
[neon-import]   /api/health returns 200, admin login works, public pages render
[neon-import]   images from /api/media/file/..., and Private Media rows are intact.
[neon-import] ==========================================================
EOF
