#!/usr/bin/env bash
# Fail-closed proofs for deploy/scripts/restore.sh.
#
# Two classes of defect, both of which the existing backup/restore drill was
# structurally unable to see because it only ever restored the right backup
# into the right environment with nothing else running.
#
#   A. Cross-environment restore. backup.sh has always RECORDED the source
#      environment in metadata.json, and restore.sh never read it. A staging
#      backup — disposable content, demo users, whatever the last
#      reset-and-full left behind — could be restored straight over
#      production. Nothing in the tooling objected.
#
#   B. The write freeze. Only app-prod was stopped, so app-candidate and
#      one-off seed containers kept writing; `--status running` does not
#      report a crash-looping container (which is reconnecting, not idle);
#      and sessions were terminated and THEN counted, a race that
#      `restart: unless-stopped` is guaranteed to win.
#
# Every assertion here is against the real script, a real stack and a real
# database.

set -uo pipefail

readonly RUNNER_IMAGE="${1:?usage: $0 <runner-image>}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-rguard-$$"
readonly REGISTRY_NAME="rguard-registry-$$"
readonly REGISTRY_PORT="${RGUARD_REGISTRY_PORT:-5567}"
readonly APP_PORT="${RGUARD_APP_PORT:-13970}"
readonly CANDIDATE_PORT="${RGUARD_CANDIDATE_PORT:-13971}"

ROOT="$(mktemp -d)"
pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}
# `contains <label> <file> <needle>` — a boolean, not a line count.
contains() {
  if grep -qF -- "$3" "$2"; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       %s did not contain: %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
    tail -12 "$2" | sed 's/^/         | /'
  fi
}

cleanup() {
  APP_IMAGE=placeholder:down docker compose -p "$PROJECT" \
    --env-file "${ROOT}/deploy/.env.production" \
    -f "${ROOT}/deploy/docker-compose.vps.yml" --profile candidate \
    down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$ROOT" 2>/dev/null || sudo rm -rf "$ROOT" 2>/dev/null || true
}
trap cleanup EXIT

# Run a deploy script as a given environment. AAU_ENV selects the policy;
# every path is pinned explicitly so both "environments" share one real stack
# and the drill is testing the POLICY, not the directory layout.
as_env() {
  local env_name="$1"; shift
  env AAU_ENV="$env_name" \
    COMPOSE_PROJECT_NAME="$PROJECT" \
    DEPLOY_ROOT="${ROOT}/deploy" \
    ENV_FILE="${ROOT}/deploy/.env.production" \
    COMPOSE_FILE="${ROOT}/deploy/docker-compose.vps.yml" \
    STATE_FILE="${ROOT}/deploy/deployed-image" \
    LOCK_FILE="${ROOT}/deploy/locks/operations.lock" \
    BACKUP_ROOT="${ROOT}/backups" \
    UPLOADS_HOST_PATH="${ROOT}/uploads" \
    AAU_ENV_ROOT="$ROOT" \
    AAU_APP_PORT="$APP_PORT" AAU_CANDIDATE_PORT="$CANDIDATE_PORT" \
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
# A real TCP login as the application role, the same path the app uses. Prints
# OK on success; on failure prints the server's message (e.g. the NOLOGIN
# rejection). Not a unix-socket check: host pg_hba rules can differ.
app_tcp_login() {
  compose exec -T -e PGPASSWORD='app@p:a/ss?q=2&r#s%20 B2!' postgres-prod \
    psql -h 127.0.0.1 -p 5432 -U aau_app -d aau_platform -Atc "select 'OK'" 2>&1 || true
}

# Copy a backup and rewrite fields in its metadata, keeping SHA256SUMS valid so
# the drill exercises the ENVIRONMENT checks rather than the checksum check.
mutate_backup() {
  local src="$1" dest="$2" key="$3" value="$4"
  rm -rf "$dest"; cp -r "$src" "$dest"
  sed -i "s|\"${key}\": \"[^\"]*\"|\"${key}\": \"${value}\"|" "${dest}/metadata.json"
  ( cd "$dest" && rm -f SHA256SUMS && sha256sum -- * > SHA256SUMS.tmp && mv SHA256SUMS.tmp SHA256SUMS )
}

echo "=== 0. deploy a real stack and take a real backup ==="
mkdir -p "${ROOT}/deploy/scripts" "${ROOT}/uploads/media" "${ROOT}/backups"
cp -r "${REPO_ROOT}/deploy/scripts/." "${ROOT}/deploy/scripts/"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${ROOT}/deploy/"
cp -r "${REPO_ROOT}/deploy/postgres" "${ROOT}/deploy/"
echo 'restore-guard drill fixture' > "${ROOT}/uploads/media/fixture.txt"
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
PAYLOAD_SECRET='rguard-payload-secret-at-least-32-characters'
INITIAL_ADMIN_EMAIL='admin@example.test'
INITIAL_ADMIN_PASSWORD='RGuard-Drill-Admin-2026!'
EOF

docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REGISTRY_NAME" -p "${REGISTRY_PORT}:5000" registry:2 >/dev/null
for _ in $(seq 1 30); do curl -sf "http://127.0.0.1:${REGISTRY_PORT}/v2/" >/dev/null 2>&1 && break; sleep 1; done
REF="127.0.0.1:${REGISTRY_PORT}/aau/runner:rguard"
docker tag "$RUNNER_IMAGE" "$REF"
docker push -q "$REF" >/dev/null

as_env production HEALTH_TIMEOUT_SECONDS=300 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" \
  > "${ROOT}/deploy.log" 2>&1 || { echo "deploy failed"; tail -30 "${ROOT}/deploy.log"; exit 1; }
check "the stack is healthy" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"

as_env production bash "${ROOT}/deploy/scripts/backup.sh" > "${ROOT}/backup.log" 2>&1 \
  || { echo "backup failed"; tail -30 "${ROOT}/backup.log"; exit 1; }
BACKUP="$(find "${ROOT}/backups" -mindepth 1 -maxdepth 1 -type d | head -1)"
check "a backup was produced" "$([[ -d "$BACKUP" ]] && echo yes || echo no)" "yes"
check "the backup records its source environment" \
  "$(grep -c '"environment": "production"' "${BACKUP}/metadata.json")" "1"

echo
echo "=== A1. a STAGING backup is refused against production, with no override ==="
# The direction that loses real content. There is deliberately no
# acknowledgement string for it.
mutate_backup "$BACKUP" "${ROOT}/staging-backup" environment staging
as_env production bash "${ROOT}/deploy/scripts/restore.sh" "${ROOT}/staging-backup" \
  > "${ROOT}/a1.log" 2>&1
check "the restore refused" "$?" "1"
contains "the refusal names the environment mismatch" "${ROOT}/a1.log" "taken from 'staging'"
contains "the refusal states there is no override" "${ROOT}/a1.log" "no override for this direction"

echo
echo "=== A2. the override does NOT unlock staging -> production ==="
# A refusal that any sufficiently determined environment variable can lift is
# not a refusal.
as_env production \
  ALLOW_CROSS_ENVIRONMENT_RESTORE=I-UNDERSTAND-THIS-OVERWRITES-A-DIFFERENT-ENVIRONMENT \
  RESTORE_IMAGE="$REF" \
  bash "${ROOT}/deploy/scripts/restore.sh" "${ROOT}/staging-backup" > "${ROOT}/a2.log" 2>&1
check "still refused with the acknowledgement set" "$?" "1"
contains "still refused for the same reason" "${ROOT}/a2.log" "no override for this direction"

echo
echo "=== A3. production -> staging is refused WITHOUT an acknowledgement ==="
as_env staging bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/a3.log" 2>&1
check "the restore refused" "$?" "1"
contains "the refusal explains how to proceed deliberately" "${ROOT}/a3.log" \
  "ALLOW_CROSS_ENVIRONMENT_RESTORE"

echo
echo "=== A4. production -> staging still requires an explicit RESTORE_IMAGE ==="
# The image recorded with a production backup is a production-channel artifact
# and must not run in staging.
as_env staging \
  ALLOW_CROSS_ENVIRONMENT_RESTORE=I-UNDERSTAND-THIS-OVERWRITES-A-DIFFERENT-ENVIRONMENT \
  bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/a4.log" 2>&1
check "the restore refused" "$?" "1"
contains "the refusal asks for a target-channel image" "${ROOT}/a4.log" "requires an explicit RESTORE_IMAGE"

echo
echo "=== A5. a backup of a DIFFERENT database is refused ==="
# One host, two stacks, two databases. This passes every checksum and still
# destroys the wrong one.
mutate_backup "$BACKUP" "${ROOT}/otherdb-backup" database aau_platform_staging
as_env production bash "${ROOT}/deploy/scripts/restore.sh" "${ROOT}/otherdb-backup" \
  > "${ROOT}/a5.log" 2>&1
check "the restore refused" "$?" "1"
contains "the refusal names both databases" "${ROOT}/a5.log" "aau_platform_staging"

echo
echo "=== A6. the matching backup is still accepted (the guard is not a wall) ==="
# Without this, every check above would be satisfied by a restore.sh that
# refuses everything.
as_env production bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/a6.log" 2>&1
check "a same-environment restore succeeds" "$?" "0"
check "the app is healthy after the restore" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"

echo
echo "=== A7. a ghcr restore image is authorized by EXACT repository, not a suffix ==="
# The old check was a suffix heuristic: production rejected anything ending in
# `-staging`. That is not a release boundary. Two of the three cases below would
# have been ACCEPTED by it — a third-party repo, and a lookalike that merely
# contains 'staging' without ending in it — which is how a stolen deploy
# credential would slip an attacker image into production.
readonly HEX64="sha256:0000000000000000000000000000000000000000000000000000000000000000"
for bad in \
  "ghcr.io/attacker/aau-payload-platform@${HEX64}" \
  "ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging@${HEX64}" \
  "ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging-evil@${HEX64}"; do
  as_env production RESTORE_IMAGE="$bad" \
    bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/a7.log" 2>&1
  check "refused a non-approved production repository (${bad##*/})" "$?" "1"
  contains "the refusal names it a channel mismatch" "${ROOT}/a7.log" \
    "not the approved production channel"
done
# The exact approved production repository is NOT rejected at the channel gate
# (it fails later, at the pull, which proves it passed the identity check).
as_env production RESTORE_IMAGE="ghcr.io/mohammed7779948484-tech/aau-payload-platform@${HEX64}" \
  bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/a7ok.log" 2>&1
if grep -qF "not the approved production channel" "${ROOT}/a7ok.log"; then
  printf '  FAIL the exact approved production repository was rejected at the channel gate\n'; fail=$((fail + 1))
else
  printf '  ok   the exact approved production repository passes the channel gate\n'; pass=$((pass + 1))
fi

echo
echo "=== B1. a foreign database session blocks the restore ==="
# Not the application: an operator's psql, a forgotten migration shell, a
# monitoring agent. Only the app role was ever counted, so none of these were
# visible to the old check.
docker exec -d "${PROJECT}-postgres-prod-1" \
  psql -U aau_admin -d aau_platform -c 'select pg_sleep(120)' >/dev/null 2>&1
sleep 2
as_env production bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/b1.log" 2>&1
check "the restore refused while another client was connected" "$?" "1"
contains "the refusal reports the blocking sessions" "${ROOT}/b1.log" "still connected to aau_platform"
contains "the refusal names the connected role" "${ROOT}/b1.log" "aau_admin"

echo
echo "=== B2. the failed restore restored LOGIN (the EXIT trap, not luck) ==="
# The freeze disables LOGIN on the app role BEFORE counting sessions, so B1
# fails AFTER the barrier is up. The EXIT trap is the only thing that can have
# re-enabled LOGIN; without it the safety mechanism itself would have locked
# the application out of its own database.
# Terminated through SQL, not `pkill`: the postgres image has no procps, so the
# pkill silently did nothing and B1's session survived into B3 — where the
# freeze check then refused, correctly, for a reason the drill had created.
psql_admin "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = 'aau_platform' AND query LIKE '%pg_sleep%' AND pid <> pg_backend_pid()" >/dev/null
for _ in $(seq 1 40); do
  [[ "$(psql_admin "SELECT count(*) FROM pg_stat_activity
     WHERE datname = 'aau_platform' AND pid <> pg_backend_pid()
       AND backend_type = 'client backend'")" == "0" ]] && break
  sleep 0.5
done
check "the injected foreign session is gone" \
  "$(psql_admin "SELECT count(*) FROM pg_stat_activity
     WHERE datname = 'aau_platform' AND pid <> pg_backend_pid()
       AND backend_type = 'client backend'")" "0"
check "the app role has LOGIN again after the post-freeze failure" \
  "$(psql_admin "SELECT rolcanlogin FROM pg_roles WHERE rolname='aau_app'")" "t"
check "a real TCP login as the app role now succeeds" \
  "$(app_tcp_login | grep -c OK)" "1"

echo
echo "=== B3. a running app-candidate is stopped and proven stopped ==="
# app-candidate connects to the SAME database and is not touched by
# `compose stop app-prod`, so it kept writing throughout a restore.
compose --profile candidate up --detach --no-deps app-candidate >/dev/null 2>&1
sleep 3
candidate_before="$(docker ps --filter "name=${PROJECT}-app-candidate" --format '{{.Names}}' | wc -l | tr -d ' ')"
check "app-candidate is running before the restore" "$candidate_before" "1"

as_env production bash "${ROOT}/deploy/scripts/restore.sh" "$BACKUP" > "${ROOT}/b3.log" 2>&1
check "the restore succeeded" "$?" "0"
contains "the restore stopped every application container" "${ROOT}/b3.log" \
  "all application containers confirmed stopped"
check "app-candidate is no longer running" \
  "$(docker ps --filter "name=${PROJECT}-app-candidate" --format '{{.Names}}' | wc -l | tr -d ' ')" "0"

echo
echo "=== B4. the write freeze is PROVEN over TCP, and lifted before the app returns ==="
# The proof is a real TCP login attempt as the app role, made by restore.sh
# itself while the schema is frozen and BEFORE the destructive section. A
# `has_database_privilege(... 'CONNECT')` check would have been satisfied by a
# revoke that does not actually stop the app reconnecting (CONNECT is granted
# to PUBLIC), which is the bug this round fixed.
contains "LOGIN was disabled during the restore" "${ROOT}/b3.log" "disabling LOGIN on aau_app"
contains "a fresh TCP login was refused mid-freeze" "${ROOT}/b3.log" \
  "a fresh TCP login as aau_app is refused"
contains "LOGIN was verified restored before the app returned" "${ROOT}/b3.log" \
  "aau_app can log in again"
check "the app is healthy after the restore" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"
check "the app role has LOGIN after the restore" \
  "$(psql_admin "SELECT rolcanlogin FROM pg_roles WHERE rolname='aau_app'")" "t"
check "a real TCP login as the app role succeeds after the restore" \
  "$(app_tcp_login | grep -c OK)" "1"

printf '\n[restore-guard-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
