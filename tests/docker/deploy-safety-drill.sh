#!/usr/bin/env bash
# Disposable drill for three production-safety guarantees in the deploy tooling,
# each exercised end to end against the REAL deploy/scripts and a throwaway
# Docker stack driven by deploy/docker-compose.vps.yml:
#
#   V5  first-install detection fails CLOSED on a dirty database
#       - a genuinely empty database is a first install (backup skipped, ok)
#       - a database with application tables but no payload_migrations ledger is
#         REFUSED, not silently treated as a first install
#
#   V3  a failed pre-cutover backup never becomes an outage
#       - deploy.sh quiesces (stops) the known-good app for the coherent backup
#       - the backup then fails (disk full during the dump)
#       - the deployment FAILS, but the previous app is restored to service and
#         becomes healthy again, and the deployed-image state is unchanged
#
#   V4  an uploads restore reproduces the snapshot, it does not overlay
#       - back up {A}, then create B, restore, and prove the result is {A} only
#
# Usage: tests/docker/deploy-safety-drill.sh [image-reference]

set -euo pipefail

readonly IMAGE="${1:-aau-runner:test}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly VPS_COMPOSE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
readonly PROJECT="aau-safety-$$"

readonly ADMIN_EMAIL="admin@aau.simulation.test"
readonly ADMIN_PASSWORD="Simulation-Bootstrap-2026!"

WORKDIR="$(mktemp -d)"
UPLOADS_DIR="${WORKDIR}/uploads"
DRILL_BACKUPS="${WORKDIR}/backups"
DRILL_DEPLOY_ROOT="${WORKDIR}/deploy"
DRILL_ENV="${DRILL_DEPLOY_ROOT}/.env.production"
# Distinct ports per drill so several can run on one CI runner without
# colliding, and so none of them binds a real 3000.
DRILL_APP_PORT="${DRILL_APP_PORT:-13940}"
DRILL_CANDIDATE_PORT="${DRILL_CANDIDATE_PORT:-13941}"
STATE_FILE="${DRILL_DEPLOY_ROOT}/deployed-image"
TINY_BACKUPS="${WORKDIR}/tiny-backups"   # a size-capped tmpfs mounted here

failures=0
phase() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }
info() { printf '  ....  %s\n' "$*"; }

# tmpfs mount needs root. Locally the drill runs as root; on a CI runner it runs
# as a non-root user with passwordless sudo. `maybe_sudo` bridges both.
maybe_sudo() { if [[ $EUID -ne 0 ]]; then sudo "$@"; else "$@"; fi; }

registry_name="${PROJECT}-registry"
cleanup() {
  maybe_sudo umount "$TINY_BACKUPS" 2>/dev/null || true
  compose --profile candidate down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker rm -f "$registry_name" >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$WORKDIR" 2>/dev/null || sudo rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# deploy.sh resolves a registry digest, which a locally-built tag does not
# have. Serve the image from a throwaway local registry so the real digest
# path is exercised.
docker run -d --name "$registry_name" -p 127.0.0.1:5556:5000 registry:2 >/dev/null 2>&1 \
  && sleep 3 || { echo "could not start a local registry"; exit 1; }
readonly LOCAL_REF="127.0.0.1:5556/aau-runner:safety"
docker tag "$IMAGE" "$LOCAL_REF"
docker push "$LOCAL_REF" >/dev/null 2>&1 || { echo "could not push to the local registry"; exit 1; }

# APP_IMAGE is supplied here rather than from the env file: release identity
# deliberately has no configuration default, so compose — which parses the whole
# file for every subcommand, `down` and `ps` included — needs an explicit value.
compose() {
  env APP_IMAGE="${APP_IMAGE:-${LOCAL_REF}}" \
      APP_HOST_PORT="${DRILL_APP_PORT}" \
      CANDIDATE_HOST_PORT="${DRILL_CANDIDATE_PORT}" \
      UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    docker compose -p "$PROJECT" --env-file "$DRILL_ENV" -f "$VPS_COMPOSE" "$@"
}
psql_admin() { compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1"; }
psql_app() { compose exec -T postgres-prod psql -U aau_app -d aau_platform -Atc "$1"; }

mkdir -p "${UPLOADS_DIR}/media" "${UPLOADS_DIR}/private" "$DRILL_BACKUPS" \
  "$DRILL_DEPLOY_ROOT" "$TINY_BACKUPS"
# Container runs as UID/GID 10001, not this drill's own uid. `chmod 0777` on the
# throwaway fixture dir lets the container write it without privilege while the
# drill keeps host-side control; chowning to 10001 would need sudo and lock the
# non-root drill out of its own directory.
chmod -R 0777 "$UPLOADS_DIR"

# ── Env file: the real contract, with deliberately hostile dummy secrets ──
# Every value is SINGLE-QUOTED, which is the only env-file form `docker compose`
# passes through byte for byte (measured in tests/deploy/env-contract-drill.sh).
# The passwords contain the interpolation, comment, URI-reserved and whitespace
# characters that a genuinely strong password contains, so the drill exercises
# the URI-encoding and redis.conf-quoting paths rather than a tame ASCII value.
#
# There is deliberately NO APP_IMAGE line: release identity lives in the
# release-state file, not in configuration.
cat > "$DRILL_ENV" <<EOF
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='drill-payload-secret-at-least-32-characters-long'
INITIAL_ADMIN_EMAIL='${ADMIN_EMAIL}'
INITIAL_ADMIN_PASSWORD='${ADMIN_PASSWORD}'
UPLOADS_HOST_PATH='${UPLOADS_DIR}'
EOF

# deploy.sh takes its configuration from the environment; these names must not
# be readonly here or the assignment would fail.
deploy() {
  env \
    COMPOSE_PROJECT_NAME="$PROJECT" \
    AAU_APP_PORT="$DRILL_APP_PORT" \
    AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
    DEPLOY_ROOT="$DRILL_DEPLOY_ROOT" \
    ENV_FILE="$DRILL_ENV" \
    COMPOSE_FILE="$VPS_COMPOSE" \
    STATE_FILE="$STATE_FILE" \
    BACKUP_ROOT="${2:-$DRILL_BACKUPS}" \
    UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT:-420}" \
    bash "${REPO_ROOT}/deploy/scripts/deploy.sh" "$1"
}
run_backup() {
  env \
    COMPOSE_PROJECT_NAME="$PROJECT" DEPLOY_ROOT="$DRILL_DEPLOY_ROOT" \
    ENV_FILE="$DRILL_ENV" COMPOSE_FILE="$VPS_COMPOSE" STATE_FILE="$STATE_FILE" \
    BACKUP_ROOT="$DRILL_BACKUPS" UPLOADS_HOST_PATH="$UPLOADS_DIR" "$@" \
    bash "${REPO_ROOT}/deploy/scripts/backup.sh"
}
run_restore() {
  env \
    COMPOSE_PROJECT_NAME="$PROJECT" DEPLOY_ROOT="$DRILL_DEPLOY_ROOT" \
    ENV_FILE="$DRILL_ENV" COMPOSE_FILE="$VPS_COMPOSE" STATE_FILE="$STATE_FILE" \
    UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    bash "${REPO_ROOT}/deploy/scripts/restore.sh" "$1"
}
app_state() { compose ps --all --format '{{.State}}' app-prod 2>/dev/null | head -1 || true; }
app_health() { compose ps --format '{{.Health}}' app-prod 2>/dev/null | head -1 || true; }

# ─────────────────────────────────────────────────────────────────────────
phase "V5a — a genuinely fresh database is a first install"
if deploy "$LOCAL_REF" >"${WORKDIR}/v5a.log" 2>&1; then
  pass "deploy.sh succeeded on an empty database"
else
  fail "deploy.sh failed on a fresh install"; tail -30 "${WORKDIR}/v5a.log"
fi
grep -q "first install detected" "${WORKDIR}/v5a.log" \
  && pass "classified as first install" || fail "did not classify as first install"
[[ "$(app_health)" == "healthy" ]] && pass "stack healthy after first install" \
  || { fail "stack not healthy after first install"; compose logs --tail 40 --no-color app-prod || true; }
first_install_migrations="$(psql_admin "SELECT count(*) FROM payload_migrations")"
info "applied migrations after first install: ${first_install_migrations}"

# ─────────────────────────────────────────────────────────────────────────
phase "V4 — uploads restore reproduces the snapshot, it does not overlay"
# Create file A, back up, then create file B, restore, and prove only A remains.
compose exec -T --user 10001 app-prod sh -c 'printf "content-A" > /app/uploads/media/A.txt'
backup_dir="$(run_backup | tail -1)"
[[ -d "$backup_dir" ]] && pass "backup of {A} created" || { fail "backup produced no dir"; }
compose exec -T --user 10001 app-prod sh -c 'printf "content-B" > /app/uploads/media/B.txt'
info "before restore: $(ls "${UPLOADS_DIR}/media" | tr '\n' ' ')"
if run_restore "$backup_dir" >"${WORKDIR}/v4.log" 2>&1; then
  pass "restore.sh completed"
else
  fail "restore.sh exited non-zero"; tail -20 "${WORKDIR}/v4.log"
fi
info "after restore:  $(ls "${UPLOADS_DIR}/media" | tr '\n' ' ')"
[[ -f "${UPLOADS_DIR}/media/A.txt" && "$(cat "${UPLOADS_DIR}/media/A.txt")" == "content-A" ]] \
  && pass "A.txt (in the backup) is present with correct contents" \
  || fail "A.txt missing or wrong after restore"
if [[ -e "${UPLOADS_DIR}/media/B.txt" ]]; then
  fail "B.txt (created AFTER the backup) still exists — restore overlaid instead of reproducing the snapshot"
else
  pass "B.txt (created after the backup) is gone — snapshot reproduced, not overlaid"
fi
[[ "$(app_health)" == "healthy" ]] && pass "stack healthy after restore" || fail "unhealthy after restore"

# ─────────────────────────────────────────────────────────────────────────
phase "V3 — a failed pre-cutover backup restores service instead of an outage"
# Force the pre-cutover backup to fail AFTER it has quiesced the app: make a big
# table so the dump is large, and point BACKUP_ROOT at a tiny size-capped tmpfs
# so the dump write hits ENOSPC. This is the 'disk full during dump' failure.
psql_app "CREATE TABLE IF NOT EXISTS bulk (id serial primary key, blob text)" >/dev/null
psql_app "INSERT INTO bulk (blob) SELECT repeat(md5(random()::text), 6) FROM generate_series(1, 60000)" >/dev/null
info "created a large table so the dump cannot fit in a tiny backup volume"
maybe_sudo umount "$TINY_BACKUPS" 2>/dev/null || true
maybe_sudo mount -t tmpfs -o size=256k tmpfs "$TINY_BACKUPS"

state_before="$(cat "$STATE_FILE" 2>/dev/null || echo NONE)"
migrations_before="$(psql_admin "SELECT count(*) FROM payload_migrations")"
if HEALTH_TIMEOUT=420 deploy "$LOCAL_REF" "$TINY_BACKUPS" >"${WORKDIR}/v3.log" 2>&1; then
  fail "redeploy reported success even though the pre-cutover backup could not be written"
else
  pass "redeploy exited non-zero when the backup failed"
fi
maybe_sudo umount "$TINY_BACKUPS" 2>/dev/null || true

grep -qi "backup failed" "${WORKDIR}/v3.log" \
  && pass "deploy.sh reported the backup failure" || fail "no backup-failure message"
grep -qi "restoring the previous app" "${WORKDIR}/v3.log" \
  && pass "deploy.sh attempted to restore the previous app to service" \
  || fail "deploy.sh did not attempt to restore service"

# The decisive assertions: the previous known-good app is running and healthy
# again, and nothing was advanced.
if [[ "$(app_state)" == "running" ]]; then
  pass "app-prod is running again after the failed backup (no outage)"
else
  fail "app-prod is '$(app_state)' after the failed backup — the safety backup caused an outage"
fi
recovered=false
for _ in $(seq 1 40); do [[ "$(app_health)" == "healthy" ]] && { recovered=true; break; }; sleep 5; done
$recovered && pass "the previous app became healthy again" \
  || { fail "the previous app did not recover to healthy"; compose logs --tail 40 --no-color app-prod || true; }
[[ "$(cat "$STATE_FILE" 2>/dev/null || echo NONE)" == "$state_before" ]] \
  && pass "deployed-image state file unchanged by the failed deploy" \
  || fail "deployed-image state file was altered by a failed deploy"
[[ "$(psql_admin "SELECT count(*) FROM payload_migrations")" == "$migrations_before" ]] \
  && pass "migration state unchanged by the failed deploy" || fail "migration state changed"

# ─────────────────────────────────────────────────────────────────────────
phase "V5b — a dirty database (tables but no ledger) is REFUSED"
# Tear the app+db down, bring up a fresh cluster, inject an application table
# with NO payload_migrations, and prove deploy.sh refuses rather than treating
# it as a first install.
compose down --volumes --remove-orphans >/dev/null 2>&1 || true
rm -f "$STATE_FILE"
compose up --detach --wait postgres-prod redis-prod >/dev/null
psql_admin "CREATE TABLE public.pre_existing_data (id int)" >/dev/null
psql_admin "INSERT INTO public.pre_existing_data VALUES (1)" >/dev/null
has_ledger="$(psql_admin "SELECT to_regclass('public.payload_migrations') IS NOT NULL")"
info "injected public.pre_existing_data; payload_migrations exists = ${has_ledger}"

if deploy "$LOCAL_REF" >"${WORKDIR}/v5b.log" 2>&1; then
  fail "deploy.sh treated a dirty database as a deployable state"
else
  pass "deploy.sh refused the dirty database"
fi
grep -qi "no payload_migrations ledger" "${WORKDIR}/v5b.log" \
  && pass "refusal explains the missing ledger + existing tables" \
  || { fail "refusal message did not explain the dirty state"; tail -15 "${WORKDIR}/v5b.log"; }
# It must have refused BEFORE applying any migration onto the unknown schema.
if [[ "$(psql_admin "SELECT to_regclass('public.payload_migrations') IS NOT NULL")" == "t" ]]; then
  fail "deploy.sh applied migrations onto the dirty database"
else
  pass "no migrations were applied onto the dirty database"
fi

printf '\n'
if (( failures > 0 )); then
  printf '\033[1;31m%d assertion(s) failed.\033[0m\n' "$failures"
  exit 1
fi
printf '\033[1;32mDeploy-safety drill passed against the real deploy scripts.\033[0m\n'
