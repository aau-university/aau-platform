#!/usr/bin/env bash
# Regression proof for scripts/trivy-image-scan.sh.
#
# Fault injection, not string matching: a stub `docker` on PATH returns chosen
# exit codes for chosen images, and the drill asserts what the gate ACTUALLY
# exits with and which images it actually attempted.
#
# The gate this replaces printed HIGH/CRITICAL findings and exited 0. Step 9
# re-runs the real script's control flow with the OLD buggy helper shape and
# requires this drill to catch it -- a regression test that cannot fail on the
# bug it was written for is decoration.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly GATE="${REPO_ROOT}/scripts/trivy-image-scan.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}

# A stub docker that records every image it was asked to scan and EMULATES real
# `trivy image ... --exit-code N ... <image>` semantics, because the split gate
# depends on exactly those semantics:
#
#   FINDINGS_IMAGES : the image has fixable HIGH/CRITICAL. Trivy exits with the
#                     --exit-code VALUE — 1 in blocking mode, 0 in report mode.
#   ERROR_IMAGES    : the scanner could not run (image will not pull, DB will
#                     not load). Trivy exits non-zero (2) REGARDLESS of
#                     --exit-code. This is the "finding != scanner failure"
#                     distinction the whole policy hangs on.
mkdir -p "${WORK}/bin"
cat > "${WORK}/bin/docker" <<'STUB'
#!/usr/bin/env bash
image="${!#}"
printf '%s\n' "$image" >> "$SCAN_LOG"
# Recover the --exit-code value the gate passed.
exitcode=0; prev=""
for a in "$@"; do
  [[ "$prev" == "--exit-code" ]] && exitcode="$a"
  prev="$a"
done
echo "stub trivy output for ${image}"
for bad in ${ERROR_IMAGES:-}; do
  case "$image" in *"$bad"*) exit 2 ;; esac
done
for f in ${FINDINGS_IMAGES:-}; do
  case "$image" in *"$f"*) exit "$exitcode" ;; esac
done
exit 0
STUB
chmod +x "${WORK}/bin/docker"

# A compose fixture with both data images digest-pinned, shaped like the real one.
PG_DIGEST="postgres:17.6-alpine@sha256:$(printf 'a%.0s' {1..64})"
REDIS_DIGEST="redis:8.2-alpine@sha256:$(printf 'b%.0s' {1..64})"
cat > "${WORK}/compose.yml" <<COMPOSE
services:
  postgres-prod:
    image: ${PG_DIGEST}
  redis-prod:
    image: ${REDIS_DIGEST}
COMPOSE

# Run the gate under the stub. Echoes the exit code; scan log lands in $2.
run_gate() {
  local log="$1"; shift
  : > "$log"
  PATH="${WORK}/bin:$PATH" \
  SCAN_LOG="$log" \
  FINDINGS_IMAGES="${FINDINGS_IMAGES:-}" \
  ERROR_IMAGES="${ERROR_IMAGES:-}" \
  TRIVY="trivy@sha256:deadbeef" \
  RUNNER_TEMP="$WORK" \
    bash "$GATE" aau-runner:scan "${WORK}/compose.yml" >"${log}.out" 2>&1
  echo $?
}

echo "1. a fully clean scan passes"
rc="$(run_gate "${WORK}/log1")"
check "exit code is 0 when every image is clean" "$rc" "0"
check "all three required images were scanned" "$(wc -l < "${WORK}/log1" | tr -d ' ')" "3"

echo "2. a finding in the RUNNER image (ours) BLOCKS"
rc="$(FINDINGS_IMAGES='aau-runner:scan' run_gate "${WORK}/log2")"
check "the runner image hard-blocks on a fixable finding" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"

echo "3. a finding in a DATA image (postgres/redis) is REPORTED, not blocking"
for target in postgres redis; do
  rc="$(FINDINGS_IMAGES="$target" run_gate "${WORK}/log3")"
  check "a finding in ${target} does NOT block the release" "$rc" "0"
  check "the report-only notice names ${target}" \
    "$(grep -c "::notice::.*${target}.*report-only" "${WORK}/log3.out")" "1"
done

echo "4. findings in BOTH data images still pass, having scanned all three"
rc="$(FINDINGS_IMAGES='postgres redis' run_gate "${WORK}/log4")"
check "data-image findings alone do not fail the gate" "$rc" "0"
check "all three images were still attempted" "$(wc -l < "${WORK}/log4" | tr -d ' ')" "3"

echo "5. the runner blocks even when the data images are clean"
rc="$(FINDINGS_IMAGES='aau-runner:scan' run_gate "${WORK}/log5")"
check "runner findings block regardless of the data images" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"
check "a blocking failure still attempts every image" "$(wc -l < "${WORK}/log5" | tr -d ' ')" "3"

echo "6. a scanner that FAILS TO RUN blocks — for a report-only image too"
# The distinction the whole policy hangs on: a finding is information; a scan
# that never happened is a blind gate. A data image that cannot be pulled must
# NOT pass just because its findings would have been report-only.
rc="$(ERROR_IMAGES='postgres' run_gate "${WORK}/log6")"
check "a scanner error on a report-only image fails the gate" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"
check "the error names it a scan-that-did-not-run" \
  "$(grep -c '::error::trivy could NOT scan' "${WORK}/log6.out")" "1"
rc="$(ERROR_IMAGES='aau-runner:scan' run_gate "${WORK}/log6b")"
check "a scanner error on the runner image also fails the gate" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"

echo "7. an unpinned data image fails closed instead of being skipped"
cat > "${WORK}/unpinned.yml" <<'COMPOSE'
services:
  postgres-prod:
    image: postgres:17.6-alpine
  redis-prod:
    image: redis:8.2-alpine
COMPOSE
: > "${WORK}/log7"
PATH="${WORK}/bin:$PATH" SCAN_LOG="${WORK}/log7" FINDINGS_IMAGES='' ERROR_IMAGES='' TRIVY="t@sha256:x" RUNNER_TEMP="$WORK" \
  bash "$GATE" aau-runner:scan "${WORK}/unpinned.yml" >/dev/null 2>&1
rc=$?
check "missing digest pins fail the gate" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"
check "only the runner was scanned when pins are missing" "$(wc -l < "${WORK}/log7" | tr -d ' ')" "1"

echo "8. the log group is still closed on a failing scan"
# If ::endgroup:: were dropped on the failure path the findings would be folded
# into the next group and effectively hidden from a reader.
rc="$(FINDINGS_IMAGES='aau-runner:scan' run_gate "${WORK}/log8")"
# Both sides are derived counts, so if the gate stopped emitting group markers
# altogether they would both be 0 and the comparison would pass while proving
# nothing. Require the groups to exist before comparing them.
log8_groups="$(grep -c '::group::' "${WORK}/log8.out" || true)"
check "the failing scan still emitted log groups" \
  "$([[ "${log8_groups:-0}" -gt 0 ]] && echo yes || echo no)" "yes"
check "endgroup count matches group count" \
  "$(grep -c '::endgroup::' "${WORK}/log8.out" || true)" "$log8_groups"
check "the blocking failure is named in an error annotation" \
  "$(grep -c '::error::trivy BLOCKING gate failed for aau-runner:scan' "${WORK}/log8.out")" "1"

echo "9. MUTATION: the original helper shape must FAIL this drill"
# Reconstructs the exact pre-fix code path. If this exits 0, the drill above is
# not actually testing propagation.
cat > "${WORK}/buggy.sh" <<'BUGGY'
scan() {
  echo "::group::trivy $1"
  docker run --rm "$TRIVY" image --exit-code 1 "$1"
  echo "::endgroup::"
}
status=0
scan aau-runner:scan || status=1
exit "$status"
BUGGY
PATH="${WORK}/bin:$PATH" SCAN_LOG="${WORK}/log9" FINDINGS_IMAGES='aau-runner:scan' ERROR_IMAGES='' \
  TRIVY="t@sha256:x" bash -e "${WORK}/buggy.sh" >/dev/null 2>&1
buggy_rc=$?
check "the old shape returns a false green (proving the bug was real)" "$buggy_rc" "0"
rc="$(FINDINGS_IMAGES='aau-runner:scan' run_gate "${WORK}/log9b")"
check "the fixed shape reports the same failure correctly" "$([ "$rc" -ne 0 ] && echo yes || echo no)" "yes"

printf '\n[trivy-scan-gate-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
