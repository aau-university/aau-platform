#!/usr/bin/env bash
# Deterministic proof of the fail-closed / bounded-retry contract in
# deploy/scripts/lib/writers.sh, using a `docker` stub on PATH — no real stack.
#
# The three properties, each a real safety requirement:
#   1. If `docker ps` (the state enumeration) FAILS, the writer state is
#      UNKNOWN and writers_freeze must FAIL CLOSED — never read "no output" as
#      "no writers".
#   2. A container that is transiently `removing`/`restarting` and then
#      disappears must be waited out (bounded retry), not failed on first sample.
#   3. A container that stays active must fail the freeze.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1)); fi
}

# A docker stub whose behaviour for the PROOF enumeration is driven by a
# scenario file. It distinguishes:
#   docker ps -aq --filter ...oneoff=True   -> the one-off stop list (step 2)
#   docker ps -a  --filter ... --format ... -> the proof enumeration (step 3)
#   docker stop ...                         -> a stop (always succeeds)
mkdir -p "${WORK}/bin"
cat > "${WORK}/bin/docker" <<'STUB'
#!/usr/bin/env bash
args="$*"
case "$args" in
  "stop "*) exit 0 ;;
  *"-aq "*"oneoff=True"*) exit 0 ;;                 # one-off list: none
  *"--format"*)                                     # the proof enumeration
    case "${SCENARIO:-}" in
      enum_fail) exit 1 ;;                           # docker ps itself fails
      always_active) echo 'app-prod|running|proj-app-prod-1'; exit 0 ;;
      transient)
        n=0; [[ -f "$COUNTER" ]] && n="$(cat "$COUNTER")"
        n=$((n + 1)); echo "$n" > "$COUNTER"
        # First two samples: a one-off still 'removing'. Then clear.
        if (( n <= 2 )); then echo 'app-prod|removing|proj-app-prod-run-1'; fi
        exit 0 ;;
      clean) exit 0 ;;                               # nothing active
      *) exit 0 ;;
    esac ;;
  *) exit 0 ;;
esac
STUB
chmod +x "${WORK}/bin/docker"

# shellcheck source=deploy/scripts/lib/writers.sh
source "${REPO_ROOT}/deploy/scripts/lib/writers.sh"
noop_compose() { :; }   # the caller's compose stop is a no-op here

run_scenario() {
  local scenario="$1"
  : > "${WORK}/counter"
  PATH="${WORK}/bin:$PATH" \
    SCENARIO="$scenario" COUNTER="${WORK}/counter" \
    AAU_WRITERS_FREEZE_ATTEMPTS=8 AAU_WRITERS_FREEZE_INTERVAL=0.05 \
    bash -c '
      source "'"${REPO_ROOT}"'/deploy/scripts/lib/writers.sh"
      noop_compose() { :; }
      writers_freeze proj noop_compose >/dev/null 2>&1
      echo $?'
}

echo "=== 1. docker enumeration failure fails CLOSED ==="
check "writers_freeze fails when docker ps cannot be run" "$(run_scenario enum_fail)" "1"

echo "=== 2. a transient 'removing' container is waited out ==="
check "writers_freeze succeeds once the transient state clears" "$(run_scenario transient)" "0"

echo "=== 3. a permanently active writer fails the freeze ==="
check "writers_freeze fails while a writer stays active" "$(run_scenario always_active)" "1"

echo "=== 4. a genuinely clean project passes ==="
check "writers_freeze succeeds when nothing is active" "$(run_scenario clean)" "0"

printf '\n[writers-freeze-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
