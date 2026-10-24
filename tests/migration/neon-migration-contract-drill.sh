#!/usr/bin/env bash
# Deterministic proof of the Neon migration tooling's FAIL-CLOSED contract.
#
# No Docker, no PostgreSQL, no network: every scenario here is a refusal that
# must happen BEFORE any of those are reached, which is precisely what makes
# them the checks worth regression-testing. A migration tool is judged by what
# it refuses to do, and each refusal below was a real way to destroy a
# staging environment or to migrate the wrong content:
#
#   1. running against production at all (including by simply not setting AAU_ENV)
#   2. running without the explicit acknowledgement
#   3. importing an archive that is not a neon-export.sh export
#   4. importing an incomplete or unchecksummed export
#   5. importing a dump that changed after it was exported
#   6. importing an export taken against a different source freeze
#   7. importing a Public Media tree that is short, corrupt or padded
#   8. importing a tree that smuggled in Private Media binaries
#   9. treating an unmeasurable value as a match
#
# The contract file is pointed at a small fixture (NEON_MIGRATION_CONTRACT) so
# the media scenarios do not need the real 619-object, 62 MB tree.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly IMPORT="${REPO_ROOT}/migration/scripts/neon-import.sh"
readonly VERIFY_MEDIA="${REPO_ROOT}/migration/scripts/verify-public-media.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
ok()   { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  FAIL %s\n       %s\n' "$1" "$2"; fail=$((fail + 1)); }

# expect_refusal <name> <expected-substring> -- runs the command, requires a
# NON-ZERO exit AND the expected reason. A non-zero exit alone is not enough:
# a script that fails for an unrelated reason would pass a status-only check
# while the guard it is supposed to prove never ran.
expect_refusal() {
  local name="$1" needle="$2"; shift 2
  local out status
  out="$("$@" 2>&1)"; status=$?
  if (( status == 0 )); then
    bad "$name" "expected a refusal, but the command SUCCEEDED"
    return
  fi
  if [[ "$out" != *"$needle"* ]]; then
    bad "$name" "refused, but not for the expected reason (wanted: ${needle})
       got: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-320)"
    return
  fi
  ok "$name"
}

expect_success() {
  local name="$1"; shift
  local out status
  out="$("$@" 2>&1)"; status=$?
  if (( status != 0 )); then
    bad "$name" "expected success, exited ${status}: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-320)"
    return
  fi
  ok "$name"
}

#############################################################################
# Fixtures: a fake staging deployment root, a small contract, a valid export
# and a valid three-object media tree.
#############################################################################
readonly HOST="${WORK}/srv/staging"
mkdir -p "${HOST}/deploy" "${HOST}/backups/20260908T000000Z" "${HOST}/uploads"
printf 'dump\n' > "${HOST}/backups/20260908T000000Z/postgres.dump"
cat > "${HOST}/deploy/.env.staging" <<'ENVFILE'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_DB='aau_staging'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='drill-password'
ENVFILE
printf 'services: {}\n' > "${HOST}/deploy/docker-compose.vps.yml"

readonly MEDIA="${WORK}/media"
mkdir -p "${MEDIA}/uploads/media"
printf 'alpha' > "${MEDIA}/uploads/media/a.png"
printf 'bravo!' > "${MEDIA}/uploads/media/b.png"
printf 'charlie!!' > "${MEDIA}/uploads/media/c.png"
( cd "${MEDIA}" && sha256sum uploads/media/a.png uploads/media/b.png uploads/media/c.png \
    > PUBLIC_MEDIA_SHA256SUMS )
media_bytes="$(find "${MEDIA}/uploads/media" -type f -printf '%s\n' | awk '{s+=$1} END {print s}')"

readonly CONTRACT="${WORK}/contract.env"
cat > "$CONTRACT" <<EOF
NEON_SOURCE_FREEZE_DATE=2026-09-07
NEON_SOURCE_REFERENCE_COMMIT=474728e9045e3a0bdee1e3601d0ba4b7a49b7b1e
SOURCE_PAYLOAD_MIGRATIONS_ROWS=0
SOURCE_MEDIA_ROWS=123
SOURCE_PUBLIC_MEDIA_HOST=pub-8a0efee290014de68b7c23df759d720c.r2.dev
PUBLIC_MEDIA_OBJECTS=3
PUBLIC_MEDIA_BYTES=${media_bytes}
EOF

# build_export <dir> [freeze-date] [kind]
build_export() {
  local dir="$1" freeze="${2:-2026-09-07}" kind="${3:-neon-source-export}"
  mkdir -p "$dir"
  printf 'PGDMP-not-a-real-archive\n' > "${dir}/neon.dump"
  printf '%s\n' neon.dump MANIFEST metadata.json > "${dir}/MANIFEST"
  local sha; sha="$(sha256sum "${dir}/neon.dump" | awk '{print $1}')"
  cat > "${dir}/metadata.json" <<EOF
{
  "kind": "${kind}",
  "source_freeze_date": "${freeze}",
  "dump_sha256": "${sha}"
}
EOF
  ( cd "$dir" && sha256sum neon.dump MANIFEST metadata.json > SHA256SUMS )
}

# Every import invocation shares this environment: a staging deployment rooted
# entirely inside the temp directory, so nothing here can reach a real host.
run_import() {
  env -u DOCKER_CONFIG \
    AAU_ENV_ROOT="$HOST" \
    DEPLOY_ROOT="${HOST}/deploy" \
    ENV_FILE="${HOST}/deploy/.env.staging" \
    COMPOSE_FILE="${HOST}/deploy/docker-compose.vps.yml" \
    STATE_FILE="${HOST}/deploy/deployed-image" \
    LOCK_FILE="${HOST}/deploy/locks/operations.lock" \
    BACKUP_ROOT="${HOST}/backups" \
    UPLOADS_HOST_PATH="${HOST}/uploads" \
    NEON_MIGRATION_CONTRACT="$CONTRACT" \
    "$@"
}

printf '\n== staging-only safety guard ==\n'

build_export "${WORK}/export-valid"

expect_refusal 'production is refused outright' 'STAGING ONLY' \
  run_import AAU_ENV=production ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
    bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"

# The most likely real-world mistake: AAU_ENV simply not set. environment.sh
# DEFAULTS to production, so an unset variable must be a refusal, not a default
# into the one environment this must never touch.
expect_refusal 'an unset AAU_ENV defaults to production and is refused' 'STAGING ONLY' \
  run_import ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
    bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"

# environment.sh rejects an unknown environment before neon-import.sh's own
# guard is reached — which is the right order, and worth pinning: the two
# guards together mean there is no spelling of AAU_ENV that reaches production.
expect_refusal 'an unknown environment is refused' 'unknown environment' \
  run_import AAU_ENV=qa ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
    bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"

expect_refusal 'the acknowledgement is required' 'ALLOW_NEON_IMPORT=' \
  run_import AAU_ENV=staging bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"

expect_refusal 'a near-miss acknowledgement does not count' 'ALLOW_NEON_IMPORT=' \
  run_import AAU_ENV=staging ALLOW_NEON_IMPORT=yes \
    bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"

printf '\n== export integrity ==\n'

staging_import() {
  run_import AAU_ENV=staging ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
    bash "$IMPORT" "$@"
}

build_export "${WORK}/export-tampered"
printf 'tampered-after-export\n' > "${WORK}/export-tampered/neon.dump"
expect_refusal 'a dump that changed after export is refused' 'checksums do not match' \
  staging_import "${WORK}/export-tampered" "$MEDIA"

build_export "${WORK}/export-nosums"
rm -f "${WORK}/export-nosums/SHA256SUMS"
# `expect_refusal` matches a SUBSTRING, so the needle has to be specific to
# THIS guard — bare 'missing' is satisfied by any other refusal that happens to
# use the word, and the assertion would pass for the wrong reason.
expect_refusal 'an export with no SHA256SUMS is refused' "${WORK}/export-nosums/SHA256SUMS" \
  staging_import "${WORK}/export-nosums" "$MEDIA"

build_export "${WORK}/export-incomplete"
rm -f "${WORK}/export-incomplete/metadata.json"
expect_refusal 'an export missing a declared artifact is refused' 'incomplete' \
  staging_import "${WORK}/export-incomplete" "$MEDIA"

build_export "${WORK}/export-backup" 2026-09-07 aau-platform-backup
expect_refusal 'a platform backup is not importable here' 'restore.sh' \
  staging_import "${WORK}/export-backup" "$MEDIA"

build_export "${WORK}/export-thawed" 2026-09-30
expect_refusal 'an export from a different source freeze is refused' 'freeze' \
  staging_import "${WORK}/export-thawed" "$MEDIA"

# A dump whose recorded hash is wrong, with SHA256SUMS regenerated to match the
# file. The checksum file alone would pass; the recorded hash is the second,
# independent binding between the archive and the export that produced it.
build_export "${WORK}/export-relabelled"
sed -i 's/"dump_sha256": "[a-f0-9]*"/"dump_sha256": "0000000000000000000000000000000000000000000000000000000000000000"/' \
  "${WORK}/export-relabelled/metadata.json"
( cd "${WORK}/export-relabelled" && sha256sum neon.dump MANIFEST metadata.json > SHA256SUMS )
expect_refusal 'a dump that does not match its recorded hash is refused' 'does not match the one recorded' \
  staging_import "${WORK}/export-relabelled" "$MEDIA"

printf '\n== public media integrity ==\n'

verify_media() { env NEON_MIGRATION_CONTRACT="$CONTRACT" bash "$VERIFY_MEDIA" "$@"; }

expect_success 'a complete, correct media tree verifies' verify_media "$MEDIA"

short="${WORK}/media-short"; cp -a "$MEDIA" "$short"; rm -f "${short}/uploads/media/c.png"
expect_refusal 'a missing object is refused' 'checksums do not match' verify_media "$short"

corrupt="${WORK}/media-corrupt"; cp -a "$MEDIA" "$corrupt"
printf 'CHARLIE!!' > "${corrupt}/uploads/media/c.png"   # same size, different bytes
expect_refusal 'a corrupt object of the right size is refused' 'checksums do not match' \
  verify_media "$corrupt"

extra="${WORK}/media-extra"; cp -a "$MEDIA" "$extra"
printf 'delta' > "${extra}/uploads/media/d.png"
expect_refusal 'an unexpected extra object is refused' 'expected 3' verify_media "$extra"

truncated="${WORK}/media-truncated"; cp -a "$MEDIA" "$truncated"
head -2 "${MEDIA}/PUBLIC_MEDIA_SHA256SUMS" > "${truncated}/PUBLIC_MEDIA_SHA256SUMS"
expect_refusal 'a truncated checksum list is refused' 'lists 2 objects' verify_media "$truncated"

private="${WORK}/media-private"; cp -a "$MEDIA" "$private"
mkdir -p "${private}/uploads/private"
printf 'secret' > "${private}/uploads/private/leak.pdf"
expect_refusal 'Private Media binaries are refused as out of scope' 'intentionally excluded' \
  verify_media "$private"

expect_refusal 'the import stops on a bad media tree, before any database work' 'Public Media tree did not verify' \
  staging_import "${WORK}/export-valid" "$short"

printf '\n== the rehearsal image is the deployed staging release, and nothing else ==\n'

# The import runs on the immutable digest recorded in the release-state file by
# the last successful deploy or restore. Every other shape of image identity is
# refused. A `docker` stub that always fails makes the accepted case
# deterministic: it can only get as far as trying to obtain the image, which is
# already past every identity check.
mkdir -p "${WORK}/bin"
printf '#!/usr/bin/env bash\nexit 1\n' > "${WORK}/bin/docker"
chmod +x "${WORK}/bin/docker"

readonly STAGING_DIGEST='ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging@sha256:1111111111111111111111111111111111111111111111111111111111111111'

# import_with_recorded_release <state-file-contents>
import_with_recorded_release() {
  printf '%s\n' "$1" > "${HOST}/deploy/deployed-image"
  shift
  PATH="${WORK}/bin:$PATH" run_import \
    AAU_ENV=staging ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT "$@" \
    bash "$IMPORT" "${WORK}/export-valid" "$MEDIA"
}

# The accepted case. Reaching the pull means the digest, the shape and the
# channel all passed — which is exactly what the negative cases below must not.
expect_refusal 'the recorded staging digest is accepted as an identity' \
  'cannot obtain the staging application image' \
  import_with_recorded_release "$STAGING_DIGEST"

# A manual override is a hard error, not a silent no-op: an operator who exports
# it believes it will be honoured.
expect_refusal 'a manual image override is refused outright' 'has no image override' \
  import_with_recorded_release "$STAGING_DIGEST" NEON_IMPORT_IMAGE="$STAGING_DIGEST"

expect_refusal 'no recorded release is refused' 'no release is recorded' \
  import_with_recorded_release ''

# A tag can be repointed between planning a rehearsal and running it, so it is
# not a release identity even in the right package.
expect_refusal 'a mutable tag in the right package is refused' 'not an immutable digest' \
  import_with_recorded_release 'ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging:latest'

expect_refusal 'a local image is refused' 'not an immutable digest' \
  import_with_recorded_release 'aau-runner:ci'

# Digest-shaped but not from the channel — the case a bare `*@sha256:*` check
# would wave through.
expect_refusal 'a local digest outside the channel is refused' 'approved staging channel' \
  import_with_recorded_release 'aau-runner@sha256:2222222222222222222222222222222222222222222222222222222222222222'

# The production package is a DIFFERENT package, not a laxer one.
expect_refusal 'the production channel is refused' 'approved staging channel' \
  import_with_recorded_release 'ghcr.io/mohammed7779948484-tech/aau-payload-platform@sha256:3333333333333333333333333333333333333333333333333333333333333333'

# A suffix heuristic would accept this; exact repository matching does not.
expect_refusal 'a third-party lookalike package is refused' 'approved staging channel' \
  import_with_recorded_release 'ghcr.io/attacker/aau-payload-platform-staging@sha256:4444444444444444444444444444444444444444444444444444444444444444'

# Restore a valid recorded release for any later scenario.
printf '%s\n' "$STAGING_DIGEST" > "${HOST}/deploy/deployed-image"

printf '\n== contract assertions fail closed ==\n'

# shellcheck source=migration/scripts/lib/contract.sh
source "${REPO_ROOT}/migration/scripts/lib/contract.sh"

contract_probe_check() {
  CONTRACT_FAILURES=0; CONTRACT_REPORT=()
  contract_load "$CONTRACT" >/dev/null 2>&1
  contract_expect 'value' "$1" "$2" >/dev/null 2>&1
  contract_verdict 'drill' >/dev/null 2>&1
}

if contract_probe_check 0 0; then ok 'a matching value passes'; else bad 'a matching value passes' 'it did not'; fi
if contract_probe_check 0 1; then bad 'a mismatching value fails' 'it passed'; else ok 'a mismatching value fails'; fi
# The important one: a probe that returned NOTHING (psql unreachable, table
# absent, query error) must never be read as a match.
if contract_probe_check 0 ''; then bad 'an unmeasurable value fails closed' 'an empty probe was treated as a match'
else ok 'an unmeasurable value fails closed'; fi

# Under `set -e` — which every caller uses — a contract_expect that returned
# non-zero on a mismatch would abort the script at the FIRST difference, before
# the verdict printed any of them. So the ledger must survive `set -e` and
# report EVERY difference in one run.
multi="$(
  set -e
  source "${REPO_ROOT}/migration/scripts/lib/contract.sh"
  contract_load "$CONTRACT" >/dev/null
  contract_expect 'first' 1 2
  contract_expect 'second' 3 4
  contract_expect 'third' 5 5
  contract_verdict 'drill' 2>&1 || true
)"
if [[ "$multi" == *'MISMATCH first'* && "$multi" == *'MISMATCH second'* && "$multi" == *'2 difference(s)'* ]]; then
  ok 'every difference is reported in one run, not just the first'
else
  bad 'every difference is reported in one run, not just the first' \
      "got: $(printf '%s' "$multi" | tr '\n' ' ' | cut -c1-240)"
fi

printf '\n== the public-media downloader never deletes an output root ==\n'
# `04_fetch_public_media.mjs` takes its output root from argv, and
# migration/RUNBOOK.md invokes it with a real path on the staging VPS. It used
# to `rm -rf` that path before downloading anything, so one wrong argument
# destroyed whatever was there. Both assertions below run for real, with no
# network: the refusal has to happen before the first fetch, which is the
# property being pinned.
FETCH="${REPO_ROOT}/migration/simulation/04_fetch_public_media.mjs"

occupied="${WORK}/occupied-output"
mkdir -p "${occupied}/uploads/media"
printf 'an applicant document, or an operator typo away from one\n' \
  > "${occupied}/uploads/media/precious.bin"
before="$(sha256sum "${occupied}/uploads/media/precious.bin" | cut -d' ' -f1)"

out="$(node "$FETCH" "$occupied" 2>&1 || true)"
if [[ "$out" == *'is not empty'* ]]; then
  ok 'a non-empty output root is refused'
else
  bad 'a non-empty output root is refused' \
      "got: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-240)"
fi

# The refusal is worthless if it fires after the delete.
if [[ -f "${occupied}/uploads/media/precious.bin" ]] \
   && [[ "$(sha256sum "${occupied}/uploads/media/precious.bin" | cut -d' ' -f1)" == "$before" ]]; then
  ok 'the refused run left the existing content byte-identical'
else
  bad 'the refused run left the existing content byte-identical' \
      'the downloader deleted or altered the output root it refused to use'
fi

notdir="${WORK}/output-is-a-file"
: > "$notdir"
out="$(node "$FETCH" "$notdir" 2>&1 || true)"
if [[ "$out" == *'is not a directory'* ]]; then
  ok 'an output root that is not a directory is refused'
else
  bad 'an output root that is not a directory is refused' \
      "got: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-240)"
fi

# There must be no way to talk it past the refusal — neon-export.sh has no
# override for the same rule, and a retired escape hatch reads as a supported
# one.
out="$(MEDIA_FETCH_REPLACE_OUTPUT=yes FORCE=1 node "$FETCH" "$occupied" 2>&1 || true)"
if [[ "$out" == *'is not empty'* ]] && [[ -f "${occupied}/uploads/media/precious.bin" ]]; then
  ok 'no environment variable reaches around the refusal'
else
  bad 'no environment variable reaches around the refusal' \
      "got: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-240)"
fi

printf '\n== the canonical restore path is untouched ==\n'
# The contract is that restore.sh cannot REACH the Neon tooling -- its named
# entry points and artifacts. A bare search for the word is a proxy for that,
# and it stopped being a correct one: restore.sh's baseline-recovery path tells
# the operator, in as many words, that the database was NOT re-imported from
# Neon. That sentence is the contract being KEPT. The first production launch
# is exactly when someone might reach for the Neon import to "start again", so
# the guidance names it in order to forbid it.
if grep -qE 'neon-import|neon-export|neon\.dump|migration/scripts|migration/simulation' \
     "${REPO_ROOT}/deploy/scripts/restore.sh"; then
  bad 'restore.sh cannot reach the Neon migration tooling' \
      'restore.sh references a Neon entry point'
else
  ok 'restore.sh cannot reach the Neon migration tooling'
fi

# And every mention that remains must be guidance that rules it out, never a
# code path. Without this the precise rule above could be satisfied by a
# restore.sh that had grown a real Neon branch spelled some other way.
neon_lines="$(grep -in 'neon' "${REPO_ROOT}/deploy/scripts/restore.sh" || true)"
if [[ -z "$neon_lines" ]]; then
  bad 'restore.sh mentions Neon only to rule it out' \
      'no mention found at all -- the guidance that forbids a Neon re-import is missing'
else
  offending=""
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    text="${line#*:}"
    # Guidance is a comment or a log line, AND says it is not what happened or
    # not what to do.
    if [[ ! "$text" =~ ^[[:space:]]*(#|log \") ]] \
       || [[ ! "$text" =~ (NOT|never|unreachable) ]]; then
      offending+="${line}"$'\n'
    fi
  done <<< "$neon_lines"
  if [[ -n "$offending" ]]; then
    bad 'restore.sh mentions Neon only to rule it out' \
        "got: $(printf '%s' "$offending" | tr '\n' ' ' | cut -c1-240)"
  else
    ok 'restore.sh mentions Neon only to rule it out'
  fi
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
(( fail == 0 ))
