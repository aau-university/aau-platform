#!/usr/bin/env bash
# Controlled cutover for one deployment environment (production or staging).
#
# Sequence:
#   acquire the operation lock -> pre-pull the exact digest -> classify the
#   database -> back up and verify (unless this is a first install) -> start the
#   CANDIDATE on a private port -> Payload applies pending migrations and the
#   identity bootstrap -> the candidate must pass its health gate -> only then
#   promote it onto the stable port -> record the deployed digest
#
# The broad Seed appears nowhere in this sequence and must never be added. A
# full canonical Seed is a separate, explicit one-shot operation
# (deploy/scripts/seed.sh).
#
# ── Three behaviours worth reading before editing ─────────────────────────
#
#   Traffic gating. The candidate is validated on AAU_CANDIDATE_PORT, which no
#   reverse proxy is configured to forward to. Docker health status does not
#   stop a proxy sending traffic to a port, and Next starts listening before
#   Payload has migrated or bootstrapped — so binding the candidate to the
#   stable port first would expose an unmigrated build to real users. The stable
#   port is handed over only after the candidate has proven healthy.
#
#   First install. On an empty host there is no stack and no database, so there
#   is nothing to back up. That is detected explicitly and conservatively.
#
#   Migration-aware rollback. Restarting the previous image is only safe when
#   the candidate did NOT change the schema. If the migration ledger moved, the
#   old code would run against a newer schema, so this refuses to start it and
#   tells the operator to restore instead. The ledger is read only AFTER the
#   failed candidate has been stopped and proven stopped.
#
# Usage:
#   deploy/scripts/deploy.sh ghcr.io/<owner>/aau-payload-platform@sha256:<digest>
#   AAU_ENV=staging deploy/scripts/deploy.sh <image>

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LIB="${SCRIPT_DIR}/lib"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${LIB}/oplock.sh"
# shellcheck source=deploy/scripts/read-env.sh
source "${SCRIPT_DIR}/read-env.sh"

aau_env_resolve

readonly HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-300}"
readonly SKIP_BACKUP="${SKIP_BACKUP:-false}"

log() { printf '[deploy] %s\n' "$*" >&2; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail "usage: $0 <image-reference>"
readonly REQUESTED_IMAGE="$1"

[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

# Read only the non-secret values we need, WITHOUT shell-sourcing the secret
# file. `source` would EVALUATE a password containing `$(...)`/backticks as
# shell; read-env.sh reads it literally and refuses values whose meaning it
# cannot reproduce byte-for-byte.
POSTGRES_ADMIN_USER="$(require_env_var "$AAU_ENV_FILE" POSTGRES_ADMIN_USER)" \
  || fail "POSTGRES_ADMIN_USER missing from ${AAU_ENV_FILE}"
POSTGRES_DB="$(require_env_var "$AAU_ENV_FILE" POSTGRES_DB)" \
  || fail "POSTGRES_DB missing from ${AAU_ENV_FILE}"

log "environment: ${AAU_ENV} (project ${AAU_PROJECT_NAME}, stable port ${AAU_APP_PORT}, candidate port ${AAU_CANDIDATE_PORT})"

# ── Operation lock ────────────────────────────────────────────────────────
# Shared with restore, standalone backup and the one-shot Seed. Workflow
# concurrency alone is not sufficient: it does not know about an operator
# running a restore by hand on the host.
mkdir -p "$(dirname "$AAU_STATE_FILE")"
oplock_acquire "$AAU_LOCK_FILE" "deploy(${AAU_ENV})" \
  || fail "refusing to deploy while another operation is running"

compose() {
  # Ports and the uploads path come from the environment descriptor, not from
  # the secrets file: they are deployment topology, not secrets, and they are
  # what keeps production and staging bound to different ports on one host.
  #
  # APP_IMAGE has to be here too, for the reason aau_state_image() documents:
  # `docker compose` interpolates the WHOLE file for every subcommand, so even
  # `exec postgres-prod` and `ps` fail with "APP_IMAGE is not set" without a
  # value. Measured on Compose v5.1.1; older v2 releases were more forgiving,
  # which is exactly why this was not already failing in CI. The lifecycle calls
  # below still pass `APP_IMAGE="$RESOLVED_DIGEST"` explicitly and those win —
  # this only keeps the database-classification and `ps`/`stop` helpers working,
  # and it resolves from the release-state file, never from the env file, so a
  # stale configured identity still cannot resurrect a previous release.
  env \
    APP_IMAGE="${APP_IMAGE:-${RESOLVED_DIGEST:-$(aau_state_image)}}" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

# The migration ledger is the authority on whether a release changed the schema,
# which decides whether the PREVIOUS application image may safely be restarted.
# That makes "the query failed" fundamentally different from "the ledger is
# empty", and the two must NEVER collapse into one value: an empty string is a
# legitimate KNOWN-EMPTY ledger, while a failed query is UNKNOWN and must never
# be compared equal to anything.
#
# Prints the applied migration names on success (empty string = KNOWN-EMPTY,
# e.g. a fresh database whose ledger table does not exist yet). Return status:
#   0  query succeeded — stdout is the ledger (possibly empty)
#   2  query FAILED — state is UNKNOWN; the caller must NOT treat it as unchanged
#
# Two queries rather than one CASE: PostgreSQL plans every branch of a CASE, so
# referencing `payload_migrations` inside a CASE still errors when the table is
# absent. The existence check is separated so a missing table reads as
# KNOWN-EMPTY while only an unreachable database reads as UNKNOWN.
migration_state() {
  local exists rc out
  exists="$(compose exec -T postgres-prod psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT to_regclass('public.payload_migrations') IS NOT NULL" 2>/dev/null)"
  rc=$?
  (( rc != 0 )) && return 2
  if [[ "$exists" != "t" ]]; then
    printf ''
    return 0
  fi
  out="$(compose exec -T postgres-prod psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations" 2>/dev/null)"
  rc=$?
  (( rc != 0 )) && return 2
  printf '%s' "$out"
  return 0
}

database_is_initialized() {
  local exists
  exists="$(compose exec -T postgres-prod psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT to_regclass('public.payload_migrations') IS NOT NULL" 2>/dev/null || true)"
  [[ "$exists" == "t" ]]
}

# Count EVERY user-created object that would make this database non-disposable,
# not merely base tables.
#
# Counting `BASE TABLE` alone was too narrow: a database carrying views,
# materialised views, sequences, functions, custom types, or an application
# schema other than `public` has clearly been used, yet would have been
# classified as a pristine first install — skipping the backup gate and then
# applying migrations onto unknown pre-existing state.
#
# `pg_class`/`pg_proc`/`pg_type` are filtered to non-system namespaces, and
# `information_schema`/`pg_*` are excluded because they exist in every database.
# Prints a single integer, or nothing on a query error (which is treated as a
# hard failure by the caller — an unclassifiable database is never assumed
# fresh).
user_object_count() {
  compose exec -T postgres-prod psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc "
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
  " 2>/dev/null || true
}

# ── Resolve to an immutable digest ────────────────────────────────────────
log "pre-pulling ${REQUESTED_IMAGE}"
docker pull "$REQUESTED_IMAGE" >/dev/null || fail "could not pull ${REQUESTED_IMAGE}"

# Pick the digest for the REQUESTED repository, not RepoDigests[0].
#
# An image that has been tagged and pushed to more than one repository carries
# several entries, in no guaranteed order. Taking the first one silently
# resolved a request for `ghcr.io/<owner>/aau-payload-platform:x` to a digest
# under an entirely different repository name (measured against a local
# registry), which would then be recorded as the deployed release identity and
# handed to a later `docker pull` that cannot satisfy it.
requested_repo="${REQUESTED_IMAGE%@sha256:*}"
# Strip a trailing `:tag`, but only when the colon is in the last path segment —
# `registry:5000/img` has a colon in the HOST, not a tag.
if [[ "${requested_repo##*/}" == *:* ]]; then
  requested_repo="${requested_repo%:*}"
fi

RESOLVED_DIGEST=""
while IFS= read -r candidate_digest; do
  [[ -z "$candidate_digest" ]] && continue
  if [[ "${candidate_digest%@sha256:*}" == "$requested_repo" ]]; then
    RESOLVED_DIGEST="$candidate_digest"
    break
  fi
done < <(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$REQUESTED_IMAGE")

[[ -n "$RESOLVED_DIGEST" ]] || fail "could not resolve a registry digest for ${REQUESTED_IMAGE}
  under its own repository (${requested_repo}). The image is present locally but
  has no digest for that repository — it was probably never pushed there.
  Refusing to deploy an identity that a later pull could not reproduce."
log "resolved digest: ${RESOLVED_DIGEST}"

# ── Release identity ──────────────────────────────────────────────────────
# The release-state file is the ONLY record of what is deployed. APP_IMAGE is
# deliberately absent from the secrets file: a stale APP_IMAGE there would let
# a bare `docker compose up` silently resurrect a previous release. Every
# compose invocation that needs an image supplies it explicitly, and
# `deploy/scripts/compose.sh` supplies it from this file.
PREVIOUS_IMAGE=""
if [[ -f "$AAU_STATE_FILE" ]]; then
  PREVIOUS_IMAGE="$(<"$AAU_STATE_FILE")"
  log "previous known-good image: ${PREVIOUS_IMAGE:-none}"
fi

# ── Bring up the data services ────────────────────────────────────────────
log "starting infrastructure"
APP_IMAGE="$RESOLVED_DIGEST" compose up --detach --wait postgres-prod redis-prod

# ── First install detection and backup gate ───────────────────────────────
# A failed or unverifiable backup blocks the cutover. Docker image rollback is
# NOT database rollback, so a verified restore point is the only real safety
# net once migrations have applied.
#
# "First install" means a GENUINELY DISPOSABLE fresh database. The migration
# ledger alone is too weak a signal, and so is a base-table count: a database
# carrying views, sequences, functions, custom types or extra schemas has been
# used, and applying migrations onto it could destroy data. So this fails
# closed on anything that is not provably empty.
FIRST_INSTALL=false
if database_is_initialized; then
  FIRST_INSTALL=false
else
  objects="$(user_object_count)"
  if [[ -z "${objects//[[:space:]]/}" ]]; then
    fail "could not inspect the database to classify a first install (is postgres-prod reachable?); refusing to proceed"
  elif [[ "$objects" -eq 0 ]]; then
    FIRST_INSTALL=true
  else
    fail "the database contains ${objects} user-created object(s) — tables, views,
  materialised views, sequences, functions, custom types or non-public schemas —
  but has no payload_migrations ledger.

  This is neither a clean first install nor a normal upgrade. Refusing to
  proceed: skipping the backup gate and applying migrations onto unknown
  pre-existing state could destroy data. Investigate the database manually — a
  fresh install must start from an empty database, and an upgrade must carry
  its migration ledger."
  fi
fi

# `|| rc=$?` so a failed query does not abort the script under `set -e` before
# the UNKNOWN check below can run.
migrations_before_rc=0
MIGRATIONS_BEFORE="$(migration_state)" || migrations_before_rc=$?
if (( migrations_before_rc == 2 )); then
  fail "could not read the migration ledger before cutover (is postgres-prod reachable?).
  The before-state is the baseline every rollback decision is measured against;
  proceeding without it would mean a later failure could not tell whether the
  schema moved. Refusing to deploy on an UNKNOWN baseline."
fi
log "migration state before cutover: ${MIGRATIONS_BEFORE:-<none>}"

if [[ "$FIRST_INSTALL" == "true" ]]; then
  log "first install detected (empty database, no payload_migrations) — no backup to take"
elif [[ "$SKIP_BACKUP" == "true" ]]; then
  log "WARNING: backup skipped by explicit SKIP_BACKUP=true"
else
  # Quiesced: the backup stops the app for the dump so the database and the
  # uploads archive describe one instant. The planned maintenance window
  # therefore includes the time to produce AND verify this backup — an accepted
  # trade for a coherent restore point on a single VPS.
  #
  # Because the backup stops the CURRENT known-good app, a backup failure must
  # not leave the service down: capture what is running now so it can be put
  # back if the backup fails before the cutover.
  RUNNING_APP_IMAGE="$(compose ps --format '{{.Image}}' app-prod 2>/dev/null | head -1 || true)"
  log "creating pre-cutover backup (application quiesced for a coherent restore point)"
  # `env` rather than a command-prefix assignment: several of these names are
  # `readonly` in this shell and bash rejects `VAR=x cmd` for a readonly VAR.
  #
  # APP_IMAGE is passed because backup.sh otherwise takes it from the
  # release-state file, and on the FIRST deployment onto an already-initialized
  # database there is no release-state file yet — the database was populated by
  # deploy/scripts/initialize-from-backup.sh, not by a previous release. Compose
  # parses the whole file for every subcommand and APP_IMAGE deliberately has no
  # default, so with an empty value even `exec postgres-prod pg_dump` fails, the
  # pre-cutover backup fails, and the deployment refuses — a first production
  # cutover that could never happen. This value only lets compose parse: backup.sh
  # never STARTS anything with it, and the image it records in metadata.json still
  # comes from the release-state file and the running container, so a normal
  # redeploy keeps pairing its restore point with the PREVIOUS release.
  #
  # RESTART_AFTER_QUIESCE=false: THIS script owns the container lifecycle from
  # here to the end of the maintenance window, and restarting the old release
  # only to stop it again moments later would serve traffic from code that is
  # about to be invalidated. See "Why the old release does not serve during
  # migration" below. The failure paths below are what guarantee the service
  # comes back.
  if ! env \
    AAU_ENV="$AAU_ENV" \
    AAU_ENV_ROOT="$AAU_ENV_ROOT" \
    COMPOSE_PROJECT_NAME="$AAU_PROJECT_NAME" \
    APP_IMAGE="$RESOLVED_DIGEST" \
    DEPLOY_ROOT="$AAU_DEPLOY_ROOT" \
    ENV_FILE="$AAU_ENV_FILE" \
    COMPOSE_FILE="$AAU_COMPOSE_FILE" \
    STATE_FILE="$AAU_STATE_FILE" \
    LOCK_FILE="$AAU_LOCK_FILE" \
    BACKUP_ROOT="$AAU_BACKUP_ROOT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    AAU_OPLOCK_FILE="${AAU_OPLOCK_FILE:-}" \
    AAU_OPLOCK_PID="${AAU_OPLOCK_PID:-}" \
    QUIESCE_APP=true \
    RESTART_AFTER_QUIESCE=false \
    "${SCRIPT_DIR}/backup.sh"
  then
    if [[ -n "$RUNNING_APP_IMAGE" ]]; then
      log "pre-cutover backup failed — restoring the previous app ${RUNNING_APP_IMAGE} to service"
      # No --force-recreate: this starts the container the backup stopped, and
      # is a no-op if the backup failed before quiescing, so it never causes a
      # needless restart of a healthy app.
      if APP_IMAGE="$RUNNING_APP_IMAGE" compose up --detach --wait app-prod; then
        log "previous app restored to service and healthy again"
      else
        log "WARNING: could not automatically restore the previous app to a healthy state — manual intervention required"
      fi
    else
      log "WARNING: no running app image was captured before the backup; cannot auto-restore. Check the stack state."
    fi
    fail "pre-cutover backup failed; refusing to change ${AAU_ENV} (previous app was restored to service)"
  fi
fi

#############################################################################
# MAINTENANCE WINDOW — from here until promotion, nothing serves the stable
# port, deliberately.
#############################################################################
#
# ── Why the old release does not serve during migration ───────────────────
# It is tempting to leave the previous release up while the candidate migrates:
# the site stays online and the outage looks shorter. It is also wrong. Once the
# candidate applies a migration, the OLD code is running against a schema it was
# not built for. For an additive migration that is harmless; for a dropped or
# renamed column it produces errors, and for anything the old code WRITES it can
# produce rows the new schema cannot represent. That is a data problem
# discovered later, not an availability problem discovered now.
#
# So this is a real maintenance window, and the reverse proxy returns its own
# 502/503 for its duration. That is the honest trade for a single VPS with no
# second instance to fail over to, and it is why the candidate port exists: the
# candidate is health-gated somewhere no proxy forwards to, so no request ever
# reaches an unmigrated build either.
#
# The window is closed on every path — by promotion on success, and by
# restarting the previous release on a recoverable failure.

# Enumerate every container of a compose service that is in an ACTIVE state.
# `compose ps --status running` is not proof of stopped: a container with
# `restart: unless-stopped` that is crash-looping sits in `restarting`, which
# that filter does NOT report, so it can still be reconnecting and writing while
# the check passes. This reads the real docker state of every container for the
# service and prints any that are running/restarting/paused/removing.
#
# Return status distinguishes "observed" from "could not observe":
#   0  enumeration succeeded (stdout is the active set, possibly empty)
#   2  `docker ps` itself FAILED — state is UNKNOWN, caller must fail closed.
# "Cannot observe" must never be read as "observed safe", so the `2>/dev/null`
# is NOT followed by `|| true`; docker's exit status is checked.
service_active_containers() {
  local service="$1" rows rc row state active=""
  rows="$(docker ps -a \
    --filter "label=com.docker.compose.project=${AAU_PROJECT_NAME}" \
    --filter "label=com.docker.compose.service=${service}" \
    --format '{{.State}} {{.Names}}' 2>/dev/null)"
  rc=$?
  (( rc != 0 )) && return 2
  while IFS= read -r row; do
    [[ -n "$row" ]] || continue
    state="${row%% *}"
    case "$state" in
      running|restarting|paused|removing) active+="  ${row}"$'\n' ;;
    esac
  done <<< "$rows"
  printf '%s' "$active"
  return 0
}

# Stop a service and PROVE it is stopped before any decision is made from the
# database it was writing to. Bounded retry so a transient `removing`/
# `restarting` state clears; fail closed if the state cannot be enumerated at
# all. Returns 0 only when the active set is proven empty, 1 otherwise.
stop_and_prove_stopped() {
  local service="$1" attempts=40 leftover rc
  APP_IMAGE="$RESOLVED_DIGEST" compose stop "$service" >/dev/null 2>&1 || true
  while (( attempts-- > 0 )); do
    leftover="$(service_active_containers "$service")"
    rc=$?
    if (( rc == 2 )); then
      log "could not enumerate container state for ${service} (docker ps failed); state is UNKNOWN, refusing to treat it as stopped"
      return 1
    fi
    [[ -z "$leftover" ]] && return 0
    sleep 0.5
  done
  log "${service} is STILL ACTIVE after 'compose stop':"
  printf '%s' "$leftover" >&2
  return 1
}

log "entering the maintenance window: stopping the previous release"
# `compose stop` then `compose ps --status running` was not proof of stopped:
# `compose ps` failing left $still_serving empty, which the check accepted as
# "app-prod is stopped", and the `--status running` filter does not report a
# crash-looping container sitting in `restarting` — either way the migration
# below could run underneath a release that was still writing. Use the helper
# that already gets this right: bounded retry, and fail closed when the state
# cannot be enumerated at all.
if ! stop_and_prove_stopped app-prod; then
  fail "app-prod could not be PROVEN stopped after 'compose stop' — it is still
  active, or its container state could not be read at all.
  Refusing to migrate underneath a live release: it would keep serving — and
  possibly writing — against a schema it was not built for. Investigate the
  container manually."
fi

#############################################################################
# CANDIDATE VALIDATION — on a port no proxy forwards to.
#############################################################################

# Stops and removes the candidate container. Always safe to call.
discard_candidate() {
  APP_IMAGE="$RESOLVED_DIGEST" compose --profile candidate rm --stop --force app-candidate \
    >/dev/null 2>&1 || true
}

# Waits for a compose service to report `healthy`. Returns non-zero on timeout
# or on an early, unambiguous failure.
wait_for_health() {
  local service="$1" image="$2" deadline health state
  deadline=$(( SECONDS + HEALTH_TIMEOUT_SECONDS ))
  while (( SECONDS < deadline )); do
    # BOTH conditions. A container that is not running cannot be serving,
    # whatever its last recorded health says — and `compose ps --all`
    # deliberately includes containers that are not running. Reading health
    # alone let a promotion that never managed to start (the stable port was
    # already bound) be reported as "recovered and serving".
    state="$(APP_IMAGE="$image" compose ps --all --format '{{.State}}' "$service" 2>/dev/null | head -1 || true)"
    health="$(APP_IMAGE="$image" compose ps --all --format '{{.Health}}' "$service" 2>/dev/null | head -1 || true)"
    [[ "$state" == "running" && "$health" == "healthy" ]] && return 0

    # An exited CANDIDATE is never going to become healthy: it is
    # `restart: 'no'` precisely so a broken release stops instead of
    # crash-looping. Without this, an obviously-dead candidate would still burn
    # the whole health budget — minutes of maintenance window spent waiting for
    # something that already failed.
    #
    # Deliberately NOT applied to app-prod, which is `restart: unless-stopped`:
    # a container being restarted can be observed in a transient non-running
    # state, and treating that as terminal would abandon a release that was
    # about to come up.
    if [[ "$service" == "app-candidate" ]]; then
      if [[ "$state" == "exited" || "$state" == "dead" ]]; then
        log "the candidate has exited (state=${state}); not waiting out the remaining health budget"
        return 1
      fi
    fi

    sleep 5
  done
  return 1
}

log "starting the candidate on 127.0.0.1:${AAU_CANDIDATE_PORT} (not served to users)"
discard_candidate
APP_IMAGE="$RESOLVED_DIGEST" compose --profile candidate up --detach --force-recreate app-candidate

log "waiting up to ${HEALTH_TIMEOUT_SECONDS}s for the candidate to pass /api/health"
# /api/health initializes Payload and reads PostgreSQL, and reports 503 if the
# identity bootstrap failed — so it cannot pass until migrations AND the
# bootstrap have both succeeded.
if ! wait_for_health app-candidate "$RESOLVED_DIGEST"; then
  log "the candidate did not become healthy; recent logs:"
  APP_IMAGE="$RESOLVED_DIGEST" compose --profile candidate logs --tail 100 --no-color app-candidate >&2 || true

  # ── Stop the failed candidate BEFORE reading the ledger ────────────────
  # `restart: unless-stopped` means an unhealthy candidate keeps crash-looping.
  # Reading the migration ledger while it is still running would be a
  # time-of-check/time-of-use race: the candidate could apply another migration
  # between the read and the rollback decision, and the decision would be made
  # on evidence that is already stale. So it is stopped, PROVEN stopped, and
  # only then is the ledger consulted.
  log "stopping the failed candidate before deciding how to recover"
  if ! stop_and_prove_stopped app-candidate; then
    fail "the failed candidate could not be proven stopped (still active, or its state
  could not be enumerated). It may still be writing to the database, so no
  rollback decision can be made safely.

  The stable service is DOWN and stays down. The previous release was stopped
  when this deployment entered its maintenance window, before the candidate
  started, so nothing is serving port ${AAU_APP_PORT} and nothing will be
  restarted here: the candidate's state is unknown, and it may have moved the
  schema underneath any build started now.

  Manual intervention is required. Establish what the candidate did -- whether
  it is still running, and whether the migration ledger moved -- before
  starting anything against this database."
  fi
  log "failed candidate confirmed stopped"
  discard_candidate

  # `|| migrations_after_rc=$?` so a ledger-read failure (rc 2) is CAPTURED and
  # routed to the UNKNOWN branch below, not silently aborted by `set -e` before
  # we can decide. UNKNOWN must never fall through to "unchanged".
  migrations_after_rc=0
  MIGRATIONS_AFTER="$(migration_state)" || migrations_after_rc=$?

  if [[ "$FIRST_INSTALL" == "true" ]]; then
    # A first install applies migrations onto an empty database and may then
    # fail at the identity bootstrap. There is NO pre-cutover backup — the
    # database was empty before this run — so pointing the operator at
    # restore.sh would be wrong. The database is disposable at this stage.
    log "first install did not become healthy."
    log "  migrations before: ${MIGRATIONS_BEFORE:-<none>}"
    log "  migrations after:  ${MIGRATIONS_AFTER:-<none>}"
    log "The failed candidate has been stopped and removed. Nothing is serving"
    log "port ${AAU_APP_PORT}, which is correct: this host has never had a release."
    log "There is no pre-cutover backup for a first install — do NOT run restore.sh."
    log "Fix the configuration (most often INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD"
    log "or the database credentials — check the candidate logs above), then re-run"
    log "the deploy. If the schema is now partially migrated and you want a clean"
    log "retry, deliberately reset the DISPOSABLE fresh database first."
    fail "first install failed its health gate; ${AAU_ENV} was not declared successful"
  fi

  if (( migrations_after_rc == 2 )); then
    # The ledger could not be read after the candidate was stopped, so whether
    # the schema moved is UNKNOWN. UNKNOWN must never be treated as "unchanged":
    # restarting the previous image against a possibly-migrated schema is exactly
    # the action that turns an outage into corruption. Keep the service down.
    log "the migration ledger could NOT be read after the candidate was stopped."
    log "  migrations before: ${MIGRATIONS_BEFORE:-<none>}"
    log "  migrations after:  UNKNOWN (ledger query failed)"
    log "Whether the schema moved is UNKNOWN, so the previous release is NOT being"
    log "restarted — doing so against a possibly-migrated schema could corrupt data."
    log "Nothing is serving port ${AAU_APP_PORT}. Investigate the database, then"
    log "recover deliberately with:"
    log "  deploy/scripts/restore.sh <backup-directory>"
    fail "candidate failed and the migration state is UNKNOWN; automatic rollback is unsafe"
  fi

  if [[ "$MIGRATIONS_AFTER" != "$MIGRATIONS_BEFORE" ]]; then
    log "migration state CHANGED during the failed candidate:"
    log "  before: ${MIGRATIONS_BEFORE:-<none>}"
    log "  after:  ${MIGRATIONS_AFTER:-<none>}"
    log "The previous release is NOT being restarted, and nothing is serving port"
    log "${AAU_APP_PORT}. That is deliberate: its build predates this schema, so"
    log "starting it would run old code — and old WRITES — against a database it"
    log "does not understand. A visible outage is the correct state here; a site"
    log "that looks up while corrupting rows is not."
    log "Recover deliberately with:"
    log "  deploy/scripts/restore.sh <backup-directory>"
    if [[ -z "$PREVIOUS_IMAGE" ]]; then
      # The imported-baseline first deployment. The pre-cutover backup records
      # no application image because none existed: the database was founded by
      # initialize-from-backup.sh, not by a previous release. restore.sh
      # recognises that state and performs a BASELINE RECOVERY -- database and
      # uploads only, nothing started, no release identity invented -- which
      # returns this environment to the accepted dataset it was founded from.
      log ""
      log "This is the FIRST ${AAU_ENV} deployment onto an imported baseline: there is"
      log "no previous release, so that backup records no application image. restore.sh"
      log "will recognise this and perform a BASELINE RECOVERY -- it restores the"
      log "database and uploads and starts NOTHING, leaving ${AAU_ENV} exactly as"
      log "initialize-from-backup.sh left it. Do NOT re-import from Neon, do NOT seed,"
      log "and do NOT pass RESTORE_IMAGE: this release is the one that just failed."
      log "Fix the cause above, then re-run this first deployment."
    else
      log "which restores the database AND the application image recorded with it."
    fi
    fail "candidate failed after applying migrations; automatic rollback is unsafe"
  fi

  # Schema unchanged: the previous release is still a correct pairing with this
  # database, so bring it back and close the maintenance window.
  if [[ -n "$PREVIOUS_IMAGE" ]]; then
    log "schema unchanged — restarting the previous release ${PREVIOUS_IMAGE}"
    if APP_IMAGE="$PREVIOUS_IMAGE" compose up --detach --wait app-prod; then
      log "previous release is serving port ${AAU_APP_PORT} again; the maintenance window is closed"
    else
      log "WARNING: could not restart the previous release. THE SERVICE IS DOWN."
      log "         Recover manually: deploy/scripts/compose.sh up --detach app-prod"
    fi
  else
    log "no previous image recorded, so there is nothing to restart."
    log "Nothing is serving port ${AAU_APP_PORT}."
  fi
  fail "candidate failed its health gate; ${AAU_ENV} was not declared successful"
fi

log "candidate is healthy — migrations and identity bootstrap have completed"

#############################################################################
# PROMOTION — hand the stable port to the validated build.
#############################################################################

# The candidate has already applied every pending migration and completed the
# identity bootstrap, so app-prod starts against a fully prepared database and
# becomes healthy quickly. The candidate is stopped FIRST: two containers must
# not serve the same release concurrently while one of them is about to be
# removed, and the uploads bind mount is shared.
log "stopping the validated candidate and promoting it onto port ${AAU_APP_PORT}"
discard_candidate

# The failure is CAPTURED, not left to `set -e`. The most likely cause of a
# failed promotion is that something else holds 127.0.0.1:${AAU_APP_PORT}, and
# in that case `compose up` fails immediately rather than starting an
# unhealthy container. Under `set -e` that aborted the script on the spot,
# before any of the recovery below could run — so the one failure mode the
# recovery exists for was the one it could never reach.
promotion_started=true
APP_IMAGE="$RESOLVED_DIGEST" compose up --detach --force-recreate app-prod || promotion_started=false
if [[ "$promotion_started" != "true" ]]; then
  log "the promotion command itself failed (the container did not start at all)"
fi

if [[ "$promotion_started" != "true" ]] || ! wait_for_health app-prod "$RESOLVED_DIGEST"; then
  log "the promoted release did not become healthy on the stable port; recent logs:"
  APP_IMAGE="$RESOLVED_DIGEST" compose logs --tail 100 --no-color app-prod >&2 || true

  # ── Promotion failure is a DIFFERENT situation from candidate failure ────
  # This exact image was healthy against this exact database seconds ago, on
  # the candidate port. So the release itself is not in question; what failed
  # is the move onto the stable port — most often a bind conflict, a container
  # name collision, or a race with the candidate's own teardown.
  #
  # Previously this branch printed advice and exited, leaving NOTHING serving
  # the site even in the common case where simply restarting something would
  # have restored service immediately. An outage that the tooling could have
  # ended, and chose to narrate instead, is not a safety property.

  # Step 1 — one bounded retry. The candidate's container and port binding are
  # released asynchronously; a promotion that raced that teardown succeeds on a
  # second attempt. This is cheap and cannot make anything worse.
  log "retrying the promotion once (the same image was healthy as a candidate)"
  APP_IMAGE="$RESOLVED_DIGEST" compose up --detach --force-recreate app-prod >/dev/null 2>&1 || true

  if wait_for_health app-prod "$RESOLVED_DIGEST"; then
    log "the retry succeeded; the promoted release is serving port ${AAU_APP_PORT}"
  else
    # Step 2 — recover deliberately, and the ledger decides how.
    #
    # ── Freeze the state before deciding from it ─────────────────────────
    # The ledger must be read from a database nothing is writing to. app-prod is
    # `restart: unless-stopped`, so a failed promotion is crash-looping right
    # now: reading the ledger while it restarts is a time-of-check/time-of-use
    # race, and the container could apply another migration between the read and
    # the decision. Stop it and PROVE it stopped first — the same discipline the
    # candidate-failure path uses — and only then consult the ledger.
    if ! stop_and_prove_stopped app-prod; then
      fail "the failed promotion is STILL ACTIVE after 'compose stop', so it may still
  be writing to the database and no recovery decision can be made safely. Nothing
  reliable is serving port ${AAU_APP_PORT}. Stop the container manually, then
  investigate and recover with deploy/scripts/restore.sh."
    fi
    log "the failed promotion is confirmed stopped"

    # The ledger is re-read HERE rather than reused from the candidate phase:
    # the candidate ran migrations, and this is the first point after that
    # where a rollback decision is being made from a now-frozen database.
    # `|| migrations_after_rc=$?` so a ledger-read failure (rc 2) is CAPTURED
    # and routed to the UNKNOWN branch below, not aborted by `set -e`.
    migrations_after_rc=0
    MIGRATIONS_AFTER="$(migration_state)" || migrations_after_rc=$?
    log "the promotion is still failing after a retry."
    log "  migrations before this deploy: ${MIGRATIONS_BEFORE:-<none>}"
    log "  migrations now:                $( (( migrations_after_rc == 2 )) && echo 'UNKNOWN (ledger query failed)' || echo "${MIGRATIONS_AFTER:-<none>}" )"

    if (( migrations_after_rc == 2 )); then
      # UNKNOWN is not "unchanged". With the schema state unreadable, restarting
      # the previous image could run old code against a migrated schema, so it is
      # not done; the new image is left stopped; release-state is not advanced.
      log "the migration ledger could NOT be read, so whether the schema moved is"
      log "UNKNOWN. The previous release is NOT restarted (it could corrupt a"
      log "migrated schema), and the new image is left stopped rather than crash-"
      log "looped. NOTHING IS SERVING PORT ${AAU_APP_PORT}, deliberately."
      log "the release-state file is deliberately NOT updated."
      log "Investigate the database, then recover deliberately with:"
      log "  deploy/scripts/restore.sh <backup-directory>"
      fail "promotion failed and the migration state is UNKNOWN; ${AAU_ENV} was not declared successful"
    fi

    if [[ "$MIGRATIONS_AFTER" != "$MIGRATIONS_BEFORE" ]]; then
      # The schema has moved. The PREVIOUS image predates it and must never be
      # started against it — that is the one action guaranteed to turn an outage
      # into corruption. The new image was healthy as a candidate against this
      # exact database seconds ago and already got one bounded retry on the
      # stable port; both failed, so "start it again and let restart:
      # unless-stopped keep trying" is not a recovery strategy — it is an
      # unhealthy container crash-looping on a port it cannot serve. So it is
      # left DELIBERATELY STOPPED (it already is, from stop_and_prove_stopped),
      # the release-state file is NOT advanced, and the operator is pointed at a
      # migration-aware restore. A visible outage is recoverable; silent
      # corruption is not.
      log "the schema CHANGED during this deploy, so the previous release is not a"
      log "valid pairing with this database and will NOT be started."
      log "the promoted image was healthy as a candidate but has now failed to serve"
      log "the stable port twice, so it is being LEFT STOPPED rather than crash-looped."
      log "NOTHING IS SERVING PORT ${AAU_APP_PORT}, and that is the correct state:"
      log "  - starting ${PREVIOUS_IMAGE:-the previous release} would run old code, and old"
      log "    WRITES, against a schema it does not understand;"
      log "  - restarting the new image onto a port it could not bind or serve just"
      log "    reproduces the same failure on a loop."
      log "the release-state file is deliberately NOT updated: ${RESOLVED_DIGEST} did not"
      log "deploy, and recording it would make the next deploy report the wrong"
      log "previous known-good image."
      log "Recover deliberately with:"
      log "  deploy/scripts/restore.sh <backup-directory>"
      log "which restores the database AND the application image recorded with it."
      fail "promotion failed after the schema moved; ${AAU_ENV} was not declared successful"
    fi

    # Schema unchanged: the previous release is still a correct pairing with
    # this database, so restore service with it rather than staying down.
    if [[ -n "$PREVIOUS_IMAGE" ]]; then
      log "the schema did not change, so the previous release ${PREVIOUS_IMAGE} is still"
      log "a valid pairing with this database — restarting it to end the outage"
      if APP_IMAGE="$PREVIOUS_IMAGE" compose up --detach --force-recreate --wait app-prod; then
        log "previous release is serving port ${AAU_APP_PORT} again; the maintenance window is closed"
        log "the release-state file is deliberately NOT updated: ${RESOLVED_DIGEST} did"
        log "not deploy, and recording it would make the next deploy report the wrong"
        log "previous known-good image."
      else
        log "WARNING: could not restart the previous release either. THE SERVICE IS DOWN."
        log "         Something is holding 127.0.0.1:${AAU_APP_PORT}, or the stack itself is"
        log "         unhealthy. Check what is bound to that port, then:"
        log "           deploy/scripts/compose.sh up --detach --force-recreate app-prod"
      fi
    else
      log "no previous image is recorded, so there is nothing to fall back to."
      log "Nothing is serving port ${AAU_APP_PORT}."
    fi
    fail "promotion to the stable port failed; ${AAU_ENV} was not declared successful"
  fi
fi

# ── Record and finish ─────────────────────────────────────────────────────
# The cutover already SUCCEEDED and health was proven; this final ledger read is
# informational only. Guard it with `|| migrations_after_rc=$?` so a transient
# ledger-read failure here does not abort an otherwise-successful deploy — it is
# reported as UNKNOWN rather than treated as fatal.
printf '%s\n' "$RESOLVED_DIGEST" > "$AAU_STATE_FILE"
migrations_after_rc=0
MIGRATIONS_AFTER="$(migration_state)" || migrations_after_rc=$?

log "deployment successful"
log "environment: ${AAU_ENV}"
log "deployed image: ${RESOLVED_DIGEST}"
log "migration state after cutover: $( (( migrations_after_rc == 2 )) && echo 'UNKNOWN (ledger query failed)' || echo "${MIGRATIONS_AFTER:-<none>}" )"
if [[ "$FIRST_INSTALL" == "true" ]]; then
  log "first install complete — now retire the bootstrap password:"
  log "  remove INITIAL_ADMIN_PASSWORD from ${AAU_ENV_FILE} and run"
  log "  deploy/scripts/compose.sh up --detach --force-recreate app-prod"
  log "  (removing it from the file alone does NOT remove it from the running"
  log "   container's environment — see deploy/README.md)"
fi
log "previous image retained for rollback: ${PREVIOUS_IMAGE:-none}"

# Image pruning is deliberately NOT automated here, and volume pruning must
# never be: `docker system prune --volumes` on this host would destroy the
# database and uploads. Retiring an image also retires every backup that pairs
# with it — see the retention contract in deploy/README.md.
