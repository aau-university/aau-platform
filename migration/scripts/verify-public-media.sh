#!/usr/bin/env bash
# Verify a Public Media tree against the committed manifest and checksums.
#
# The downloader (migration/simulation/04_fetch_public_media.mjs, proven and
# unmodified) already validates every object's byte size at download time and
# writes PUBLIC_MEDIA_SHA256SUMS. This script is the SEPARATE gate that runs
# again at import time, because the interesting failure is not "the download
# was wrong" — it is "the tree changed, was truncated, or picked up extra files
# between the download and the import", and only a re-check catches that.
#
# Four independent properties, because any one of them alone passes on a tree
# that is wrong in the other three:
#   1. every object's SHA-256 still matches           (content)
#   2. the object COUNT matches the manifest          (nothing missing)
#   3. nothing EXTRA is present under uploads/        (nothing smuggled in)
#   4. the total byte size matches the manifest       (independent of 1-3)
#
# Usage: migration/scripts/verify-public-media.sh <media-root>
# where <media-root> is the directory 04_fetch_public_media.mjs wrote, i.e. it
# contains `uploads/media/...` and `PUBLIC_MEDIA_SHA256SUMS`.

set -euo pipefail

readonly HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=migration/scripts/lib/contract.sh
source "${HERE}/lib/contract.sh"

log() { printf '[public-media] %s\n' "$*" >&2; }
fail() { printf '[public-media] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail "usage: $0 <media-root>"
readonly ROOT="$1"
readonly UPLOADS="${ROOT}/uploads"
readonly SUMS="${ROOT}/PUBLIC_MEDIA_SHA256SUMS"

contract_load || fail "could not load the frozen source contract"
log "contract: ${CONTRACT_FILE}"

[[ -d "$UPLOADS" ]] || fail "missing ${UPLOADS}
  Produce it first:
      node migration/simulation/04_fetch_public_media.mjs ${ROOT}"
[[ -s "$SUMS" ]] || fail "missing ${SUMS}; the download did not complete"

expected_objects="$CONTRACT_PUBLIC_MEDIA_OBJECTS"
expected_bytes="$CONTRACT_PUBLIC_MEDIA_BYTES"

# 1. Content. NOT --ignore-missing: that option makes the check PASS when a
#    listed file has been deleted, which is exactly the failure this exists to
#    catch (the same reasoning as deploy/scripts/restore.sh's checksum gate).
log "verifying SHA-256 for every public object"
( cd "$ROOT" && sha256sum --check --status PUBLIC_MEDIA_SHA256SUMS ) \
  || fail "public media checksums do not match, or a listed file is missing"

# 2. Count, from the checksum list AND from the filesystem. Two sources,
#    because a truncated checksum file would make a truncated tree self-consistent.
listed="$(grep -c . "$SUMS" || true)"
[[ "$listed" == "$expected_objects" ]] \
  || fail "PUBLIC_MEDIA_SHA256SUMS lists ${listed} objects, expected ${expected_objects}"

present="$(find "${UPLOADS}/media" -type f | wc -l | tr -d ' ')"
[[ "$present" == "$expected_objects" ]] \
  || fail "found ${present} files under uploads/media, expected ${expected_objects}"

# 3. Nothing extra anywhere under uploads/ — including a stray `uploads/private`,
#    which would mean Private Media binaries had been pulled in against scope.
# `|| true` made an unreadable directory, or a find that rejects -printf, read
# as "nothing extra is present" — and this is the ONLY gate that detects a
# stray uploads/private tree. The other three properties here already fail
# closed on the same errors.
stray="$(find "$UPLOADS" -mindepth 1 -maxdepth 1 ! -name media -printf '%f\n')" \
  || fail "could not enumerate ${UPLOADS}; the 'nothing extra is present' property was
  NOT verified. This is the check that would catch Private Media binaries
  pulled in against scope, so an unreadable result cannot pass."
[[ -z "$stray" ]] \
  || fail "unexpected entries under ${UPLOADS}: ${stray//$'\n'/ }
  Only 'media' belongs here. Private Media binaries are intentionally excluded
  from this migration; a 'private' directory means that scope was violated."

# 4. Total bytes, measured independently of the manifest's per-file sizes.
actual_bytes="$(find "${UPLOADS}/media" -type f -printf '%s\n' | awk '{s+=$1} END {print s+0}')"
[[ "$actual_bytes" == "$expected_bytes" ]] \
  || fail "public media total is ${actual_bytes} bytes, expected ${expected_bytes}"

log "verified ${present} public objects, ${actual_bytes} bytes, all checksums match"
log "Private Media binaries: intentionally absent (migration scope)"
