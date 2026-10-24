#!/usr/bin/env bash
# Run the canonical Seed ONCE, as an explicit operation.
#
# ── Why this is a script and not a flag ───────────────────────────────────
# Normal application startup is: migrations -> minimal identity bootstrap ->
# serve. The minimal bootstrap creates only the canonical system Roles that do
# not exist yet and the configured Super Admin; it never rewrites content.
#
# The canonical Seed is a different thing entirely: taxonomy, departments,
# programs, academic and editorial content, navigation and globals. A
# `FULL_SEED=true` environment variable would re-run all of that every time a
# container restarted — after a host reboot, after an OOM kill, after a routine
# redeploy — silently rewriting production content. So there is no such flag.
# This runs once, verifies, and exits.
#
# ── Source-free ───────────────────────────────────────────────────────────
# It executes /app/seed-runner.mjs inside the SAME release image that is
# already deployed: one bundled artifact built from the exact release SHA. The
# VPS never receives the source tree, the Payload CLI, or the `operations`
# image, and there is no HTTP seed endpoint.
#
# Usage:
#   deploy/scripts/seed.sh full
#   AAU_ENV=staging deploy/scripts/seed.sh reset-and-full
#
# Modes:
#   full            Seed the current database. Stages are create-or-skip.
#   reset-and-full  Explicitly destructive: resets the disposable seeded state
#                   first.
#
# ── Both modes are STAGING-ONLY ───────────────────────────────────────────
# Production content is the ACCEPTED migrated dataset, installed once from a
# verified platform backup by deploy/scripts/initialize-from-backup.sh. The
# canonical Seed writes a DIFFERENT dataset — this repository's fixtures — so
# against production it would overlay repository content onto real content.
# Refused here, in seed-entrypoint.sh, AND in the runner itself: three
# independent refusals, because the cost of getting this wrong in production is
# a content incident and the cost of an extra check is nothing.

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LIB="${SCRIPT_DIR}/lib"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${LIB}/oplock.sh"

aau_env_resolve

log() { printf '[seed] %s\n' "$*" >&2; }
fail() { printf '[seed] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -ge 1 ]] || fail "usage: $0 <full|reset-and-full>"
readonly MODE="$1"

case "$MODE" in
  full|reset-and-full) ;;
  *) fail "unknown mode '${MODE}' (expected full or reset-and-full)" ;;
esac

if aau_env_is_production; then
  if [[ "$MODE" == "reset-and-full" ]]; then
    fail "reset-and-full is a STAGING-ONLY operation.
  It deletes seeded content before re-creating it; against production that is
  data loss, not a reset. If production content genuinely needs to be rolled
  back, restore a backup — deploy/scripts/restore.sh."
  fi
  fail "the canonical Seed is a STAGING-ONLY operation.
  It writes this repository's canonical content over whatever the university
  actually has. Production content is the accepted migrated dataset:

    first install   deploy/scripts/initialize-from-backup.sh <verified backup>
    recovery        deploy/scripts/restore.sh <backup>

  There is no confirmation string for seeding production."
fi

[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"
[[ -f "$AAU_STATE_FILE" ]] || fail "nothing has been deployed to ${AAU_ENV} yet.
  The Seed runs inside the deployed release image, so there must be one."

APP_IMAGE="$(aau_state_image)"
[[ -n "$APP_IMAGE" ]] || fail "the release-state file is empty; refusing to guess a release"

# Serialize against deploy, restore and backup. A Seed writing content while a
# backup is dumping, or while a deploy is cutting over, produces a restore point
# that matches nothing.
oplock_acquire "$AAU_LOCK_FILE" "seed(${AAU_ENV}/${MODE})" \
  || fail "refusing to seed while another operation is running"

compose() {
  env APP_IMAGE="$APP_IMAGE" \
      APP_HOST_PORT="$AAU_APP_PORT" \
      CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
      UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

log "environment: ${AAU_ENV}"
log "mode:        ${MODE}"
log "image:       ${APP_IMAGE}"

# ── One continuous maintenance window for a destructive reset ─────────────
# A destructive staging reset is worth a restore point even on a disposable
# environment: it is the operation most likely to be run by mistake.
#
# It used to be TWO windows. The pre-seed backup quiesced the app, restarted it,
# and then the reset ran against a live application — so between the restore
# point and the reset the app was serving, and during the reset itself it was
# serving content that was being deleted and re-created underneath it. A
# visitor could read half-reset content, and anything the app wrote in that
# window is in neither the backup nor the reseeded state.
#
# So the app is stopped for the backup and STAYS stopped through the seed, and
# a trap brings it back however this script ends. `compose run --rm --no-deps`
# starts a one-off container, so the seed itself does not need app-prod up.
#
# ── The one case where the trap must NOT restart ──────────────────────────
# `reset-and-full` is destructive and is NOT one global transaction: its reset
# targets and stages commit independently, so a failure after the destructive
# work has begun can leave staging partially reset. Restarting the app onto that
# unknown state would present a half-reset site as a healthy one. When the
# destructive seed fails, the trap therefore LEAVES the app stopped and hands
# the operator the exact pre-seed restore point instead.
app_stopped_for_seed=false
reset_seed_failed=false
PRESEED_BACKUP_PATH=""
restart_app_after_seed() {
  [[ "$app_stopped_for_seed" == "true" ]] || return 0
  app_stopped_for_seed=false
  if [[ "$reset_seed_failed" == "true" ]]; then
    log "=================================================================="
    log "the destructive reset-and-full FAILED after destructive work began."
    log "app-prod is being LEFT STOPPED on purpose: staging may be PARTIALLY"
    log "reset, and bringing it back would serve an unknown half-reset state."
    log ""
    log "pre-seed restore point: ${PRESEED_BACKUP_PATH:-<see the backup log above>}"
    log "recover with:"
    log "  AAU_ENV=${AAU_ENV} deploy/scripts/restore.sh ${PRESEED_BACKUP_PATH:-<pre-seed-backup-dir>}"
    log "=================================================================="
    return 0
  fi
  log "closing the maintenance window: restarting app-prod"
  compose up --detach --wait app-prod >/dev/null 2>&1 \
    || log "WARNING: could not restart app-prod. THE SERVICE IS DOWN.
  Recover with: deploy/scripts/compose.sh up --detach --force-recreate app-prod"
}
trap restart_app_after_seed EXIT

if [[ "$MODE" == "reset-and-full" ]]; then
  log "taking a pre-seed backup of ${AAU_ENV} before the destructive reset"
  # Capture the backup directory from backup.sh's stdout contract (it prints the
  # path as its ONLY stdout line; everything human goes to stderr). This is how
  # the operator recovery below names the exact restore point without parsing
  # log text.
  if PRESEED_BACKUP_PATH="$(env \
    AAU_ENV="$AAU_ENV" AAU_ENV_ROOT="$AAU_ENV_ROOT" \
    COMPOSE_PROJECT_NAME="$AAU_PROJECT_NAME" DEPLOY_ROOT="$AAU_DEPLOY_ROOT" \
    ENV_FILE="$AAU_ENV_FILE" COMPOSE_FILE="$AAU_COMPOSE_FILE" \
    STATE_FILE="$AAU_STATE_FILE" LOCK_FILE="$AAU_LOCK_FILE" \
    BACKUP_ROOT="$AAU_BACKUP_ROOT" UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    AAU_OPLOCK_FILE="${AAU_OPLOCK_FILE:-}" AAU_OPLOCK_PID="${AAU_OPLOCK_PID:-}" \
    QUIESCE_APP=true RESTART_AFTER_QUIESCE=false \
    "${SCRIPT_DIR}/backup.sh")"
  then
    PRESEED_BACKUP_PATH="${PRESEED_BACKUP_PATH##*$'\n'}"
  else
    # ── Failure class A: the pre-seed backup failed BEFORE any destructive work.
    # This is the SAFE class. To take a coherent restore point, backup.sh
    # quiesces by stopping app-prod (via writers_freeze), and this script tells
    # it RESTART_AFTER_QUIESCE=false because on SUCCESS this script owns the
    # window. But on FAILURE no reset has run — the database is exactly as it
    # was — so leaving staging down would be an outage with no upside. The
    # correct recovery is therefore to put the prior service back and refuse the
    # reset, NOT to keep the app stopped (that is class B, below, and only after
    # destructive work has begun).
    #
    # `app_stopped_for_seed` is still false here, so the EXIT trap will not touch
    # the container — this branch owns the restart explicitly. The restart is
    # idempotent: if the backup failed before it ever quiesced, app-prod is
    # already up and `compose up` is a no-op.
    log "pre-seed backup failed before any destructive work; the database is unchanged."
    log "restoring the prior app service (no reset ran, so there is nothing half-reset)"
    if compose up --detach --wait app-prod >/dev/null 2>&1; then
      log "app-prod is serving again; nothing was reset"
    else
      log "WARNING: could not restart app-prod after the failed pre-seed backup. THE SERVICE"
      log "         MAY BE DOWN. The database was NOT modified. Recover with:"
      log "           deploy/scripts/compose.sh up --detach --force-recreate app-prod"
    fi
    fail "pre-seed backup failed; refusing to run a destructive reset without a restore point"
  fi
  [[ -n "$PRESEED_BACKUP_PATH" ]] \
    || fail "pre-seed backup reported success but no backup path; refusing to run a destructive reset without a known restore point"
  # The backup left the app down deliberately. From here the trap owns it.
  app_stopped_for_seed=true
  log "pre-seed restore point: ${PRESEED_BACKUP_PATH}"
  log "app-prod is stopped for the duration of the reset (one maintenance window)"
fi

# `run --rm --no-deps`: the data services are already up and healthy; this must
# not start or stop anything. The command overrides the image's CMD, so the
# same release image runs the seed artifact instead of the web server.
log "running the one-shot seed"
if compose run --rm --no-deps \
  -e AAU_ENV="$AAU_ENV" \
  app-prod node /app/seed-runner.mjs --mode "$MODE"
then
  log "seed completed successfully"
elif [[ "$MODE" == "reset-and-full" ]]; then
  # Destructive, and not transactional across stages: assume the reset began
  # and staging may be partially reset. The EXIT trap keeps the app stopped and
  # prints the exact recovery. Do NOT restart, and do NOT claim any partial
  # success. Exit non-zero via the trap-aware path.
  reset_seed_failed=true
  log "the reset-and-full seed FAILED"
  exit 1
else
  # `full` is create-or-skip and non-destructive, and the app was never stopped
  # for it, so a failure here leaves nothing half-reset.
  fail "the seed failed; see the output above. No partial success is reported."
fi
