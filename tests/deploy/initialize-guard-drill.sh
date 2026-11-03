#!/usr/bin/env bash
# The fail-closed surface of deploy/scripts/initialize-from-backup.sh, exercised
# for real with no Docker.
#
# Founding an environment from a platform backup is a one-way data decision:
# after it runs, the target is no longer virgin, so every refusal has to fire
# BEFORE anything is written. That ordering is the property under test here —
# each refusal below happens before the script has started a single container,
# which is why this drill can run in the fast `quality` job alongside the other
# host-script drills rather than in the Docker simulation.
#
# The situations that need a real database (the virgin-target proof, the
# restore, the ownership contract, the rerun refusal, and the first deployment
# onto the imported database) are covered by Phase 7 of
# tests/docker/first-install-and-recovery-drill.sh.
#
# Usage: tests/deploy/initialize-guard-drill.sh

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly SCRIPT="${REPO_ROOT}/deploy/scripts/initialize-from-backup.sh"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

pass=0
fail=0
ok() { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
no() { printf '  FAIL %s\n' "$1"; fail=$((fail + 1)); }

# `run_initialize <backup-dir> [extra env assignments...]` — always returns 0 so
# the caller decides what the outcome means. stdout+stderr land in $LAST_LOG.
LAST_LOG=""
run_initialize() {
  local source_dir="$1"; shift
  LAST_LOG="${WORKDIR}/run-$((RANDOM)).log"
  local status=0
  env \
    AAU_ENV=production \
    AAU_ENV_ROOT="${WORKDIR}/target" \
    DEPLOY_ROOT="${WORKDIR}/target/deploy" \
    ENV_FILE="${WORKDIR}/target/deploy/.env.production" \
    COMPOSE_FILE="${WORKDIR}/target/deploy/docker-compose.vps.yml" \
    STATE_FILE="${WORKDIR}/target/deploy/deployed-image" \
    LOCK_FILE="${WORKDIR}/target/deploy/locks/operations.lock" \
    BACKUP_ROOT="${WORKDIR}/target/backups" \
    UPLOADS_HOST_PATH="${WORKDIR}/target/uploads" \
    AAU_APP_PORT=13800 \
    AAU_CANDIDATE_PORT=13801 \
    "$@" \
    bash "$SCRIPT" "$source_dir" > "$LAST_LOG" 2>&1 || status=$?
  return "$status"
}

refuses() {
  local label="$1" needle="$2"; shift 2
  if run_initialize "$@"; then
    no "${label} (it SUCCEEDED)"
    return
  fi
  if grep -qF -- "$needle" "$LAST_LOG"; then
    ok "$label"
  else
    no "${label} — refusal did not mention: ${needle}"
    tail -6 "$LAST_LOG" | sed 's/^/       /'
  fi
}

# ── A target environment that looks real enough to get past the file checks ──
mkdir -p "${WORKDIR}/target/deploy" "${WORKDIR}/target/uploads"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${WORKDIR}/target/deploy/"
cat > "${WORKDIR}/target/deploy/.env.production" <<'EOF'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='guard-drill-payload-secret-at-least-32-chars'
INITIAL_ADMIN_EMAIL='admin@example.test'
EOF

# ── A synthetic platform backup with the real artifact shape ────────────────
# Only the SHAPE has to be real for these refusals: every one of them fires
# before the dump is ever handed to pg_restore.
make_backup() {
  local dir="$1" consistency="${2-quiesced}" environment="${3-staging}"
  mkdir -p "$dir"
  printf 'PGDMP fake custom-format archive\n' > "${dir}/postgres.dump"
  printf '; Archive created at 2026-01-01\n' > "${dir}/postgres.toc"
  tar --create --gzip --file "${dir}/uploads.tar.gz" --directory "${WORKDIR}" --files-from /dev/null
  cat > "${dir}/metadata.json" <<EOF
{
  "created_at": "20260101T000000Z",
  "environment": "${environment}",
  "database": "aau_platform",
  "postgres_version": "18.6",
  "app_image": "ghcr.io/example/app@sha256:$(printf 'a%.0s' {1..64})",
  "image_revision": "$(printf 'b%.0s' {1..40})",
  "applied_migrations": "20260809_020424_baseline",
  "uploads_included": true,
  "uploads_entries": 1,
  "consistency": "${consistency}"
}
EOF
  {
    echo "postgres.dump"
    echo "postgres.toc"
    echo "metadata.json"
    echo "uploads.tar.gz"
  } > "${dir}/MANIFEST"
  ( cd "$dir" && sha256sum -- * > SHA256SUMS.tmp && mv SHA256SUMS.tmp SHA256SUMS )
}

readonly ACK='I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION'

echo "=== 1. the acknowledgement ==="
good="${WORKDIR}/good-backup"
make_backup "$good"

refuses "no acknowledgement is refused" "$ACK" "$good"
refuses "an acknowledgement for another environment is refused" "$ACK" "$good" \
  ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-STAGING
refuses "a truncated acknowledgement is refused" "$ACK" "$good" \
  ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES
# The refusal must PRINT the exact string an operator has to supply, or the
# only way to satisfy it is to read the source.
if grep -qF "ALLOW_FIRST_INSTALL_FROM_BACKUP=${ACK}" "$LAST_LOG"; then
  ok "the refusal prints the exact command to re-run"
else
  no "the refusal does not print the exact command to re-run"
fi

echo
echo "=== 2. the artifact must be complete ==="
missing_dir="${WORKDIR}/no-such-backup"
refuses "a nonexistent backup directory is refused" "no such backup directory" \
  "$missing_dir" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

for artifact in MANIFEST SHA256SUMS metadata.json; do
  incomplete="${WORKDIR}/incomplete-${artifact}"
  make_backup "$incomplete"
  rm -f "${incomplete}/${artifact}"
  refuses "a backup with no ${artifact} is refused" "cannot be shown to be" \
    "$incomplete" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"
done

# An artifact listed in MANIFEST but absent is a partially-deleted backup.
partial="${WORKDIR}/partial-backup"
make_backup "$partial"
rm -f "${partial}/uploads.tar.gz"
refuses "a backup missing a manifested artifact is refused" "MANIFEST lists" \
  "$partial" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

echo
echo "=== 3. the artifact must be unmodified ==="
tampered="${WORKDIR}/tampered-backup"
make_backup "$tampered"
# One byte. The manifest still lists everything and every file is still present.
sed -i 's/"database": "aau_platform"/"database": "aau_platforn"/' "${tampered}/metadata.json"
refuses "a tampered backup is refused" "checksum verification failed" \
  "$tampered" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

# And there is NO opt-out. restore.sh has one for 3am; a planned initialization
# does not get to talk itself past an artifact it cannot verify.
refuses "the unverified-backup opt-in from restore.sh does NOT apply here" \
  "checksum verification failed" \
  "$tampered" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK" \
  ALLOW_UNVERIFIED_BACKUP=I-ACCEPT-POSSIBLE-DATA-LOSS

echo
echo "=== 4. the artifact must describe a usable baseline ==="
live="${WORKDIR}/live-backup"
make_backup "$live" live
refuses "a non-quiesced backup cannot found an environment" "consistency='live'" \
  "$live" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

anonymous="${WORKDIR}/anonymous-backup"
make_backup "$anonymous" quiesced ""
refuses "a backup with no recorded source environment is refused" "records no source environment" \
  "$anonymous" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

# A recorded origin is not an APPROVED origin. Production may be founded from
# the accepted staging baseline or from its own verified backup; a backup taken
# anywhere else is not a baseline for it, and requiring merely "non-empty" let
# one through.
foreign="${WORKDIR}/foreign-backup"
make_backup "$foreign" quiesced "some-other-environment"
refuses "a backup from an unapproved environment is refused" "may be founded only from" \
  "$foreign" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

# And the documented lineage is NOT blocked by that check — a guard that
# refuses the one path it exists to serve is worse than no guard.
#
# Marked `live`, deliberately. The consistency check sits immediately AFTER the
# origin check and before the script starts postgres-prod, so refusing there
# proves the staging -> production origin was accepted while keeping this drill
# where it belongs: every refusal fires before a container exists. A quiesced
# fixture here ran the real initialization instead, which on a runner that HAS
# Docker left a root-owned postgres/initdb behind that cleanup could not remove.
staging_source="${WORKDIR}/staging-source-backup"
make_backup "$staging_source" live "staging"
refuses "the accepted staging -> production lineage passes the origin check" \
  "consistency='live'" "$staging_source" ALLOW_FIRST_INSTALL_FROM_BACKUP="$ACK"

echo
echo "=== 5. nothing was started and nothing was written ==="
# Every refusal above fired before the script reached its first container. If
# any of them had not, this drill would have needed Docker — and, worse, a
# refusal would have happened after the target had already been touched.
if [[ ! -e "${WORKDIR}/target/deploy/deployed-image" ]]; then
  ok "no release-state file was written by any refused run"
else
  no "a refused run wrote a release-state file"
fi
if [[ -z "$(find "${WORKDIR}/target/uploads" -type f -print -quit)" ]]; then
  ok "no uploads were installed by any refused run"
else
  no "a refused run installed uploads"
fi
if [[ ! -e "${WORKDIR}/target/deploy/first-install-receipt.json" ]]; then
  ok "no receipt was written by any refused run"
else
  no "a refused run wrote a receipt"
fi
# The staging tree the script unpacks uploads into must never be left behind.
leftover="$(find "${WORKDIR}/target" -maxdepth 1 -name '.uploads-initializing-*' -print -quit 2>/dev/null || true)"
if [[ -z "$leftover" ]]; then
  ok "no half-unpacked uploads staging tree was left behind"
else
  no "a staging tree was left at ${leftover}"
fi

printf '\n'
if (( fail > 0 )); then
  printf '\033[1;31m%d assertion(s) failed (%d passed).\033[0m\n' "$fail" "$pass"
  exit 1
fi
printf '\033[1;32minitialize-from-backup fail-closed drill passed (%d assertions).\033[0m\n' "$pass"
