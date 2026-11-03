#!/usr/bin/env bash
# Proves the cutover invariant:
#
#   NO request may reach a candidate before its migrations, identity bootstrap
#   and health gate have all completed.
#
# ── Why this drill is not "start the proxy after health passes" ────────────
# The reverse proxy is kept CONTINUOUSLY LIVE for the whole replacement
# sequence, polling the stable port throughout, exactly as cPanel's Apache will
# be. A simulation that starts the proxy only once the app is healthy cannot
# observe the failure it is supposed to rule out.
#
# ── What "safe" means here, and what it does NOT mean ─────────────────────
# A deploy is a real MAINTENANCE WINDOW: the previous release is stopped before
# the candidate migrates, because once a migration has applied, the old code is
# running against a schema it was not built for — harmless for an additive
# migration, and a source of unrepresentable WRITES for a destructive one.
#
# So the invariant this drill asserts is NOT "the site stays up". It is:
#
#   every request on the stable port is answered by a release that MATCHES the
#   database, or not answered at all.
#
# Connection-refused during the window is correct. A 500 from an unhealthy
# candidate, or a 200 from a build that predates the schema, is not.
#
# The failing candidate used here BINDS ITS PORT AND ANSWERS REQUESTS while
# being unhealthy — a 500 from a listening server, which is precisely what a
# Next.js process looks like between "server is listening" and "Payload has
# migrated". A candidate that simply crashed would prove nothing, because a
# closed port is trivially safe.

set -euo pipefail

readonly RUNNER_IMAGE="${1:?usage: $0 <runner-image>}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-gating-$$"
readonly REGISTRY_NAME="gating-registry-$$"
readonly REGISTRY_PORT="${GATING_REGISTRY_PORT:-5561}"
readonly STABLE_PORT="${GATING_STABLE_PORT:-13910}"
readonly CANDIDATE_PORT="${GATING_CANDIDATE_PORT:-13911}"
readonly PROXY_PORT="${GATING_PROXY_PORT:-13912}"

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
  # APP_IMAGE is required even for `down`, because compose parses the whole file
  # for every subcommand and the variable deliberately has no default. Operators
  # use deploy/scripts/compose.sh for this; here a placeholder is enough, since
  # `down` removes containers by project and never consults the image.
  APP_IMAGE=placeholder:down docker compose -p "$PROJECT" \
    --env-file "${ROOT}/deploy/.env.production" \
    -f "${ROOT}/deploy/docker-compose.vps.yml" --profile candidate \
    down --volumes --remove-orphans >/dev/null 2>&1 || true
  # Belt and braces: if the compose file could not be parsed at all, fall back
  # to removing by name so a failed run never leaves a port allocated for the
  # next one.
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$ROOT" 2>/dev/null || sudo rm -rf "$ROOT" 2>/dev/null || true
}
trap cleanup EXIT

deploy() {
  env AAU_ENV=production AAU_ENV_ROOT="$ROOT" DEPLOY_ROOT="${ROOT}/deploy" \
    AAU_APP_PORT="$STABLE_PORT" AAU_CANDIDATE_PORT="$CANDIDATE_PORT" \
    COMPOSE_PROJECT_NAME="$PROJECT" HEALTH_TIMEOUT_SECONDS="${1}" \
    bash "${ROOT}/deploy/scripts/deploy.sh" "${2}"
}

echo "=== setup ==="
mkdir -p "${ROOT}/deploy/scripts" "${ROOT}/uploads" "${ROOT}/backups"
cp -r "${REPO_ROOT}/deploy/scripts/." "${ROOT}/deploy/scripts/"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${ROOT}/deploy/"
cp -r "${REPO_ROOT}/deploy/postgres" "${ROOT}/deploy/"

# Deliberately hostile NON-PRODUCTION dummy secrets: every one contains
# characters that break a URI, a shell, a redis.conf line or compose
# interpolation if the contract is wrong anywhere.
cat > "${ROOT}/deploy/.env.production" <<'EOF'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='gating-drill-payload-secret-at-least-32-characters'
INITIAL_ADMIN_EMAIL='admin@example.test'
INITIAL_ADMIN_PASSWORD='Gating-Admin-Pass-2026!'
EOF

# A throwaway registry, so the images carry real registry digests and the
# deploy path is the real one rather than a local-tag shortcut.
docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REGISTRY_NAME" -p "${REGISTRY_PORT}:5000" registry:2 >/dev/null
for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:${REGISTRY_PORT}/v2/" >/dev/null 2>&1 && break
  sleep 1
done

readonly GOOD="127.0.0.1:${REGISTRY_PORT}/aau/runner:good"
docker tag "$RUNNER_IMAGE" "$GOOD"
docker push -q "$GOOD" >/dev/null

# The failing candidate: it LISTENS on 3000 and answers, but /api/health is a
# hard 500, so it can never become healthy. This is the dangerous shape — a
# port that is open and serving wrong answers.
readonly BAD="127.0.0.1:${REGISTRY_PORT}/aau/runner:bad"
docker build -q -t "$BAD" - >/dev/null <<EOF
FROM ${RUNNER_IMAGE}
CMD ["node","-e","require('http').createServer((_q,s)=>{s.statusCode=500;s.end('not ready')}).listen(3000,'0.0.0.0')"]
EOF
docker push -q "$BAD" >/dev/null
echo "registry and images ready"

echo
echo "=== 1. first install of a good release ==="
deploy 300 "$GOOD" > "${ROOT}/first-install.log" 2>&1 || { echo "FIRST INSTALL FAILED:"; tail -30 "${ROOT}/first-install.log"; exit 1; }
check "stable port serves the release" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${STABLE_PORT}/api/health")" "200"

good_digest="$(<"${ROOT}/deploy/deployed-image")"

echo
echo "=== 2. a continuously live proxy observes the whole replacement ==="
# The proxy polls the stable port throughout the deploy and records every
# distinct outcome it sees. It is started BEFORE the deploy and never restarted.
: > "${ROOT}/proxy-observations"
(
  while [[ ! -f "${ROOT}/stop-proxy" ]]; do
    code="$(curl -s -o "${ROOT}/body" -w '%{http_code}' --max-time 2 \
      "http://127.0.0.1:${STABLE_PORT}/api/health" 2>/dev/null; true)"
    printf '%s %s\n' "$code" "$(tr -d '\n' < "${ROOT}/body" 2>/dev/null | head -c 40)" \
      >> "${ROOT}/proxy-observations"
    sleep 0.2
  done
) &
proxy_pid=$!

# Deploy the BAD release. It must never reach the stable port.
set +e
deploy 40 "$BAD" > "${ROOT}/bad-deploy.log" 2>&1
bad_status=$?
set -e
touch "${ROOT}/stop-proxy"
wait "$proxy_pid" 2>/dev/null || true

check "the failed candidate deploy exits non-zero" "$([[ $bad_status -ne 0 ]] && echo yes || echo no)" "yes"

# THE INVARIANT. Every observation on the stable port must be either a healthy
# matching release (200) or nothing at all (000 — the proxy returns its own
# 502/503 during the maintenance window). A 500 would mean the unhealthy
# candidate answered a real request on the port users reach.
leaked="$(grep -cvE '^(200|000) ' "${ROOT}/proxy-observations" || true)"
check "no request on the stable port was ever answered by the unhealthy candidate" "$leaked" "0"

# And the window must be REAL, not incidental: the drill would otherwise pass
# just as well against an implementation that never stopped the old release.
window="$(grep -c '^000 ' "${ROOT}/proxy-observations" || true)"
check "the maintenance window actually happened (the stable port went quiet)" \
  "$([[ "$window" -gt 0 ]] && echo yes || echo no)" "yes"

observations="$(wc -l < "${ROOT}/proxy-observations")"
check "the proxy really was live throughout (many observations)" \
  "$([[ "$observations" -gt 20 ]] && echo yes || echo no)" "yes"

echo
echo "=== 3. a recoverable failure closes the window again ==="
# The BAD candidate applies no migration, so the previous release is still a
# correct pairing with this database and MUST be brought back — a failed release
# is not a reason for an indefinite outage.
check "the previous release is serving again after the failed candidate" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${STABLE_PORT}/api/health")" "200"
check "the release-state file still records the GOOD digest" \
  "$(<"${ROOT}/deploy/deployed-image")" "$good_digest"
check "the log says the schema was unchanged and the previous release was restarted" \
  "$(grep -c 'schema unchanged — restarting the previous release' "${ROOT}/bad-deploy.log" || true)" "1"

echo
echo "=== 4. the failed candidate is stopped, not crash-looping ==="
# `restart: unless-stopped` on the candidate would leave it restarting while an
# operator investigates, and could apply further migrations after the rollback
# decision was made.
running="$(docker ps --filter "name=${PROJECT}-app-candidate" --format '{{.Names}}' | wc -l)"
check "no candidate container is running" "$running" "0"
check "the deploy log says the candidate was confirmed stopped" \
  "$(grep -c 'failed candidate confirmed stopped' "${ROOT}/bad-deploy.log" || true)" "1"

echo
echo "=== 5. the candidate port is never the stable port ==="
check "the candidate is validated on a different port" \
  "$([[ "$STABLE_PORT" != "$CANDIDATE_PORT" ]] && echo yes || echo no)" "yes"
check "nothing is left listening on the candidate port" \
  "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:${CANDIDATE_PORT}/" 2>/dev/null; true)" "000"

echo
echo "=== 6. a subsequent good deploy still succeeds ==="
# Proves the failed attempt left no state that blocks recovery — no stale
# candidate container, no held lock, no half-written release record.
deploy 300 "$GOOD" > "${ROOT}/recover.log" 2>&1
check "redeploy after a failure succeeds" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${STABLE_PORT}/api/health")" "200"

printf '\n[cutover-gating-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
