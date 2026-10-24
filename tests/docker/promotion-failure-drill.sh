#!/usr/bin/env bash
# Fault injection for the PROMOTION phase of deploy/scripts/deploy.sh —
# failure after the candidate is healthy but before the stable port is served.
#
# This window had no recovery at all. The candidate had already proven the
# release healthy against this database, the previous release had already been
# stopped for the maintenance window, and then, if the move onto the stable
# port failed, deploy.sh printed advice and exited. Nothing served the site,
# and nothing tried to.
#
# Worse, the most likely cause — something else holding 127.0.0.1:<app port> —
# made `compose up` fail immediately rather than start an unhealthy container,
# and under `set -euo pipefail` that aborted the script before any recovery
# code could run. The one failure mode the recovery existed for was the one it
# could never reach.
#
# The injection is exactly that: a squatter container binds the stable port
# during the maintenance window. It is released, or held, depending on which
# recovery branch the scenario is meant to exercise.

set -uo pipefail

readonly RUNNER_IMAGE="${1:?usage: $0 <runner-image>}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-promo-$$"
readonly REGISTRY_NAME="promo-registry-$$"
readonly REGISTRY_PORT="${PROMO_REGISTRY_PORT:-5568}"
readonly APP_PORT="${PROMO_APP_PORT:-13980}"
readonly CANDIDATE_PORT="${PROMO_CANDIDATE_PORT:-13981}"

ROOT="$(mktemp -d)"
SQUAT_PIDFILE="${ROOT}/squatter.pid"
SQUAT_FAILED_FILE="${ROOT}/squatter.failed"
pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}
contains() {
  if grep -qF -- "$3" "$2"; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       %s did not contain: %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
  fi
}
absent() {
  if grep -qF -- "$3" "$2"; then
    printf '  FAIL %s\n       %s unexpectedly contained: %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
  else
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  fi
}

cleanup() {
  unsquat
  APP_IMAGE=placeholder:down docker compose -p "$PROJECT" \
    --env-file "${ROOT}/deploy/.env.production" \
    -f "${ROOT}/deploy/docker-compose.vps.yml" --profile candidate \
    down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
  if [[ -n "${KEEP_ROOT:-}" ]]; then
    echo "[drill] logs kept in ${ROOT}"
  else
    # Some fixtures end up owned by the container UID (10001) — after restore.sh
    # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
    # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
    # let cleanup fail the job (it is best-effort teardown of a temp dir).
    rm -rf "$ROOT" 2>/dev/null || sudo rm -rf "$ROOT" 2>/dev/null || true
  fi
}
trap cleanup EXIT

run_env() {
  env AAU_ENV=production AAU_ENV_ROOT="$ROOT" DEPLOY_ROOT="${ROOT}/deploy" \
    COMPOSE_PROJECT_NAME="$PROJECT" \
    AAU_APP_PORT="$APP_PORT" AAU_CANDIDATE_PORT="$CANDIDATE_PORT" \
    BACKUP_ROOT="${ROOT}/backups" UPLOADS_HOST_PATH="${ROOT}/uploads" \
    "$@"
}
compose() {
  env APP_IMAGE="$(cat "${ROOT}/deploy/deployed-image" 2>/dev/null || echo placeholder:none)" \
      APP_HOST_PORT="$APP_PORT" CANDIDATE_HOST_PORT="$CANDIDATE_PORT" \
      UPLOADS_HOST_PATH="${ROOT}/uploads" \
    docker compose -p "$PROJECT" --env-file "${ROOT}/deploy/.env.production" \
      -f "${ROOT}/deploy/docker-compose.vps.yml" "$@"
}
psql_admin() {
  compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1" 2>/dev/null || true
}

# Waits for a line to appear in the live deploy log, then returns. Bounded so a
# scenario that never reaches its trigger fails the drill rather than hanging.
await_log() {
  local logfile="$1" needle="$2" limit="${3:-180}"
  for _ in $(seq 1 $((limit * 2))); do
    [[ -f "$logfile" ]] && grep -qF -- "$needle" "$logfile" && return 0
    sleep 0.5
  done
  return 1
}

# Holds 127.0.0.1:APP_PORT so the promotion cannot bind it.
#
# A HOST process, not a container. Two container-based attempts were unreliable
# in ways that silently weakened the injection: mapping to container port 80
# made the official redis image exit immediately (it runs as a non-root user
# that cannot bind a privileged port), and even with a valid mapping the
# squatter did not survive the repeated `compose up --force-recreate` cycle, so
# by the third attempt the port was free and the drill measured the recovery
# branch it was not aiming at. A plain listening socket owned by this script is
# not affected by anything docker does.
# The PID lives in a FILE, not a variable: `squat` is called from a background
# watcher subshell, so a variable set there is invisible to the parent that has
# to release the port afterwards.
# True when NOTHING can bind the port, i.e. something else is holding it.
# Asserted by attempting a real bind rather than by inspecting a process:
# `kill -0` succeeds for a ZOMBIE, so a squatter that died instantly still
# looked alive. That is exactly how an earlier version of this drill reported
# "the port was still held" while the port was in fact free.
port_is_held() {
  ! python3 -c "
import socket, sys
s = socket.socket()
try:
    s.bind(('127.0.0.1', ${APP_PORT}))
except OSError:
    sys.exit(1)
sys.exit(0)
" 2>/dev/null
}

squat() {
  unsquat

  # ONE process waits for the port and takes it, retrying the bind tightly.
  #
  # This used to be check-then-bind across two processes: a `port_is_held`
  # probe loop that binds and closes, and then a fresh interpreter to take the
  # port for real. A whole python startup sits between the probe and that
  # second bind, and in run 35055589279 the promotion won exactly that window —
  #
  #   OSError: [Errno 98] Address already in use
  #
  # — so the squatter died on arrival, `compose up app-prod` got the port, the
  # promotion SUCCEEDED, and scenario A went on to assert a failed deploy
  # against a successful one. Three assertions failed describing recovery
  # behaviour that was never reached. A drill that silently measures the wrong
  # branch is worse than one that fails, which is the whole reason
  # `port_is_held` binds instead of checking for a live PID.
  #
  # Retrying inside one process narrows the window to a single bind syscall,
  # and the loop starts spinning BEFORE the maintenance window frees the port,
  # so the squatter is already waiting when the previous release lets go
  # rather than arriving after it.
  #
  # Deliberately no SO_REUSEADDR: it would not take a port from a live listener
  # anyway, and it WOULD bind one sitting in TIME_WAIT that `port_is_held`
  # (which sets no such option) still reports as held — the verification below
  # would then spin against a squatter that had in fact succeeded.
  python3 -c "
import socket, sys, time
deadline = time.monotonic() + 30
while True:
    s = socket.socket()
    try:
        s.bind(('127.0.0.1', ${APP_PORT}))
    except OSError:
        s.close()
        if time.monotonic() >= deadline:
            sys.exit(1)
        time.sleep(0.01)
        continue
    break
s.listen(1)
time.sleep(3600)
" &
  printf '%s' "$!" > "$SQUAT_PIDFILE"

  # Verify by BINDING, not by asking whether the process exists. Outlasts the
  # squatter's own 30s deadline so a give-up is reported as a give-up.
  for _ in $(seq 1 160); do
    port_is_held && return 0
    sleep 0.25
  done
  echo "[drill] the port squatter did not take ${APP_PORT}; the injection is not in effect" >&2
  return 1
}
unsquat() {
  if [[ -n "$SQUAT_PIDFILE" && -s "$SQUAT_PIDFILE" ]]; then
    kill -9 "$(<"$SQUAT_PIDFILE")" 2>/dev/null || true
    wait "$(<"$SQUAT_PIDFILE")" 2>/dev/null || true
    : > "$SQUAT_PIDFILE"
  fi
  return 0
}

echo "=== 0. deploy a first release and confirm it serves ==="
mkdir -p "${ROOT}/deploy/scripts" "${ROOT}/uploads/media" "${ROOT}/backups"
cp -r "${REPO_ROOT}/deploy/scripts/." "${ROOT}/deploy/scripts/"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${ROOT}/deploy/"
cp -r "${REPO_ROOT}/deploy/postgres" "${ROOT}/deploy/"
# chmod 0777 (not chown) so the container's UID 10001 can write this throwaway
# fixture dir without privilege, while the non-root drill keeps host-side control.
chmod -R 0777 "${ROOT}/uploads" 2>/dev/null || true

cat > "${ROOT}/deploy/.env.production" <<'EOF'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='promo-payload-secret-at-least-32-characters'
INITIAL_ADMIN_EMAIL='admin@example.test'
INITIAL_ADMIN_PASSWORD='Promo-Drill-Admin-2026!'
EOF

docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REGISTRY_NAME" -p "${REGISTRY_PORT}:5000" registry:2 >/dev/null
for _ in $(seq 1 30); do curl -sf "http://127.0.0.1:${REGISTRY_PORT}/v2/" >/dev/null 2>&1 && break; sleep 1; done
REF="127.0.0.1:${REGISTRY_PORT}/aau/runner:promo"
docker tag "$RUNNER_IMAGE" "$REF"
docker push -q "$REF" >/dev/null

run_env HEALTH_TIMEOUT_SECONDS=300 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" \
  > "${ROOT}/deploy0.log" 2>&1 || { echo "initial deploy failed"; tail -30 "${ROOT}/deploy0.log"; exit 1; }
check "the first release is serving" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"
FIRST_DIGEST="$(cat "${ROOT}/deploy/deployed-image")"

echo
echo "=== A. promotion fails with the schema UNCHANGED: service must be restored ==="
# Re-deploying the same image applies no migrations, so the previous release is
# still a valid pairing with this database and must be brought back rather than
# left down.
LOG_A="${ROOT}/deployA.log"
(
  # Squat once the candidate is healthy, which is BEFORE the maintenance window
  # frees the port — `squat` spins on the bind, so it is already waiting when
  # the previous release lets go, and races only the promotion's own
  # `compose up app-prod`, which comes strictly later. Triggering on the
  # maintenance-window line itself was unreliable — it is printed BEFORE the
  # stop completes, so the squatter raced the previous release for the port
  # and sometimes lost.
  #
  # Released once deploy.sh has given up promoting, so the fallback restart has
  # a port to bind and the SCHEMA-UNCHANGED branch is what gets exercised.
  # The subshell cannot report through a variable, so a failed injection is
  # recorded in a file the parent checks before it asserts anything.
  await_log "$LOG_A" "candidate is healthy" 180 && { squat || : > "$SQUAT_FAILED_FILE"; }
  await_log "$LOG_A" "still failing after a retry" 180
  unsquat
) &
watcher=$!

run_env HEALTH_TIMEOUT_SECONDS=20 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" > "$LOG_A" 2>&1
rc=$?
wait "$watcher" 2>/dev/null || true
unsquat

# Assert nothing if the fault was never injected: without the squatter the
# promotion simply succeeds, and every assertion below would be measuring the
# ordinary happy path while claiming to measure promotion recovery.
if [[ -f "$SQUAT_FAILED_FILE" ]]; then
  echo "[drill] scenario A never held ${APP_PORT}, so the promotion was never blocked;" >&2
  echo "        the recovery branch was not exercised and its assertions would be meaningless" >&2
  exit 1
fi

check "the deploy reported failure" "$([[ "$rc" -ne 0 ]] && echo yes || echo no)" "yes"
contains "the candidate was healthy before the failure" "$LOG_A" "candidate is healthy"
contains "the promotion was retried once" "$LOG_A" "retrying the promotion once"
contains "the schema-unchanged branch restarted the previous release" "$LOG_A" \
  "restarting it to end the outage"

# The property that actually matters: the site is up.
served=""
for _ in $(seq 1 60); do
  served="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")"
  [[ "$served" == "200" ]] && break
  sleep 1
done
check "the site is serving again after the failed promotion" "$served" "200"
check "the release-state file was NOT advanced to the failed release" \
  "$(cat "${ROOT}/deploy/deployed-image")" "$FIRST_DIGEST"

echo
echo "=== B. promotion fails with the schema CHANGED: the old build must NOT start ==="
# The one action that turns an outage into corruption, plus the branch where
# nothing can serve at all.
#
# The port is squatted BEFORE the deploy starts, not mid-flight. Squatting on a
# log trigger raced the promotion: the first bind failed, but the port was free
# again by the time the recovery branch retried, so the drill kept measuring
# the "recovered with the new image" path instead of the "cannot serve at all"
# path it is aiming at. Stopping app-prod first frees the port for the drill to
# take, and deploy.sh stopping an already-stopped app-prod is a no-op.
LOG_B="${ROOT}/deployB.log"
compose stop app-prod >/dev/null 2>&1 || true
squat || { echo "could not hold the port; aborting scenario B"; exit 1; }

(
  # The ledger has to move DURING the deploy: deploy.sh reads it once at the
  # start and again on failure, so a row inserted beforehand would appear in
  # both and register as no change. There is no timing pressure here — the
  # failure path is two health waits away.
  if await_log "$LOG_B" "candidate is healthy" 180; then
    psql_admin "INSERT INTO payload_migrations (name, batch, updated_at, created_at)
                VALUES ('99999999_promotion_drill', 99, now(), now())" >/dev/null
  fi
) &
watcher=$!

run_env HEALTH_TIMEOUT_SECONDS=20 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" > "$LOG_B" 2>&1
rc=$?
wait "$watcher" 2>/dev/null || true

# The injection must still have been in effect for the assertions to mean
# anything. Without this the scenario could pass for the wrong reason.
check "the port was still held throughout the deploy" \
  "$(port_is_held && echo held || echo released)" "held"
unsquat

check "the deploy reported failure" "$([[ "$rc" -ne 0 ]] && echo yes || echo no)" "yes"
contains "the failed promotion was stopped and PROVEN stopped before the ledger read" \
  "$LOG_B" "the failed promotion is confirmed stopped"
contains "the schema change was detected" "$LOG_B" "schema CHANGED during this deploy"

# THE safety property: the previous build predates the schema, and starting it
# is how a failed deploy becomes data corruption.
absent "the previous release was NOT restarted" "$LOG_B" "restarting it to end the outage"
# There was a second assertion here, that `APP_IMAGE=${FIRST_DIGEST}` never
# appears in the log. It was removed because it cannot distinguish what it
# claims to: scenario B redeploys the SAME $REF, so FIRST_DIGEST is also the new
# candidate's digest, and the check could only ever pass vacuously or fail on
# the new image. The assertion above already proves the safety property.

# ── The sub-branch the previous round could not cover ─────────────────────
# schema moved AND the promoted image cannot serve the stable port. The old
# recovery re-ran `compose up app-prod` (no --force-recreate) to "keep
# recovering", and a `docker start` on an existing container does not re-check
# the host bind — so a squatted port did not keep it down and the drill kept
# measuring a false "recovered" path. deploy.sh no longer does that: after the
# bounded retry it stops the image, proves it stopped, and (schema moved) leaves
# it stopped with restore guidance. So the branch is now genuinely reachable and
# asserted, not conceded.
contains "the new image is LEFT STOPPED, not crash-looped on the port" "$LOG_B" \
  "LEFT STOPPED rather than crash-looped"
contains "nothing is left serving the stable port, by design" "$LOG_B" \
  "NOTHING IS SERVING PORT"
contains "the operator is pointed at a migration-aware restore" "$LOG_B" \
  "restore.sh <backup-directory>"
# Proven against the real stack, not just the log: with the squatter released,
# app-prod is still down — deploy.sh did not leave it crash-looping.
check "app-prod is not running after the failed schema-changed promotion" \
  "$(docker ps --filter "name=${PROJECT}-app-prod" --filter "status=running" --format '{{.Names}}' | wc -l | tr -d ' ')" "0"
check "the stable port serves nothing after the failed promotion" \
  "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${APP_PORT}/api/health")" "000"

check "the release-state file was still NOT advanced" \
  "$(cat "${ROOT}/deploy/deployed-image")" "$FIRST_DIGEST"

unsquat

printf '\n[promotion-failure-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
