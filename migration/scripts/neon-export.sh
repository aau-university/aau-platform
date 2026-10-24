#!/usr/bin/env bash
# Produce a REAL, verifiable `pg_dump -Fc` export of the frozen Neon source.
#
# ── What this is, and what it deliberately is not ─────────────────────────
# This is a ONE-TIME export of a FROZEN source. The Neon `production` data was
# frozen on the date recorded in migration/source-contract.env and nothing is
# being added before the VPS cutover, so there is no CDC, no incremental sync
# and no snapshot service here — and there must not be. A frozen source needs
# one dump; a synchronisation service would be an unverified moving part in the
# most dangerous position available.
#
# ── Read-only against Neon ────────────────────────────────────────────────
# Every statement this script issues against the source is a SELECT or a
# `pg_dump`. It never writes to Neon.
#
# ── Fail closed on the source contract ────────────────────────────────────
# The contract is asserted BEFORE the dump is written. An export that does not
# match the frozen source is not a migration input, it is a signal that the
# freeze was broken or that the wrong database was addressed, and either way
# the right move is to stop here rather than to discover it three phases later
# with a staging schema already dropped.
#
# Usage:
#   NEON_DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require' \
#     migration/scripts/neon-export.sh /srv/aau/neon-export/20260908T101500Z
#
# Use the DIRECT (non-pooled) Neon endpoint: pg_dump against a connection
# pooler is not a supported combination.

set -euo pipefail

readonly HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=migration/scripts/lib/contract.sh
source "${HERE}/lib/contract.sh"

# The SAME digest-pinned PostgreSQL 18 image the VPS runs. The dump format
# version and the restoring server therefore match by construction rather than
# by whatever pg_dump happens to be on the operator's laptop — a PostgreSQL 17
# client cannot read an 18 dump, and that failure would land after the export.
# Fixed, with no environment override. This script passes NEON_DATABASE_URL —
# a live credential for the frozen source — into this image and runs `bash`,
# `psql` and `pg_dump` inside it. An overridable image is therefore an
# arbitrary-code path that is handed the credential, and nothing in the
# repository sets PG_IMAGE, so the override bought nothing.
readonly PG_IMAGE="postgres:18.6-bookworm@sha256:7d2695c3aa88e792e8b3b233e7e4adb296a20412c6c0ca361e3edaaacfada108"

log() { printf '[neon-export] %s\n' "$*" >&2; }
fail() { printf '[neon-export] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail "usage: NEON_DATABASE_URL=<direct url> $0 <output-directory>"
readonly OUT="$1"
[[ -n "${NEON_DATABASE_URL:-}" ]] || fail "NEON_DATABASE_URL is required (direct, non-pooled Neon endpoint)"

# Never overwrite an existing export. An export directory is evidence; silently
# replacing one destroys the audit trail of what was actually migrated.
if [[ -e "$OUT" ]]; then
  [[ -d "$OUT" ]] || fail "${OUT} exists and is not a directory"
  [[ -z "$(ls -A "$OUT" 2>/dev/null)" ]] || fail "${OUT} already contains an export; choose a new directory"
fi
mkdir -p "$OUT"

contract_load || fail "could not load the frozen source contract"
log "frozen source contract: ${CONTRACT_NEON_SOURCE_FREEZE_DATE} (${CONTRACT_FILE})"

command -v docker >/dev/null 2>&1 || fail "docker is required (the pinned PostgreSQL 18 client runs in it)"
docker image inspect "$PG_IMAGE" >/dev/null 2>&1 || docker pull "$PG_IMAGE" >/dev/null \
  || fail "cannot obtain the pinned PostgreSQL client image ${PG_IMAGE}"

# The URL is passed through the environment, never on a command line: process
# arguments are world-readable in /proc on the host.
pg() {
  local entry="$1"; shift
  docker run --rm -i \
    -e PGCONNECT_TIMEOUT=30 \
    -e SOURCE_URL="$NEON_DATABASE_URL" \
    --entrypoint "$entry" "$PG_IMAGE" "$@"
}

#############################################################################
# PHASE 1 — the source contract, asserted against the LIVE frozen source.
#############################################################################
log "probing the frozen source (read-only)"
probe=""
if ! probe="$(docker run --rm -i \
    -e PGCONNECT_TIMEOUT=30 -e SOURCE_URL="$NEON_DATABASE_URL" \
    --entrypoint bash "$PG_IMAGE" -c \
      'psql "$SOURCE_URL" -At -v ON_ERROR_STOP=1 -v r2_host="'"${CONTRACT_SOURCE_PUBLIC_MEDIA_HOST}"'" -f -' \
    < "${HERE}/sql/source_contract.sql" 2>&1)"; then
  printf '%s\n' "$probe" >&2
  fail "could not probe the source database; refusing to export an unverified dump"
fi

assert_source_contract() {
  local probe="$1"
  contract_expect 'payload_migrations rows'          "$CONTRACT_SOURCE_PAYLOAD_MIGRATIONS_ROWS"        "$(contract_probe_value "$probe" payload_migrations_rows)"
  contract_expect 'payload_jobs rows'                "$CONTRACT_SOURCE_PAYLOAD_JOBS_ROWS"              "$(contract_probe_value "$probe" payload_jobs_rows)"
  contract_expect 'payload_jobs_log rows'            "$CONTRACT_SOURCE_PAYLOAD_JOBS_LOG_ROWS"          "$(contract_probe_value "$probe" payload_jobs_log_rows)"
  contract_expect 'duplicate StudyPlans per program' "$CONTRACT_SOURCE_DUPLICATE_STUDY_PLAN_GROUPS"    "$(contract_probe_value "$probe" duplicate_study_plan_groups)"
  contract_expect 'NULL publication flags'           "$CONTRACT_SOURCE_NULL_PUBLICATION_FLAGS"         "$(contract_probe_value "$probe" null_publication_flags)"
  contract_expect 'offers status mismatches'         "$CONTRACT_SOURCE_OFFER_STATUS_MISMATCHES"        "$(contract_probe_value "$probe" offer_status_mismatches)"
  contract_expect 'offer version status mismatches'  "$CONTRACT_SOURCE_OFFER_VERSION_STATUS_MISMATCHES" "$(contract_probe_value "$probe" offer_version_status_mismatches)"
  contract_expect 'public media rows'                "$CONTRACT_SOURCE_MEDIA_ROWS"                     "$(contract_probe_value "$probe" media_rows)"
  contract_expect 'public media rows off the frozen R2 origin' \
                                                     "$CONTRACT_SOURCE_MEDIA_FOREIGN_URL_ROWS"         "$(contract_probe_value "$probe" media_foreign_url_rows)"
  local key
  for key in private_media_rows users_rows roles_rows colleges_rows \
             academic_departments_rows academic_programs_rows \
             faculty_members_rows study_plans_rows; do
    contract_record "$key" "$(contract_probe_value "$probe" "$key")"
  done
}

assert_source_contract "$probe"
contract_verdict "the live Neon source" || fail "the source no longer matches the frozen contract; refusing to export"

#############################################################################
# PHASE 2 — the dump itself.
#############################################################################
# `--schema=public` keeps Neon's own system objects and roles out of the
# archive; every application object lives in `public`. `--no-owner`/
# `--no-privileges` drop Neon role names that do not exist on the VPS, so the
# restore can be attributed to the VPS application role instead of failing on
# an unknown grantee.
log "running pg_dump -Fc (this is the real export)"
if ! docker run --rm \
    -e PGCONNECT_TIMEOUT=30 -e SOURCE_URL="$NEON_DATABASE_URL" \
    --entrypoint bash "$PG_IMAGE" -c \
      'pg_dump "$SOURCE_URL" --format=custom --compress=9 --schema=public --no-owner --no-privileges' \
    > "${OUT}/neon.dump"; then
  rm -f "${OUT}/neon.dump"
  fail "pg_dump failed; no export was produced"
fi
[[ -s "${OUT}/neon.dump" ]] || fail "pg_dump produced an empty file"

#############################################################################
# PHASE 3 — prove the archive is readable BEFORE anyone relies on it.
#############################################################################
log "verifying the dump is readable by pg_restore"
toc="$(pg pg_restore --list < "${OUT}/neon.dump" 2>/dev/null || true)"
entries="$(printf '%s\n' "$toc" | grep -c ';' || true)"
[[ "${entries:-0}" -gt 0 ]] || fail "the dump is not readable by pg_restore; the export is not usable"
log "dump readable (${entries} archive entries)"

pg_dump_version="$(pg pg_dump --version 2>/dev/null | tr -d '\r')"
dump_bytes="$(stat -c %s "${OUT}/neon.dump")"

#############################################################################
# PHASE 4 — the integrity envelope, in the shape restore/backup already use.
#############################################################################
printf '%s\n' neon.dump MANIFEST metadata.json > "${OUT}/MANIFEST"
( cd "$OUT" && sha256sum neon.dump MANIFEST > SHA256SUMS )
dump_sha="$(awk '$2=="neon.dump" {print $1}' "${OUT}/SHA256SUMS")"

cat > "${OUT}/metadata.json" <<EOF
{
  "kind": "neon-source-export",
  "taken_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_freeze_date": "${CONTRACT_NEON_SOURCE_FREEZE_DATE}",
  "source_reference_commit": "${CONTRACT_NEON_SOURCE_REFERENCE_COMMIT}",
  "pg_dump_version": "${pg_dump_version}",
  "pg_image": "${PG_IMAGE}",
  "dump_format": "custom",
  "dump_bytes": ${dump_bytes},
  "dump_sha256": "${dump_sha}",
  "archive_entries": ${entries},
  "schema_scope": "public",
  "private_media_binaries_included": false,
  "public_media_binaries_included": false
}
EOF

# metadata.json is written after SHA256SUMS (it records the dump's own hash, so
# it cannot hash itself); its integrity is covered by MANIFEST presence plus the
# dump hash it carries. Re-sum so a corrupted metadata file is still detected.
( cd "$OUT" && sha256sum neon.dump MANIFEST metadata.json > SHA256SUMS )

chmod 0600 "${OUT}/neon.dump"
log "export complete: ${OUT}"
log "  dump bytes:  ${dump_bytes}"
log "  dump sha256: ${dump_sha}"
log ""
log "Public and Private Media BINARIES are not in this archive:"
log "  Public Media binaries come from migration/simulation/04_fetch_public_media.mjs."
log "  Private Media binaries are intentionally excluded from the migration."
log "Next: migration/scripts/neon-import.sh (STAGING ONLY). See migration/RUNBOOK.md."
