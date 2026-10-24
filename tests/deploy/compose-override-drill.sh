#!/usr/bin/env bash
# Proof for the APP_IMAGE override contract in deploy/scripts/compose.sh.
#
# The wrapper's whole point is that release identity comes from the
# release-state file, not from ambient configuration. An APP_IMAGE env override
# is a legitimate incident escape hatch, but a SILENT one that swaps the running
# release is exactly the hole the wrapper exists to close. So a divergence from
# the recorded digest now requires an explicit typed acknowledgement, while
# read-only inspection and using the recorded release stay frictionless.
#
# No real stack: a `docker` shim on PATH records whether compose.sh actually
# reached `docker compose`, so the refusal cases prove they stopped BEFORE it.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly COMPOSE_SH="${REPO_ROOT}/deploy/scripts/compose.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1)); fi
}
contains() {
  if grep -qF -- "$3" "$2"; then printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else printf '  FAIL %s\n       %s did not contain: %s\n' "$1" "$2" "$3"; fail=$((fail + 1)); fi
}

# A docker shim that records that it was reached and with which APP_IMAGE.
mkdir -p "${WORK}/bin"
cat > "${WORK}/bin/docker" <<'STUB'
#!/usr/bin/env bash
printf 'DOCKER_REACHED APP_IMAGE=%s ARGS=%s\n' "${APP_IMAGE:-<unset>}" "$*" >> "$DOCKER_LOG"
exit 0
STUB
chmod +x "${WORK}/bin/docker"

# Minimal deploy root: an env file, a compose file, a recorded release.
mkdir -p "${WORK}/deploy"
RECORDED="ghcr.io/mohammed7779948484-tech/aau-payload-platform@sha256:$(printf 'a%.0s' {1..64})"
OTHER="ghcr.io/mohammed7779948484-tech/aau-payload-platform@sha256:$(printf 'b%.0s' {1..64})"
printf '%s\n' "$RECORDED" > "${WORK}/deploy/deployed-image"
cat > "${WORK}/deploy/.env.production" <<'EOF'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='x'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='y'
REDIS_PASSWORD='z'
PAYLOAD_SECRET='compose-override-drill-secret-at-least-32ch'
EOF
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${WORK}/deploy/"

run() {
  local log="$1"; shift
  : > "$log"
  PATH="${WORK}/bin:$PATH" DOCKER_LOG="$log" \
    env AAU_ENV=production AAU_ENV_ROOT="$WORK" DEPLOY_ROOT="${WORK}/deploy" \
      ENV_FILE="${WORK}/deploy/.env.production" \
      COMPOSE_FILE="${WORK}/deploy/docker-compose.vps.yml" \
      STATE_FILE="${WORK}/deploy/deployed-image" \
      AAU_APP_PORT=3000 AAU_CANDIDATE_PORT=3100 \
      "$@" bash "$COMPOSE_SH" ps > "${log}.out" 2>&1
  echo $?
}

echo "=== 1. no APP_IMAGE: uses the recorded release, no acknowledgement needed ==="
rc="$(run "${WORK}/l1")"
check "the recorded-release path succeeds" "$rc" "0"
contains "it reached docker compose with the recorded digest" "${WORK}/l1" "sha256:aaaa"

echo "=== 2. APP_IMAGE equal to the recorded digest: still no acknowledgement ==="
rc="$(APP_IMAGE="$RECORDED" run "${WORK}/l2")"
check "an APP_IMAGE that matches recorded succeeds without the ack" "$rc" "0"
contains "it reached docker compose" "${WORK}/l2" "DOCKER_REACHED"

echo "=== 3. APP_IMAGE differing from recorded WITHOUT the ack is refused ==="
rc="$(APP_IMAGE="$OTHER" run "${WORK}/l3")"
check "the divergent override is refused" "$rc" "1"
contains "the refusal explains it differs from the recorded release" "${WORK}/l3.out" \
  "differs from the recorded release"
contains "the refusal names the acknowledgement" "${WORK}/l3.out" \
  "ALLOW_IMAGE_OVERRIDE=I-UNDERSTAND-THIS-BYPASSES-RECORDED-RELEASE"
check "docker compose was NOT reached on the refusal" \
  "$([[ -s "${WORK}/l3" ]] && echo reached || echo not-reached)" "not-reached"

echo "=== 4. APP_IMAGE differing WITH the ack proceeds ==="
rc="$(APP_IMAGE="$OTHER" ALLOW_IMAGE_OVERRIDE=I-UNDERSTAND-THIS-BYPASSES-RECORDED-RELEASE run "${WORK}/l4")"
check "the acknowledged override succeeds" "$rc" "0"
contains "the override is announced as acknowledged" "${WORK}/l4.out" "ACKNOWLEDGED override"
contains "it reached docker compose with the OVERRIDE digest" "${WORK}/l4" "sha256:bbbb"

echo "=== 5. a non-digest-pinned APP_IMAGE is refused before anything else ==="
rc="$(APP_IMAGE="ghcr.io/mohammed7779948484-tech/aau-payload-platform:latest" run "${WORK}/l5")"
check "a tag is refused" "$rc" "1"
contains "the refusal explains identity must be a digest" "${WORK}/l5.out" "not digest-pinned"
check "docker compose was NOT reached" \
  "$([[ -s "${WORK}/l5" ]] && echo reached || echo not-reached)" "not-reached"

printf '\n[compose-override-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
