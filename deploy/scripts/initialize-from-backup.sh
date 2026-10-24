#!/usr/bin/env bash
# ONE-TIME data initialization of a VIRGIN deployment environment from a
# verified platform backup produced by `deploy/scripts/backup.sh`.
#
# ── What this is for ──────────────────────────────────────────────────────
# Production's first dataset is the ACCEPTED one, not a re-run of history. The
# Neon conversion, the object-ownership correction and the Payload version
# backfill were all exercised, corrected and accepted on staging; the artifact
# that carries that result is a final verified staging platform backup. This
# script consumes exactly that artifact:
#
#   frozen Neon -> corrected migration on staging -> accepted staging
#     -> final verified platform backup -> [ THIS SCRIPT ] -> production
#
# `migration/scripts/neon-import.sh` is NOT reachable from here and must never
# become runnable against production: it converts a source schema, which is a
# staging-only rehearsal. This script restores an already-correct one.
#
# ── Why it is not restore.sh ──────────────────────────────────────────────
# `restore.sh` is disaster recovery for an environment that already exists, and
# it REFUSES a staging backup against production outright, with no override.
# That refusal is correct and is deliberately left untouched: restoring a
# disposable environment over a live one is data loss dressed up as recovery.
#
# This is the opposite situation — there is nothing to lose, because there is
# nothing there. So the safety property is inverted: instead of asking what is
# being overwritten, this proves that NOTHING is, and refuses otherwise.
#
# ── The guard is system state, not a marker file ──────────────────────────
# A receipt is written for auditing, but it is never the thing that prevents a
# second run: a file can be deleted. Every one of these must hold, and each is
# read from the live system:
#
#   1. no release-state file        — no release has ever been deployed here
#   2. no application container     — not even a stopped or failed one
#   3. no payload_migrations        — the database has never been migrated
#   4. zero user-created objects    — no tables, views, sequences, functions,
#                                     types or extra schemas of any kind
#   5. empty (or absent) uploads    — nothing to overwrite on disk
#
# After a successful run, 3 and 4 are false, so a second run refuses on the
# system's own evidence.
#
# ── Ownership ─────────────────────────────────────────────────────────────
# The restore is performed with `--no-owner --role <app role>`, so every object
# belongs to the role the application actually connects as, whatever the dump
# happens to record. This is the same correction the staging migration needed:
# objects created by the admin role are invisible to every schema count and
# produce a blank Admin panel with SQLSTATE 42501. It is asserted here, not
# assumed.
#
# Usage:
#   AAU_ENV=production \
#   ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
#     deploy/scripts/initialize-from-backup.sh /path/to/<verified-backup-dir>
#
# Afterwards, deploy the first release normally. `deploy.sh` classifies this
# database as an existing installation — which it is — takes a verified
# pre-cutover backup, and runs the usual candidate/health/promotion sequence.

set -euo pipefail

# The backup being read contains every row of the source database. Nothing this
# script writes — the staging uploads tree, the receipt — may be readable by
# other local accounts.
umask 077

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LIB="${SCRIPT_DIR}/lib"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${LIB}/oplock.sh"
# shellcheck source=deploy/scripts/read-env.sh
source "${SCRIPT_DIR}/read-env.sh"

aau_env_resolve

readonly REQUIRE_UPLOADS="${REQUIRE_UPLOADS:-true}"
# The UID/GID the runner image runs as; the uploads tree must belong to it.
readonly APP_UID="${APP_UID:-10001}"
readonly APP_GID="${APP_GID:-10001}"

log() { printf '[initialize] %s\n' "$*" >&2; }
fail() { printf '[initialize] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail "usage: $0 <verified-backup-directory>"
readonly SOURCE="$1"
readonly DUMP="${SOURCE}/postgres.dump"

# The acknowledgement names the TARGET environment, so a command copied from
# the staging runbook cannot initialize production by accident.
readonly INIT_ACK="I-UNDERSTAND-THIS-INITIALIZES-$(printf '%s' "$AAU_ENV" | tr '[:lower:]' '[:upper:]')"
if [[ "${ALLOW_FIRST_INSTALL_FROM_BACKUP:-}" != "$INIT_ACK" ]]; then
  fail "this writes the ENTIRE ${AAU_ENV} dataset — every row and every uploaded file —
  from ${SOURCE}. It is a one-time initialization, not a routine operation, and
  it is refused unless you say so explicitly:

      AAU_ENV=${AAU_ENV} \\
      ALLOW_FIRST_INSTALL_FROM_BACKUP=${INIT_ACK} \\
        deploy/scripts/initialize-from-backup.sh ${SOURCE}"
fi

[[ -d "$SOURCE" ]] || fail "no such backup directory: ${SOURCE}"
[[ -s "$DUMP" ]] || fail "missing or empty ${DUMP}"
[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

# Serialize against deploy, restore, backup and seed.
mkdir -p "$(dirname "$AAU_STATE_FILE")"
oplock_acquire "$AAU_LOCK_FILE" "initialize(${AAU_ENV})" \
  || fail "refusing to initialize while another operation is running"

# ── A value for compose to parse with, and nothing more ───────────────────
# Compose parses the whole file for every subcommand and APP_IMAGE has no
# default, so even `up postgres-prod` needs one. By definition there is no
# release here yet — that is the precondition this script checks for — so there
# is no honest value to take from the release-state file.
#
# This placeholder is never pulled and never run: compose only resolves images
# for the services it is asked to start, and this script starts ONLY
# `postgres-prod`. It never names app-prod or app-candidate in any lifecycle
# command, which `tests/docker/production-initialization-drill.sh` asserts
# against the script text. An operator may still pass APP_IMAGE explicitly.
readonly COMPOSE_APP_IMAGE="${APP_IMAGE:-aau-compose-parse-only:no-release-deployed-yet}"

compose() {
  env \
    APP_IMAGE="$COMPOSE_APP_IMAGE" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

POSTGRES_ADMIN_USER="$(require_env_var "$AAU_ENV_FILE" POSTGRES_ADMIN_USER)" \
  || fail "POSTGRES_ADMIN_USER missing from ${AAU_ENV_FILE}"
POSTGRES_DB="$(require_env_var "$AAU_ENV_FILE" POSTGRES_DB)" \
  || fail "POSTGRES_DB missing from ${AAU_ENV_FILE}"
APP_DB_USER="$(require_env_var "$AAU_ENV_FILE" APP_DB_USER)" \
  || fail "APP_DB_USER missing from ${AAU_ENV_FILE}"
INITIAL_ADMIN_EMAIL="$(read_env_var "$AAU_ENV_FILE" INITIAL_ADMIN_EMAIL || true)"

log "environment: ${AAU_ENV} (project ${AAU_PROJECT_NAME}, database ${POSTGRES_DB})"
log "source backup: ${SOURCE}"

psql_admin() {
  compose exec -T postgres-prod \
    psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc "$1"
}

#############################################################################
# 1. VERIFY THE ARTIFACT — before anything is started or written.
#############################################################################
# There is deliberately no unverified-artifact opt-in here — not a stricter
# default, none at all. restore.sh has one because during an outage at 3am an
# unverifiable backup can still be the least-bad option. This is a planned
# initialization with no clock on it: an artifact that cannot be shown to be
# complete is simply the wrong artifact, and an override would only ever be used
# to talk oneself past that.

for required in MANIFEST SHA256SUMS metadata.json; do
  [[ -f "${SOURCE}/${required}" ]] \
    || fail "${required} is missing from ${SOURCE}, so this backup cannot be shown to be
  complete. Initialization requires a fully verified artifact; take a fresh
  backup on the source environment rather than overriding this."
done

log "verifying every artifact listed in MANIFEST is present"
while IFS= read -r artifact; do
  [[ -n "$artifact" ]] || continue
  [[ -f "${SOURCE}/${artifact}" ]] \
    || fail "MANIFEST lists '${artifact}' but it is not present in ${SOURCE}"
done < "${SOURCE}/MANIFEST"

log "verifying checksums"
( cd "$SOURCE" && sha256sum --quiet --check SHA256SUMS ) \
  || fail "checksum verification failed for ${SOURCE}; the backup has been modified or
  is damaged. Refusing to initialize ${AAU_ENV} from it."

metadata_value() {
  sed -n "s/.*\"$1\": *\"\\([^\"]*\\)\".*/\\1/p" "${SOURCE}/metadata.json"
}
metadata_bare() {
  sed -n "s/.*\"$1\": *\\([a-z0-9]*\\).*/\\1/p" "${SOURCE}/metadata.json"
}

recorded_environment="$(metadata_value environment)"
recorded_database="$(metadata_value database)"
recorded_migrations="$(metadata_value applied_migrations)"
recorded_image="$(metadata_value app_image)"
recorded_consistency="$(metadata_value consistency)"
recorded_uploads="$(metadata_bare uploads_included)"

[[ -n "$recorded_environment" ]] \
  || fail "metadata.json records no source environment. A platform baseline whose origin
  is unknown is not a baseline; take a fresh backup on the source environment."

# A non-empty origin is not an APPROVED origin. Production's documented first
# dataset is the accepted staging baseline, and re-founding an environment from
# its OWN verified backup (a host rebuild, or the recovery drill) is the other
# legitimate source. Anything else — a developer's laptop environment, a second
# staging, a future third environment — is not a baseline for this one.
case "${AAU_ENV}:${recorded_environment}" in
  production:staging)
    log "lineage: accepted staging baseline -> production (the documented first-install path)" ;;
  production:production|staging:staging)
    log "lineage: re-founding ${AAU_ENV} from its own ${recorded_environment} baseline" ;;
  *)
    fail "REFUSING: this backup was taken on '${recorded_environment}' and the target is
  '${AAU_ENV}'. A ${AAU_ENV} environment may be founded only from an accepted staging
  baseline (production only) or from its own verified backup. Restoring across
  environments is deliberate, not routine — see deploy/scripts/restore.sh." ;;
esac

log "backup source: environment=${recorded_environment} database=${recorded_database:-<unknown>}"
log "backup image:  ${recorded_image:-<unknown>}"
log "backup migrations: ${recorded_migrations:-<none>}"

# A `live` backup's dump and uploads describe two different instants. That is
# tolerable for a routine restore point and is NOT tolerable as the founding
# dataset of an environment: the media a document references may simply not be
# in the archive.
[[ "$recorded_consistency" == "quiesced" ]] \
  || fail "this backup records consistency='${recorded_consistency:-<unknown>}'. Only a QUIESCED
  backup — one taken with the application stopped, so the database dump and the
  uploads archive describe a single instant — may found an environment. Take one
  on the source environment with:
      AAU_ENV=${recorded_environment} QUIESCE_APP=true deploy/scripts/backup.sh"

log "verifying the dump is readable end to end"
compose up --detach --wait postgres-prod >/dev/null \
  || fail "could not start postgres-prod; cannot verify or restore anything"
compose exec -T postgres-prod pg_restore --list < "$DUMP" > /dev/null \
  || fail "the dump is not readable by pg_restore; treating this backup as unusable"

uploads_archive="${SOURCE}/uploads.tar.gz"
restore_uploads=false
if [[ -f "$uploads_archive" ]]; then
  log "verifying the uploads archive end to end"
  gzip --test "$uploads_archive" || fail "the uploads archive fails its gzip integrity check"
  tar --extract --gzip --file "$uploads_archive" --to-stdout > /dev/null \
    || fail "the uploads archive is not fully readable"
  restore_uploads=true
elif [[ "$recorded_uploads" == "true" ]]; then
  fail "metadata.json says this backup includes local uploads, but uploads.tar.gz is
  absent. The artifact is incomplete."
elif [[ "$REQUIRE_UPLOADS" == "true" ]]; then
  fail "this backup carries no uploads archive. On the local-storage profile the
  uploaded files ARE application data, and a dataset whose media is missing is
  not the accepted dataset. Set REQUIRE_UPLOADS=false only for an external
  object-storage profile."
else
  log "no uploads archive, and uploads are not required for this profile"
fi

#############################################################################
# 2. PROVE THE TARGET IS VIRGIN — every check reads live system state.
#############################################################################

log "proving ${AAU_ENV} has never been installed"

[[ ! -e "$AAU_STATE_FILE" ]] \
  || fail "REFUSING: ${AAU_STATE_FILE} exists, so a release has already been deployed to
  ${AAU_ENV}. This script initializes a VIRGIN environment. To recover an
  existing one, use deploy/scripts/restore.sh."

# A failed `docker ps` is not "no containers exist". With `|| true` a Docker
# daemon that could not be reached read as a virgin environment, which is the
# single assumption this whole script must never make on its own.
existing_app_containers="$(docker ps -a \
  --filter "label=com.docker.compose.project=${AAU_PROJECT_NAME}" \
  --filter "label=com.docker.compose.service=app-prod" \
  --format '{{.Names}} ({{.State}})' 2>/dev/null)" \
  || fail "could not enumerate app-prod containers for project ${AAU_PROJECT_NAME};
  the virgin-environment check was NOT performed. Nothing has been restored."
existing_candidate_containers="$(docker ps -a \
  --filter "label=com.docker.compose.project=${AAU_PROJECT_NAME}" \
  --filter "label=com.docker.compose.service=app-candidate" \
  --format '{{.Names}} ({{.State}})' 2>/dev/null)" \
  || fail "could not enumerate app-candidate containers for project ${AAU_PROJECT_NAME};
  the virgin-environment check was NOT performed. Nothing has been restored."
existing_app_containers+="$existing_candidate_containers"
[[ -z "${existing_app_containers//[[:space:]]/}" ]] \
  || fail "REFUSING: an application container already exists for project ${AAU_PROJECT_NAME}:
${existing_app_containers}
  Even a stopped or failed container means this environment has been run before.
  Investigate before initializing anything."

migrations_present="$(psql_admin "SELECT to_regclass('public.payload_migrations') IS NOT NULL")" \
  || fail "could not query ${POSTGRES_DB}; refusing to proceed on an unknown database state"
[[ "$migrations_present" == "f" ]] \
  || fail "REFUSING: ${POSTGRES_DB} already has a payload_migrations ledger, so it has been
  migrated by a release. This is not a virgin environment.

  If this script has already run successfully, the initialization is DONE — the
  next step is the first deployment, not a second initialization."

# The same object census deploy.sh uses to classify a first install, so the two
# cannot disagree about what "empty" means.
user_objects="$(psql_admin "
  SELECT
    (SELECT count(*) FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp%'
        AND c.relkind IN ('r','p','v','m','S','f'))
  + (SELECT count(*) FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema'))
  + (SELECT count(*) FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND t.typtype IN ('e','c','d','r')
        AND NOT EXISTS (SELECT 1 FROM pg_class c
                         WHERE c.reltype = t.oid AND c.relkind IN ('r','p','v','m','S','f')))
  + (SELECT count(*) FROM pg_namespace n
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','public')
        AND n.nspname NOT LIKE 'pg_%')
")" || fail "could not census ${POSTGRES_DB}; refusing to proceed on an unknown database state"

[[ -n "${user_objects//[[:space:]]/}" ]] \
  || fail "the object census returned nothing; refusing to treat an unclassifiable database
  as empty"
[[ "$user_objects" -eq 0 ]] \
  || fail "REFUSING: ${POSTGRES_DB} contains ${user_objects} user-created object(s) — tables,
  views, sequences, functions, custom types or non-public schemas. Restoring over
  them would destroy whatever put them there. Investigate by hand."

if [[ -d "$AAU_UPLOADS_PATH" ]]; then
  # Same rule: a `find` that could not read the tree has not shown it empty.
  existing_uploads="$(find "$AAU_UPLOADS_PATH" -type f -print -quit 2>/dev/null)" \
    || fail "could not inspect ${AAU_UPLOADS_PATH}; the stored-media check was NOT
  performed. Nothing has been restored."
  [[ -z "$existing_uploads" ]] \
    || fail "REFUSING: ${AAU_UPLOADS_PATH} already contains files (e.g. ${existing_uploads}).
  This environment has stored media before. Investigate before initializing."
fi

log "target is virgin: no release, no container, no ledger, no objects, no uploads"

# ── The application role must exist and be able to connect ────────────────
# The schema's ownership and grants are re-established below, immediately before
# the restore, so they are not what is checked here. What this script cannot fix
# is the role itself: if APP_DB_USER does not exist, or cannot CONNECT to this
# database, then `pg_restore --role` cannot run, Payload cannot perform DDL at
# container start, and nothing that follows is meaningful. Discovering that from
# the ownership contract AFTER the restore would mean failing with the data
# already written, so it is checked while the target is still empty and the
# correct action is still "fix the database, then re-run". A nonexistent role
# makes the probe itself error, which reads as unreadable and fails closed.
role_ready="$(printf "SELECT has_database_privilege(:'app_user', current_database(), 'CONNECT')::text;\n" \
  | compose exec -T postgres-prod \
      psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atq \
        -v ON_ERROR_STOP=1 -v app_user="$APP_DB_USER" 2>/dev/null || true)"
# `true`, not `t`: an explicit `::text` cast renders a PostgreSQL boolean as
# `true`/`false`. `t`/`f` is only psql's own display form for an uncast boolean,
# and comparing against it is an assertion that can never pass — the shape this
# repository has had to fix before. migration/scripts/neon-import.sh compares
# the same probes against `true` for the same reason.
[[ "$role_ready" == "true" ]] \
  || fail "the application role ${APP_DB_USER} does not exist, or cannot connect to
  ${POSTGRES_DB} (probe: '${role_ready:-<unreadable>}').

  The restore creates every object AS that role, and Payload performs DDL as it
  at every container start. A database this platform provisioned itself
  satisfies this — see deploy/postgres/initdb/10-application-role.sh. Nothing
  has been restored."
log "application role verified: ${APP_DB_USER} can connect to ${POSTGRES_DB}"

#############################################################################
# 3. PREPARE EVERYTHING FALLIBLE BEFORE WRITING ANYTHING
#############################################################################
# Same ordering discipline restore.sh uses. The uploads are unpacked to a
# staging tree first, so a disk-full or corrupt-member failure happens while the
# target is still untouched rather than after the database has been populated.

staged_uploads=""
cleanup() {
  [[ -n "$staged_uploads" && -d "$staged_uploads" ]] && rm -rf "$staged_uploads"
  return 0
}
trap cleanup EXIT

if [[ "$restore_uploads" == "true" ]]; then
  staged_uploads="$(mktemp -d "${AAU_ENV_ROOT}/.uploads-initializing-XXXXXX")" \
    || fail "could not create a staging directory for the uploads under ${AAU_ENV_ROOT}"
  log "unpacking uploads to a staging tree"
  tar --extract --gzip --file "$uploads_archive" --directory "$staged_uploads" \
    || fail "could not unpack the uploads archive"
fi

#############################################################################
# 4. RESTORE
#############################################################################

# ── Normalize the schema exactly as restore.sh does ───────────────────────
# The same four statements the proven recovery path runs before ITS pg_restore,
# for the same two reasons.
#
# It makes the target's public schema unambiguously the application role's,
# however the database was provisioned. A schema still owned by the bootstrap
# superuser would accept the restore's objects and then refuse the
# application's own DDL at the first container start.
#
# And it removes a difference between this path and the one every drill
# exercises: a custom-format dump taken from a database whose public schema was
# itself recreated can carry a `CREATE SCHEMA public` entry, which
# `--exit-on-error` rejects against an existing one. restore.sh never meets that
# because it always recreates first. Neither does this, now.
#
# Destructive in form, a no-op in fact: the target was proven above to contain
# zero user-created objects of any kind.
log "normalizing the public schema for ${APP_DB_USER}"
compose exec -T postgres-prod \
  psql --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<-EOSQL
	DROP SCHEMA IF EXISTS public CASCADE;
	CREATE SCHEMA public;
	ALTER SCHEMA public OWNER TO "${APP_DB_USER}";
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

log "restoring ${POSTGRES_DB} as ${APP_DB_USER}"
# --no-owner --role: every restored object is created by, and therefore owned
#   by, the role the application connects as — regardless of the role names the
#   source environment happened to use.
# --no-acl: the source's grants name the source's roles. Ownership plus the
#   contract asserted below is the authoritative privilege model here, and
#   deploy/postgres/initdb/10-application-role.sh establishes the rest.
# --exit-on-error: a partial restore must be a failure, not a warning.
compose exec -T postgres-prod \
  pg_restore --no-password --exit-on-error --no-owner --no-acl \
    --role "$APP_DB_USER" \
    --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" \
  < "$DUMP" \
  || fail "pg_restore failed. ${POSTGRES_DB} may now be partially populated: drop and
  recreate it before retrying, because this script will (correctly) refuse to
  restore over a non-empty database."

#############################################################################
# 5. VERIFY WHAT WAS RESTORED
#############################################################################

restored_migrations="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")" \
  || fail "the migration ledger could not be read after the restore"
[[ -n "$restored_migrations" ]] \
  || fail "the restored database has an EMPTY migration ledger. A platform baseline always
  carries the migrations it was built with; this artifact does not describe a
  migrated schema."
if [[ -n "$recorded_migrations" && "$restored_migrations" != "$recorded_migrations" ]]; then
  fail "the restored migration ledger does not match the one recorded with the backup:
    recorded: ${recorded_migrations}
    restored: ${restored_migrations}
  The dump does not contain what its metadata claims."
fi
log "migration ledger restored: ${restored_migrations}"

# ── Ownership and privilege contract ──────────────────────────────────────
# The application connects as APP_DB_USER and never as the admin role, and
# `prodMigrations` performs DDL as that role at every container start. An object
# owned by the wrong role is invisible in every row count and every schema
# comparison, and surfaces later as a blank Admin page with SQLSTATE 42501 —
# which is exactly how the staging migration failed before it was corrected.
#
# `migration/scripts/sql/ownership_contract.sql` is the same contract for the
# staging Neon rehearsal. It is deliberately NOT shared: the migration tree is
# staging-only and is never installed on a production host, so this script
# cannot depend on a file from it. Every count below is "how many are WRONG", so
# an object kind nobody listed cannot pass by being unlisted.
ownership_report="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 \
    -v app_user="$APP_DB_USER" <<'SQL'
SELECT 'tables_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND pg_get_userbyid(c.relowner) <> :'app_user')
UNION ALL SELECT 'tables_missing_app_dml=' || (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND NOT (has_table_privilege(:'app_user', c.oid, 'SELECT')
         AND has_table_privilege(:'app_user', c.oid, 'INSERT')
         AND has_table_privilege(:'app_user', c.oid, 'UPDATE')
         AND has_table_privilege(:'app_user', c.oid, 'DELETE')))
UNION ALL SELECT 'sequences_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
    AND pg_get_userbyid(c.relowner) <> :'app_user')
UNION ALL SELECT 'sequences_missing_app_usage=' || (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
    AND NOT (has_sequence_privilege(:'app_user', c.oid, 'USAGE')
         AND has_sequence_privilege(:'app_user', c.oid, 'SELECT')
         AND has_sequence_privilege(:'app_user', c.oid, 'UPDATE')))
UNION ALL SELECT 'views_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
    AND pg_get_userbyid(c.relowner) <> :'app_user')
UNION ALL SELECT 'types_not_owned_by_app=' || (
  SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype IN ('e','c','d','r')
    AND pg_get_userbyid(t.typowner) <> :'app_user'
    AND NOT EXISTS (SELECT 1 FROM pg_class c
                     WHERE c.reltype = t.oid
                       AND c.relkind IN ('r','p','v','m','S','f')))
UNION ALL SELECT 'routines_not_owned_by_app=' || (
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND pg_get_userbyid(p.proowner) <> :'app_user')
UNION ALL SELECT 'app_schema_usage=' ||
  has_schema_privilege(:'app_user', 'public', 'USAGE')::text
UNION ALL SELECT 'app_schema_create=' ||
  has_schema_privilege(:'app_user', 'public', 'CREATE')::text
UNION ALL SELECT 'app_database_connect=' ||
  has_database_privilege(:'app_user', current_database(), 'CONNECT')::text;
SQL
)" || fail "the ownership contract probe could not be run"

ownership_value() { printf '%s\n' "$ownership_report" | sed -n "s/^$1=//p" | tail -n1; }
ownership_failures=""
for counter in tables_not_owned_by_app tables_missing_app_dml \
               sequences_not_owned_by_app sequences_missing_app_usage \
               views_not_owned_by_app types_not_owned_by_app \
               routines_not_owned_by_app; do
  value="$(ownership_value "$counter")"
  [[ "$value" == "0" ]] || ownership_failures+="  ${counter}=${value:-<unreadable>}"$'\n'
done
for flag in app_schema_usage app_schema_create app_database_connect; do
  value="$(ownership_value "$flag")"
  # `true`, not `t` — see the note on the connect probe above.
  [[ "$value" == "true" ]] || ownership_failures+="  ${flag}=${value:-<unreadable>}"$'\n'
done
if [[ -n "$ownership_failures" ]]; then
  printf '%s' "$ownership_failures" >&2
  fail "the restored database does not satisfy the application-ownership contract (above).
  The application connects as ${APP_DB_USER}; objects it does not own or cannot
  reach produce a blank Admin panel with SQLSTATE 42501 and break future
  migrations. ${AAU_ENV} has NOT been declared initialized."
fi
log "ownership contract satisfied: every object belongs to ${APP_DB_USER}"

# ── The dataset is real, and the configured Super Admin is in it ──────────
users="$(psql_admin "SELECT count(*) FROM users")" || users=""
[[ "${users:-0}" -gt 0 ]] \
  || fail "the restored database contains no users. That is not the accepted dataset."

if [[ -n "$INITIAL_ADMIN_EMAIL" ]]; then
  # The first deployment's identity bootstrap validates this account. If it is
  # absent it would instead try to CREATE it, which needs INITIAL_ADMIN_PASSWORD
  # and would add an administrator the accepted dataset never had. Catch that
  # here, where nothing has been deployed yet and the fix is a one-line edit.
  # The address is passed as a psql VARIABLE and quoted by `:'email'`, never
  # concatenated into SQL. That interpolation only fires for SQL psql reads from
  # stdin — not for `-c` — so the query is piped in, matching restore.sh.
  admin_present="$(printf "SELECT count(*) FROM users WHERE lower(email) = lower(:'email');\n" \
    | compose exec -T postgres-prod \
        psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atq \
          -v ON_ERROR_STOP=1 -v email="$INITIAL_ADMIN_EMAIL" 2>/dev/null || true)"
  if [[ "${admin_present:-0}" -gt 0 ]]; then
    log "configured INITIAL_ADMIN_EMAIL is present in the restored dataset"
  else
    fail "INITIAL_ADMIN_EMAIL='${INITIAL_ADMIN_EMAIL}' does not exist in the restored dataset.
  The first deployment's identity bootstrap would try to CREATE that account
  rather than validate it, adding an administrator the accepted dataset never
  had — and it would need INITIAL_ADMIN_PASSWORD to do it.

  Set INITIAL_ADMIN_EMAIL in ${AAU_ENV_FILE} to the real Super Admin address
  carried by this dataset. Migrated user passwords are never replaced."
  fi
else
  log "WARNING: INITIAL_ADMIN_EMAIL is not set in ${AAU_ENV_FILE}; the first deployment"
  log "         will refuse to start until it is."
fi

#############################################################################
# 6. UPLOADS
#############################################################################

if [[ "$restore_uploads" == "true" ]]; then
  log "installing the uploads tree at ${AAU_UPLOADS_PATH}"
  mkdir -p "$AAU_UPLOADS_PATH"
  # The target was proven to contain no files above, so this adds rather than
  # replaces. `-a` preserves each entry's modes and timestamps.
  #
  # Deliberately NOT `cp -a "${staged_uploads}/." "${AAU_UPLOADS_PATH}/"`. That
  # spelling names the STAGING DIRECTORY ITSELF as the source, so cp copies its
  # attributes onto the destination -- and the staging directory came from
  # `mktemp -d`, which is 0700. The operator's uploads directory would silently
  # acquire 0700 from a temporary directory that has nothing to do with it,
  # replacing whatever modes the host contract set on it, and the mode change
  # would not be announced anywhere.
  #
  # Copying the CHILDREN instead preserves each restored entry exactly while
  # leaving the destination directory's own mode and ownership alone.
  # `find -mindepth 1 -maxdepth 1` includes dotfiles, which a glob would not,
  # and -print0 survives whitespace in a filename.
  while IFS= read -r -d "" staged_entry; do
    cp -a "$staged_entry" "${AAU_UPLOADS_PATH}/" \
      || fail "could not install the uploads tree; the database HAS been restored.
  Fix the filesystem problem and copy ${staged_uploads} into ${AAU_UPLOADS_PATH}
  by hand -- do NOT re-run this script, which will now correctly refuse."
  done < <(find "$staged_uploads" -mindepth 1 -maxdepth 1 -print0)
  # ── Ownership is a post-condition, not a best effort ────────────────────
  # This used to be `chown ... || log WARNING` and carry on. An initialization
  # that restores the dataset but leaves the uploads tree unwritable by the
  # application reports SUCCESS and then fails in production the first time
  # anyone uploads a file -- long after the operator has moved on, and with the
  # cause buried in a warning that scrolled past during a long restore.
  #
  # So chown is attempted, and then the state it was supposed to produce is
  # ASSERTED against the filesystem. The exit status alone is not the check:
  # a partial `chown -R` can fail on one entry after succeeding on a thousand,
  # and a chown that "succeeds" on a tree the container still cannot traverse
  # is not the contract either.
  # On the VPS this script runs as root, so the direct chown succeeds and the
  # sudo fallback is never reached -- it is inert in production. The fallback
  # exists only so the recovery drills, which invoke this script as an
  # unprivileged CI user, can still establish ownership to a UID/GID that are
  # not their own (the hosted runner grants passwordless sudo). This mirrors
  # exactly what restore.sh already does when it stages uploads; the two
  # scripts install the same tree for the same runtime identity, so they must
  # not disagree about how to get there.
  #
  # Either way the assertion below is the real gate and still fails closed.
  if ! chown -R "${APP_UID}:${APP_GID}" "$AAU_UPLOADS_PATH" 2>/dev/null \
     && ! sudo chown -R "${APP_UID}:${APP_GID}" "$AAU_UPLOADS_PATH" 2>/dev/null; then
    log "NOTE: chown -R ${APP_UID}:${APP_GID} ${AAU_UPLOADS_PATH} did not fully succeed."
    log "      The tree is now checked directly for the access the container needs."
  fi

  # What the application container (UID:GID ${APP_UID}:${APP_GID}) must be able
  # to do: write every file, and write AND traverse every directory. Ownership
  # is the normal way to get that, but a tree that is group- or world-writable
  # to that identity satisfies the same requirement -- which is what keeps the
  # non-root CI drill able to exercise this path honestly instead of skipping it.
  # Enumerate FIRST, and fail closed if the tree cannot be walked at all. A
  # `find` that dies mid-walk inside the loop would simply produce fewer rows,
  # every one of them passing, and the contract would be declared satisfied on
  # a tree nobody actually inspected.
  if ! uploads_inventory="$(find "$AAU_UPLOADS_PATH" -printf '%U|%G|%m|%y|%p\n')"; then
    fail "could not enumerate ${AAU_UPLOADS_PATH} to verify its ownership. The database
  HAS been restored. Do not start the application until you have confirmed the
  uploads tree is owned by ${APP_UID}:${APP_GID}."
  fi

  unwritable_count=0
  unwritable_sample=""
  while IFS='|' read -r entry_uid entry_gid entry_mode entry_type entry_path; do
    [[ -n "$entry_path" ]] || continue
    # Pick the permission class this identity is actually judged by, exactly as
    # the kernel does: owner wins, then group, then other.
    # `%m` is octal WITHOUT a leading zero, but it carries the setuid/setgid/
    # sticky digit when one is set: a 0755 directory prints "755" and a 2755 one
    # prints "2755". Taking positions 0-2 would then read the special-bits digit
    # as the owner class and misjudge the entry, so the rwx triplet is always
    # the LAST three digits.
    entry_rwx="${entry_mode: -3}"
    if [[ "$entry_uid" == "$APP_UID" ]]; then
      class_digit="${entry_rwx:0:1}"
    elif [[ "$entry_gid" == "$APP_GID" ]]; then
      class_digit="${entry_rwx:1:1}"
    else
      class_digit="${entry_rwx:2:1}"
    fi
    # Octal digit: 4=r 2=w 1=x.
    (( class_digit & 2 )) && writable=true || writable=false
    if [[ "$entry_type" == "d" ]]; then
      (( class_digit & 1 )) || writable=false
    fi
    if [[ "$writable" != "true" ]]; then
      unwritable_count=$(( unwritable_count + 1 ))
      (( unwritable_count <= 5 )) \
        && unwritable_sample+="    ${entry_path} (uid=${entry_uid} gid=${entry_gid} mode=${entry_mode})"$'\n'
    fi
  done <<< "$uploads_inventory"

  if (( unwritable_count > 0 )); then
    printf '%s' "$unwritable_sample" >&2
    fail "${unwritable_count} entr(ies) under ${AAU_UPLOADS_PATH} cannot be written by the
  application identity ${APP_UID}:${APP_GID} (first few listed above). The
  container runs as that UID, so it could not write uploads, replace media or
  clean up failed submissions -- and it would only be discovered in production.

  The database HAS been restored. Do NOT re-run this script, which will now
  correctly refuse. Fix the ownership directly and then run the first
  ${AAU_ENV} deployment:

      chown -R ${APP_UID}:${APP_GID} ${AAU_UPLOADS_PATH}

  (as root -- the deploy accounts deliberately cannot do this themselves)."
  fi
  log "uploads ownership contract satisfied: ${APP_UID}:${APP_GID} can write every entry"

  uploaded_files="$(find "$AAU_UPLOADS_PATH" -type f | wc -l)"
  log "uploads installed: ${uploaded_files} file(s)"
else
  uploaded_files=0
fi

#############################################################################
# 7. RECEIPT — for auditing only. It is NOT the rerun guard.
#############################################################################

receipt="${AAU_DEPLOY_ROOT}/first-install-receipt.json"
cat > "$receipt" <<EOF
{
  "initialized_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${AAU_ENV}",
  "database": "${POSTGRES_DB}",
  "source_backup": "${SOURCE}",
  "source_environment": "${recorded_environment}",
  "source_image": "${recorded_image}",
  "applied_migrations": "${restored_migrations}",
  "users_restored": ${users:-0},
  "uploads_restored": ${uploaded_files}
}
EOF
chmod 600 "$receipt"

# The release-state file is deliberately NOT written: no release has been
# deployed. Writing one would make the next deploy believe it has a previous
# known-good image to fall back to, and `compose.sh` believe there is something
# running.
[[ ! -e "$AAU_STATE_FILE" ]] \
  || fail "internal error: a release-state file appeared during initialization"

log "=================================================================="
log "${AAU_ENV} has been INITIALIZED from ${recorded_environment}."
log "  migrations: ${restored_migrations}"
log "  users:      ${users}"
log "  uploads:    ${uploaded_files} file(s)"
log "  receipt:    ${receipt}"
log ""
log "Nothing is serving yet: no release has been deployed. The next step is the"
log "first ${AAU_ENV} deployment, which takes a verified pre-cutover backup of"
log "this dataset before it changes anything."
log "=================================================================="
