#!/usr/bin/env bash
# Aggregate image vulnerability scan for the release gate.
#
# This lives in a file rather than inline in release-gate.yml because it had a
# false-green bug that inline YAML made untestable:
#
#   scan() { echo "::group::$1"; docker run ... trivy --exit-code 1 "$1"; echo "::endgroup::"; }
#   scan aau-runner:scan || status=1
#
# Two independent faults, either of which alone is enough to lose the result:
#
#   1. `set -e` is SUSPENDED for the entire body of a function invoked as the
#      left operand of `||`. Trivy exiting 1 therefore did not abort the
#      function; execution simply continued.
#   2. A function returns the status of its LAST command. `echo "::endgroup::"`
#      always succeeds, so the function returned 0 no matter what Trivy did,
#      and `|| status=1` could never fire.
#
# Result: Trivy printed HIGH/CRITICAL findings into the log and the gate went
# green. So this file never relies on `set -e` to carry a scanner result --
# every exit status is captured explicitly and propagated by hand.
#
# ── The policy this gate enforces ─────────────────────────────────────────
# The images are not all ours, and treating them identically is the wrong
# trade. The application-owned RUNNER image is fully within our control, so a
# fixable HIGH/CRITICAL in it is a defect we must fix before shipping — it hard
# blocks. The pinned PostgreSQL and Redis images are third-party OFFICIAL
# images; their findings are upstream Debian/gosu/util-linux CVEs with no newer
# compatible official image that resolves them (verified before adopting this
# split — see deploy/ACCEPTANCE.md §T-red), so they are REPORTED and monitored
# but do not block a release that is otherwise sound.
#
# The one thing that is NEVER downgraded is a scan that could not run. A
# vulnerability finding and a scanner that never executed are DIFFERENT
# outcomes: the first is information, the second is a blind gate. So a data
# image that cannot be pulled, or a DB that will not load, fails the gate closed
# — for every image, blocking or report-only. An unpinned data image likewise
# fails (see `resolve`). No `|| true` anywhere, because that would also swallow
# the scanner-failure case this whole distinction exists to preserve.
#
# Usage: trivy-image-scan.sh <runner-image-ref> [compose-file]
# Exit:  0 only if the runner image is clean AND every image was actually
#        scanned (report-only images may have findings; they may NOT be
#        unscannable).

set -uo pipefail

COMPOSE_FILE="${2:-deploy/docker-compose.vps.yml}"
RUNNER_IMAGE="${1:?usage: trivy-image-scan.sh <runner-image-ref> [compose-file]}"
: "${TRIVY:?TRIVY must be set to a digest-pinned Trivy image reference}"
TRIVY_CACHE="${RUNNER_TEMP:-/tmp}/trivy-cache"

# One Trivy run. `exit_on_findings` is the value passed to `--exit-code`:
#   1  -> a finding is a failure (blocking image)
#   0  -> a finding is NOT a failure; Trivy still exits non-zero on an
#         OPERATIONAL error (image cannot pull, DB will not load). Verified
#         against the pinned Trivy: `--exit-code 0` returns 0 on an image WITH
#         findings and non-zero on a nonexistent image.
# `--ignore-unfixed`: a CVE with no available fix cannot be actioned by a
# release gate; it belongs to the base-image update policy Dependabot drives.
trivy_run() {
  local image="$1" exit_on_findings="$2"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "${TRIVY_CACHE}:/root/.cache/trivy" \
    "$TRIVY" image \
      --scanners vuln \
      --severity HIGH,CRITICAL \
      --ignore-unfixed \
      --exit-code "$exit_on_findings" \
      --format table \
      "$image"
}

# BLOCKING scan — the application-owned runner image. Fixable HIGH/CRITICAL, OR
# a scanner that could not run, both fail the gate.
scan_blocking() {
  image="$1"; rc=0
  echo "::group::trivy [BLOCKING] ${image}"
  trivy_run "$image" 1 || rc=$?
  echo "::endgroup::"
  if [ "$rc" -ne 0 ]; then
    echo "::error::trivy BLOCKING gate failed for ${image} (exit ${rc}): fixable HIGH/CRITICAL findings, or the scanner itself did not run" >&2
  fi
  return "$rc"
}

# REPORT-ONLY scan — a third-party official data image. Findings are reported
# but do NOT block; a scan that could not run DOES block. `--exit-code 0`
# encodes exactly that split: 0 = scanned (with or without findings), non-zero
# = operational error.
scan_report() {
  image="$1"; rc=0
  echo "::group::trivy [report-only, third-party image] ${image}"
  trivy_run "$image" 0 || rc=$?
  echo "::endgroup::"
  if [ "$rc" -ne 0 ]; then
    echo "::error::trivy could NOT scan ${image} (exit ${rc}). A scan that did not run is a hard failure even for a report-only image: a finding and a blind gate are different outcomes." >&2
    return 1
  fi
  echo "::notice::${image} is a third-party official image scanned report-only; any HIGH/CRITICAL above are monitored (no newer compatible official image resolves them) and do not block this release. The runner image remains hard-gated." >&2
  return 0
}

# Resolve a digest-pinned data image out of the compose file itself, so the
# scan follows the digests that are actually deployed rather than a second copy
# of them here that could drift apart silently.
resolve() {
  ref="$(grep -oE "$1@sha256:[a-f0-9]{64}" "$COMPOSE_FILE" | head -1)"
  if [ -z "$ref" ]; then
    echo "::error::no digest-pinned image matching '$1' in ${COMPOSE_FILE}" >&2
    return 1
  fi
  printf '%s' "$ref"
}

mkdir -p "$TRIVY_CACHE"

status=0

# Every image is attempted even after an earlier failure, so one run reports
# the full picture instead of one finding at a time.

# The application-owned runner image: fixable HIGH/CRITICAL block.
scan_blocking "$RUNNER_IMAGE" || status=1

# The third-party official data images: findings reported, scanner failure and
# unpinned references block.
for pattern in 'postgres:[0-9.]+-[a-z]+' 'redis:[0-9.]+-[a-z]+'; do
  ref=''
  # An unpinned data image fails the gate: resolve requires @sha256:<64 hex>.
  ref="$(resolve "$pattern")" || { status=1; continue; }
  # A resolved-but-empty ref would mean scanning nothing while reporting
  # success, so treat it as a failure of the gate rather than a skip.
  if [ -z "$ref" ]; then
    echo "::error::resolved an empty reference for '$pattern'" >&2
    status=1
    continue
  fi
  scan_report "$ref" || status=1
done

if [ "$status" -ne 0 ]; then
  echo "::error::image vulnerability gate failed (the runner image had fixable HIGH/CRITICAL findings, or an image could not be scanned or was not digest-pinned)" >&2
fi
exit "$status"
