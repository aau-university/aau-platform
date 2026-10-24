#!/usr/bin/env bash
# Disposable backup + restore drill against the real deploy scripts.
#
# Evidence for §13.4 / §13.5 / §21.6: "do not call backup complete until
# restore is tested". This exercises deploy/scripts/backup.sh and
# deploy/scripts/restore.sh — the actual production tooling — against
# throwaway containers and volumes.
#
# PENDING REAL VPS: an off-VPS backup destination, and a restore drill run
# from that real off-host copy.
#
# Usage: tests/docker/backup-restore-drill.sh [image-reference]

set -euo pipefail

readonly IMAGE="${1:-aau-runner:test}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly VPS_COMPOSE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
readonly PROJECT="aau-backup-$$"

readonly ADMIN_EMAIL="admin@aau.simulation.test"
readonly ADMIN_PASSWORD="Simulation-Bootstrap-2026!"

WORKDIR="$(mktemp -d)"
UPLOADS_DIR="${WORKDIR}/uploads"
DRILL_BACKUPS="${WORKDIR}/backups"
# Self-contained deploy root: the scripts write state here rather than falling
# back to the host's /srv/aau layout, which a CI runner does not have.
DRILL_DEPLOY_ROOT="${WORKDIR}/deploy"
DRILL_ENV="${DRILL_DEPLOY_ROOT}/.env.production"
# Distinct ports per drill so several can run on one CI runner without
# colliding, and so none of them binds a real 3000.
DRILL_APP_PORT="${DRILL_APP_PORT:-13930}"
DRILL_CANDIDATE_PORT="${DRILL_CANDIDATE_PORT:-13931}"

failures=0
phase() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }
info() { printf '  ....  %s\n' "$*"; }

cleanup() {
  compose --profile candidate down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$WORKDIR" 2>/dev/null || sudo rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# APP_IMAGE is supplied here rather than from the env file: release identity
# deliberately has no configuration default, so compose — which parses the whole
# file for every subcommand, `down` and `ps` included — needs an explicit value.
compose() {
  env APP_IMAGE="${APP_IMAGE:-${IMAGE}}" \
      APP_HOST_PORT="${DRILL_APP_PORT}" \
      CANDIDATE_HOST_PORT="${DRILL_CANDIDATE_PORT}" \
      UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    docker compose -p "$PROJECT" --env-file "$DRILL_ENV" -f "$VPS_COMPOSE" "$@"
}
psql_app() {
  compose exec -T postgres-prod psql -U aau_app -d aau_platform -Atc "$1"
}

mkdir -p "${UPLOADS_DIR}/media" "${UPLOADS_DIR}/private" "$DRILL_BACKUPS" "$DRILL_DEPLOY_ROOT"
# The container runs as UID/GID 10001, not this drill's own uid (1001 on the
# hosted runner). `chmod 0777` on the throwaway fixture dir lets the container
# write it while the drill keeps host-side control (it removes and rewrites
# uploads fixtures mid-test). Chowning to 10001 would need sudo and would lock
# the non-root drill out of its own directory.
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

# The deploy scripts take their configuration from the environment. These names
# are deliberately not `readonly` in this script, or the assignment below would
# fail.
script_env() {
  env \
    COMPOSE_PROJECT_NAME="$PROJECT" \
    AAU_APP_PORT="$DRILL_APP_PORT" \
    AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
    DEPLOY_ROOT="$DRILL_DEPLOY_ROOT" \
    ENV_FILE="$DRILL_ENV" \
    COMPOSE_FILE="$VPS_COMPOSE" \
    STATE_FILE="${DRILL_DEPLOY_ROOT}/deployed-image" \
    BACKUP_ROOT="$DRILL_BACKUPS" \
    UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    "$@"
}

# Regression guard: restore.sh records the image it started, so the next
# deploy reports the correct previous known-good image.
assert_state_file_written() {
  local expected="$1"
  if [[ "$(cat "${DRILL_DEPLOY_ROOT}/deployed-image" 2>/dev/null)" == "$expected" ]]; then
    pass "restore.sh recorded the running image in the deployed-image state file"
  else
    fail "deployed-image state file was not updated by restore.sh"
  fi
}

wait_for_health() {
  local timeout="${1:-300}"
  local deadline=$((SECONDS + timeout))
  local status
  while (( SECONDS < deadline )); do
    status="$(compose ps --format '{{.Health}}' app-prod 2>/dev/null | head -1 || true)"
    [[ "$status" == "healthy" ]] && return 0
    sleep 5
  done
  return 1
}

phase "Bring up a disposable production stack"
compose up --detach --wait postgres-prod redis-prod >/dev/null
compose up --detach app-prod >/dev/null
if wait_for_health 420; then pass "stack is healthy"; else
  fail "stack never became healthy"; compose logs --tail 60 --no-color app-prod || true; exit 1
fi

phase "Create recoverable state"
psql_app "CREATE TABLE IF NOT EXISTS restore_canary (id serial primary key, marker text)" >/dev/null
psql_app "INSERT INTO restore_canary (marker) VALUES ('before-backup')" >/dev/null
compose exec -T --user 10001 app-prod sh -c \
  'printf "backup-media-fixture" > /app/uploads/media/backup-canary.txt'
roles_before="$(psql_app "SELECT count(*) FROM roles")"
admin_before="$(psql_app "SELECT hash FROM users WHERE email='${ADMIN_EMAIL}'")"
info "roles=${roles_before}, canary and media fixture written"

phase "Backup"
backup_dir="$(script_env bash "${REPO_ROOT}/deploy/scripts/backup.sh" | tail -1)"
if [[ -d "$backup_dir" ]]; then pass "backup created at ${backup_dir}"; else fail "backup.sh produced no directory"; exit 1; fi

[[ -s "${backup_dir}/postgres.dump" ]] && pass "PostgreSQL dump is non-empty" || fail "dump is empty"
[[ -s "${backup_dir}/postgres.toc" ]] && pass "dump verified readable by pg_restore --list" || fail "dump verification artifact missing"
[[ -s "${backup_dir}/uploads.tar.gz" ]] && pass "uploads archive created" || fail "uploads archive missing"
[[ -s "${backup_dir}/metadata.json" ]] && pass "compatibility metadata recorded" || fail "metadata.json missing"
# The archive must survive a real integrity check, not `tar --test` — which
# passes on corrupt and truncated archives (proven in
# tests/docker/first-install-and-recovery-drill.sh).
gzip --test "${backup_dir}/uploads.tar.gz" \
  && pass "uploads archive passes a full gzip integrity check" \
  || fail "uploads archive fails gzip integrity check"
[[ -s "${backup_dir}/SHA256SUMS" ]] && pass "checksums recorded" || fail "checksums missing"

phase "Quiesced backup freezes EVERY application writer (P1-D)"
# An orphan candidate from an interrupted deploy connects to the SAME database.
# A quiesced backup that stops only app-prod would record consistency=quiesced
# while the candidate kept writing — the exact defect. writers_freeze must stop
# it too before the label is earned; otherwise the backup is a lie.
compose --profile candidate up --detach app-candidate >/dev/null 2>&1 || true
sleep 3
cand_before="$(docker ps --filter "name=${PROJECT}-app-candidate" --filter status=running --format '{{.Names}}' | wc -l | tr -d ' ')"
[[ "$cand_before" == "1" ]] && pass "an orphan app-candidate is running before the quiesced backup" \
  || fail "could not start an orphan app-candidate for the freeze test"

qlog="${WORKDIR}/quiesced-backup.log"
qbackup_dir="$(QUIESCE_APP=true script_env bash "${REPO_ROOT}/deploy/scripts/backup.sh" 2>"$qlog" | tail -1)"
[[ -d "$qbackup_dir" ]] && pass "quiesced backup created at ${qbackup_dir}" || fail "quiesced backup produced no directory"
grep -q '"consistency": "quiesced"' "${qbackup_dir}/metadata.json" \
  && pass "the backup is recorded as consistency=quiesced" \
  || fail "the backup did not record consistency=quiesced"
grep -qF "all application writers confirmed frozen" "$qlog" \
  && pass "the backup log reports every application writer frozen" \
  || fail "the backup log did not confirm every writer frozen"
# THE discriminating assertion: before this fix, backup.sh stopped only app-prod
# and would have recorded quiesced with the candidate still writing.
cand_after="$(docker ps --filter "name=${PROJECT}-app-candidate" --filter status=running --format '{{.Names}}' | wc -l | tr -d ' ')"
[[ "$cand_after" == "0" ]] \
  && pass "the orphan candidate was stopped BEFORE the backup was labeled quiesced" \
  || fail "a writer (app-candidate) was still running while the backup claimed quiesced"
compose --profile candidate rm --stop --force app-candidate >/dev/null 2>&1 || true
if wait_for_health 300; then pass "app-prod healthy again after the quiesced backup"; else
  fail "app-prod did not recover after the quiesced backup"; compose logs --tail 40 --no-color app-prod || true
fi

phase "Quiesced backup freezes a real ONE-OFF application container (P1-D / S5)"
# app-candidate above is a SERVICE, so `compose stop app-candidate` reaches it.
# A one-off container from `compose run` (the one-shot Seed is exactly this shape)
# is NOT a service: no `compose stop` names it, so writers_freeze must find it by
# its `com.docker.compose.oneoff=True` label and stop it explicitly. That is the
# harder half of "every application writer": the freeze stops EVERY active
# application container because any of them could be mid-write, so this proves it
# on the container class the previous phase did not cover. It does not claim this
# particular container is writing — it runs a sleep, not the web server or seed —
# only that a one-off application container (the seed's shape) is frozen.
oneoff_name="${PROJECT}-oneoff-app"
docker rm -f "$oneoff_name" >/dev/null 2>&1 || true
# A detached one-off based on the app-prod service (same image and identity),
# running a sleep instead of the web server so it stays up as an active one-off
# container that no `compose stop app-prod` can reach.
compose run --detach --no-deps --name "$oneoff_name" app-prod sh -c 'sleep 600' >/dev/null 2>&1 || true
sleep 3
oneoff_before="$(docker ps --filter "name=${oneoff_name}" --filter status=running --format '{{.Names}}' | wc -l | tr -d ' ')"
oneoff_is_oneoff="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.oneoff"}}' "$oneoff_name" 2>/dev/null || echo missing)"
[[ "$oneoff_before" == "1" ]] && pass "a one-off application container (compose run) is running before the quiesced backup" \
  || fail "could not start a one-off application container for the freeze test"
[[ "$oneoff_is_oneoff" == "True" ]] && pass "it is a genuine one-off container (oneoff=True), not a service" \
  || fail "the container under test is not a one-off container (label=${oneoff_is_oneoff})"

qlog2="${WORKDIR}/quiesced-backup-oneoff.log"
qbackup_dir2="$(QUIESCE_APP=true script_env bash "${REPO_ROOT}/deploy/scripts/backup.sh" 2>"$qlog2" | tail -1)"
[[ -d "$qbackup_dir2" ]] && pass "quiesced backup created with a one-off application container present" || fail "quiesced backup produced no directory"
grep -q '"consistency": "quiesced"' "${qbackup_dir2}/metadata.json" \
  && pass "the backup is recorded as consistency=quiesced" \
  || fail "the backup did not record consistency=quiesced"
# THE discriminating assertion: writers_freeze had to stop a container that no
# `compose stop <service>` addresses. If it did not, the backup claimed quiesced
# while a one-off application container was still up.
oneoff_after="$(docker ps --filter "name=${oneoff_name}" --filter status=running --format '{{.Names}}' | wc -l | tr -d ' ')"
[[ "$oneoff_after" == "0" ]] \
  && pass "the one-off application container was stopped BEFORE the backup was labeled quiesced" \
  || fail "a one-off application container was still running while the backup claimed quiesced"
docker rm -f "$oneoff_name" >/dev/null 2>&1 || true
if wait_for_health 300; then pass "app-prod healthy again after the one-off freeze backup"; else
  fail "app-prod did not recover after the one-off freeze backup"; compose logs --tail 40 --no-color app-prod || true
fi

phase "Simulate data loss"
psql_app "DELETE FROM restore_canary" >/dev/null
psql_app "DELETE FROM roles WHERE slug IN ('student','doctor')" >/dev/null
rm -f "${UPLOADS_DIR}/media/backup-canary.txt"
lost_roles="$(psql_app "SELECT count(*) FROM roles")"
info "after simulated loss: roles=${lost_roles}, canary rows=$(psql_app 'SELECT count(*) FROM restore_canary')"
[[ "$lost_roles" != "$roles_before" ]] && pass "destructive change applied" || fail "could not simulate data loss"

phase "Restore"
if script_env bash "${REPO_ROOT}/deploy/scripts/restore.sh" "$backup_dir" 2>&1 | tail -5; then
  pass "restore.sh completed"
else
  fail "restore.sh exited non-zero"
fi

if wait_for_health 300; then pass "stack healthy after restore"; else
  fail "stack unhealthy after restore"; compose logs --tail 60 --no-color app-prod || true
fi

assert_state_file_written "$IMAGE"

phase "Verify recovery"
roles_after="$(psql_app "SELECT count(*) FROM roles")"
canary_after="$(psql_app "SELECT marker FROM restore_canary" || echo MISSING)"
admin_after="$(psql_app "SELECT hash FROM users WHERE email='${ADMIN_EMAIL}'")"
media_after="$(cat "${UPLOADS_DIR}/media/backup-canary.txt" 2>/dev/null || echo MISSING)"

[[ "$roles_after" == "$roles_before" ]] && pass "all Roles restored (${roles_after})" || fail "Role count ${roles_after}, expected ${roles_before}"
[[ "$canary_after" == "before-backup" ]] && pass "application data restored" || fail "application data not restored: ${canary_after}"
[[ "$admin_after" == "$admin_before" ]] && pass "Super Admin credentials restored intact" || fail "Super Admin row differs after restore"
[[ "$media_after" == "backup-media-fixture" ]] && pass "uploaded media restored" || fail "media not restored: ${media_after}"

health="$(compose exec -T app-prod node -e \
  "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>console.log(t))")"
grep -q '"status":"ok"' <<<"$health" && pass "/api/health returns ok after restore" || fail "health not ok: ${health}"

printf '\n'
if (( failures > 0 )); then
  printf '\033[1;31m%d assertion(s) failed.\033[0m\n' "$failures"
  exit 1
fi
printf '\033[1;32mBackup/restore drill passed against the real deploy scripts.\033[0m\n'
printf 'PENDING REAL VPS: off-host backup destination and a restore drill from that copy.\n'
