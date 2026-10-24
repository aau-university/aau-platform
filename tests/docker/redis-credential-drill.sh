#!/usr/bin/env bash
# Proves the DEPLOYED APPLICATION can authenticate to Redis with a hostile
# password — against the real runner image, the real compose file, and a real
# Redis, through the real request path.
#
# Why this drill exists
# --------------------
# The deployment handed the app a Compose-assembled URI:
#
#   REDIS_URL: redis://default:${REDIS_PASSWORD}@redis-prod:6379
#
# Several drills already used the deliberately hostile password
# `red@s:p/ss?w=3#t C3!` — and every one of them passed, because not one of
# them ever caused a Redis connection to be opened. The hostile password sat
# in the fixtures completely unexercised, so the suite could not tell "the app
# authenticates correctly" apart from "the app never tried".
#
# How the assertion works
# ----------------------
# The public form routes rate-limit BEFORE they parse the body, and the three
# outcomes are distinguishable from outside:
#
#   400  under the limit          -> Redis reachable and authenticated
#   429  over the limit           -> Redis reachable and authenticated
#   503  limiter unavailable      -> Redis unreachable or auth failed
#
# So a 503 from this endpoint is exactly the symptom a mis-assembled URI would
# produce, and the drill asserts it never happens.

set -euo pipefail

readonly RUNNER_IMAGE="${1:?usage: $0 <runner-image>}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-redis-$$"
readonly REGISTRY_NAME="redis-drill-registry-$$"
readonly REGISTRY_PORT="${REDIS_DRILL_REGISTRY_PORT:-5566}"
readonly APP_PORT="${REDIS_DRILL_APP_PORT:-13990}"
readonly CANDIDATE_PORT="${REDIS_DRILL_CANDIDATE_PORT:-13991}"

# Every character that is structural in a URI, plus a space, a quote, a
# backslash and a non-ASCII character — one password a generator could emit.
readonly HOSTILE_PASSWORD='red@s:p/ss?w=3#t C3!%ü"x'

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

run_env() {
  env AAU_ENV=production AAU_ENV_ROOT="$ROOT" DEPLOY_ROOT="${ROOT}/deploy" \
    AAU_APP_PORT="$APP_PORT" AAU_CANDIDATE_PORT="$CANDIDATE_PORT" \
    COMPOSE_PROJECT_NAME="$PROJECT" "$@"
}

echo "=== 0. deploy the real stack with a hostile Redis password ==="
mkdir -p "${ROOT}/deploy/scripts" "${ROOT}/uploads" "${ROOT}/backups"
cp -r "${REPO_ROOT}/deploy/scripts/." "${ROOT}/deploy/scripts/"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${ROOT}/deploy/"
cp -r "${REPO_ROOT}/deploy/postgres" "${ROOT}/deploy/"

# Single-quoted in the env file, which is the ONLY quoting form
# `docker compose --env-file` treats as fully literal. A single quote inside
# the password would therefore be unrepresentable here, and the env-file
# contract documents that; it is not part of what this drill tests.
{
  echo "POSTGRES_ADMIN_USER='aau_admin'"
  echo "POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'"
  echo "POSTGRES_DB='aau_platform'"
  echo "APP_DB_USER='aau_app'"
  echo "APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'"
  echo "REDIS_PASSWORD='${HOSTILE_PASSWORD}'"
  echo "PAYLOAD_SECRET='redis-drill-payload-secret-at-least-32-chars'"
  echo "INITIAL_ADMIN_EMAIL='admin@example.test'"
  echo "INITIAL_ADMIN_PASSWORD='Redis-Drill-Admin-2026!'"
} > "${ROOT}/deploy/.env.production"

docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REGISTRY_NAME" -p "${REGISTRY_PORT}:5000" registry:2 >/dev/null
for _ in $(seq 1 30); do curl -sf "http://127.0.0.1:${REGISTRY_PORT}/v2/" >/dev/null 2>&1 && break; sleep 1; done
REF="127.0.0.1:${REGISTRY_PORT}/aau/runner:redis"
docker tag "$RUNNER_IMAGE" "$REF"
docker push -q "$REF" >/dev/null

run_env HEALTH_TIMEOUT_SECONDS=300 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" >"${ROOT}/deploy.log" 2>&1 \
  || { echo "deploy failed"; tail -30 "${ROOT}/deploy.log"; exit 1; }
check "the stack is healthy with a hostile Redis password" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"

# POST a deliberately invalid body: the limiter runs BEFORE validation, so this
# consumes a token and returns 400 while the visitor is under the limit.
post_contact() {
  curl -s -o /dev/null -w '%{http_code}' \
    -X POST "http://127.0.0.1:${APP_PORT}/api/public/contact" \
    -H 'content-type: application/json' \
    -H "x-forwarded-for: $1" \
    --data '{}'
}

echo
echo "=== 1. the limiter runs, so the app authenticated to Redis ==="
first="$(post_contact 203.0.113.10)"
check "a public form submission is NOT rejected as limiter-unavailable" \
  "$([[ "$first" == "503" ]] && echo unavailable || echo available)" "available"
check "it is handled by the route (validation rejects the empty body)" "$first" "400"

echo
echo "=== 2. the limit is actually ENFORCED across requests ==="
# Shared Redis state, not per-process memory: the count has to persist between
# requests for this to reach 429 at all.
codes=""
for _ in $(seq 1 12); do codes="${codes}$(post_contact 203.0.113.11) "; done
check "a repeated submitter is eventually rate limited" \
  "$(printf '%s' "$codes" | grep -c 429 || true)" "1"
check "no request was ever answered with limiter-unavailable" \
  "$(printf '%s' "$codes" | grep -c 503 || true)" "0"
printf '       (observed: %s)\n' "$codes"

echo
echo "=== 3. the limit is per-visitor, not global ==="
# A global counter would also produce a 429 above, for the wrong reason.
check "a different client is still served" "$(post_contact 203.0.113.12)" "400"

echo
echo "=== 4. Redis really is password-protected ==="
# Without this, everything above would pass equally well against an
# unauthenticated Redis, and the hostile password would prove nothing.
check "an unauthenticated client is refused" \
  "$(docker compose -p "$PROJECT" --env-file "${ROOT}/deploy/.env.production" \
      -f "${ROOT}/deploy/docker-compose.vps.yml" exec -T -e REDISCLI_AUTH= redis-prod \
      redis-cli ping 2>&1 | grep -c -i 'NOAUTH\|denied' || true)" "1"

echo
echo "=== 5. the password is not exposed in the Redis process argv ==="
# /proc/<pid>/cmdline is world-readable; on a shared cPanel host that would
# disclose it to any local account.
cmdline="$(docker inspect --format '{{join .Config.Cmd " "}}' "${PROJECT}-redis-prod-1" 2>/dev/null || true)"
# An unreadable command line is "could not observe", not "observed safe". With
# an empty $cmdline the grep below counts 0 matches and the check reports the
# password absent — having inspected nothing at all.
if [[ -z "$cmdline" ]]; then
  printf '  FAIL could not read the redis command line; the argv check was NOT performed\n'
  fail=$((fail + 1))
else
  check "the password is absent from the redis command line" \
    "$(printf '%s' "$cmdline" | grep -cF -- "$HOSTILE_PASSWORD" || true)" "0"
fi

echo
echo "=== 6. no assembled REDIS_URL is handed to the app ==="
app_env="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "${PROJECT}-app-prod-1")"
check "the app receives REDIS_HOST" \
  "$(printf '%s' "$app_env" | grep -c '^REDIS_HOST=redis-prod$' || true)" "1"
check "the app receives no interpolated REDIS_URL" \
  "$(printf '%s' "$app_env" | grep -c '^REDIS_URL=' || true)" "0"

printf '\n[redis-credential-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
