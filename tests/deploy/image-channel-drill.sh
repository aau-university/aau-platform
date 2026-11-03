#!/usr/bin/env bash
# Executable proof of the GHCR channel contract after the repository moved to
# aau-university/aau-platform, using a `docker` stub on PATH -- no real stack,
# no registry, no network.
#
# It runs the REAL deploy/scripts/deploy-entrypoint.sh and the REAL
# deploy/scripts/restore.sh, and proves:
#
#   A. deploy-entrypoint.sh (the root privilege boundary)
#      - accepts only the CURRENT package of its own environment;
#      - refuses the pre-migration packages, the other environment's package,
#        lookalikes, third-party owners and tags;
#      - keeps the production allow-list strict (an unlisted digest in the
#        right channel is still refused).
#
#   B. restore.sh (recovery)
#      - restores current-channel backups as before;
#      - restores a backup paired with a PRE-MIGRATION build, and only that
#        backup's own recorded build, obtained by digest from (1) a
#        digest-identical copy in the current package, (2) the host, or
#        (3) the separate legacy credential store -- in that order;
#      - refuses every widening: another legacy digest, the other
#        environment's legacy package, other owners, lookalikes, tags, and
#        the legacy channel in a cross-environment restore;
#      - refuses BEFORE any data service is started when the recorded build
#        cannot be obtained.
#
# The stub ends every restore at its first `docker compose` call (exit 97),
# which comes after the channel gate and the image acquisition and before
# anything destructive. Exit 97 therefore means "passed the gate"; exit 1 with
# no compose call means "refused before touching anything".

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1)); fi
}
contains() {
  if grep -qF -- "$3" "$2"; then printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       %s did not contain: %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
    tail -8 "$2" | sed 's/^/         | /'
  fi
}
lacks() {
  if grep -qF -- "$3" "$2"; then
    printf '  FAIL %s\n       %s unexpectedly contained: %s\n' "$1" "$2" "$3"; fail=$((fail + 1))
  else printf '  ok   %s\n' "$1"; pass=$((pass + 1)); fi
}

readonly NEW_PROD='ghcr.io/aau-university/aau-platform'
readonly NEW_STAG='ghcr.io/aau-university/aau-platform-staging'
readonly OLD_PROD='ghcr.io/mohammed7779948484-tech/aau-payload-platform'
readonly OLD_STAG='ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging'
D1="sha256:$(printf '1%.0s' {1..64})"
D2="sha256:$(printf '2%.0s' {1..64})"
D3="sha256:$(printf '3%.0s' {1..64})"
readonly D1 D2 D3

#############################################################################
# A. deploy-entrypoint.sh
#############################################################################
# The entrypoint selects its environment from its own installed path, which is
# a hardcoded /srv/aau/... constant. The drill installs a copy whose ONLY
# change is that prefix, rebased under a temporary directory, and proves the
# rebase touched exactly the path constants and nothing else.
echo "=== A. deploy-entrypoint.sh channel boundary ==="
FAKE_SRV="${WORK}/srv/aau"
src_entry="${REPO_ROOT}/deploy/scripts/deploy-entrypoint.sh"
rebased="${WORK}/deploy-entrypoint.rebased.sh"
sed "s#/srv/aau/#${FAKE_SRV}/#g" "$src_entry" > "$rebased"
changed="$(diff <(grep -v '^[[:space:]]*#' "$src_entry") <(grep -v '^[[:space:]]*#' "$rebased") | grep -c '^>' || true)"
# Two `case` arms (path), two DEPLOY_ROOT and two POLICY_FILE constants.
check "the rebase changed exactly the six executable path constants" "$changed" "6"

for env in production staging; do
  mkdir -p "${FAKE_SRV}/${env}/deploy/scripts"
  install -m 0755 "$rebased" "${FAKE_SRV}/${env}/deploy/scripts/deploy-entrypoint.sh"
  cat > "${FAKE_SRV}/${env}/deploy/scripts/deploy.sh" <<'STUB'
#!/usr/bin/env bash
echo "DEPLOY_CALLED env=${AAU_ENV} image=$1"
STUB
  chmod +x "${FAKE_SRV}/${env}/deploy/scripts/deploy.sh"
done
printf 'authorized_digests=any-in-channel\n' > "${FAKE_SRV}/staging/deploy/release-policy.conf"
printf 'authorized_digests_file=%s\n' "${FAKE_SRV}/production/deploy/authorized-releases" \
  > "${FAKE_SRV}/production/deploy/release-policy.conf"
printf '%s\n' "$D1" > "${FAKE_SRV}/production/deploy/authorized-releases"

entry() {  # entry <env> <image>  -> prints exit status; output in $WORK/entry.log
  bash "${FAKE_SRV}/$1/deploy/scripts/deploy-entrypoint.sh" "$2" > "${WORK}/entry.log" 2>&1
  echo $?
}

check "staging accepts ${NEW_STAG}@<digest>" "$(entry staging "${NEW_STAG}@${D2}")" "0"
contains "  ...and hands it to deploy.sh as staging" "${WORK}/entry.log" "DEPLOY_CALLED env=staging image=${NEW_STAG}@${D2}"
for bad in \
  "${OLD_STAG}@${D2}" \
  "${OLD_PROD}@${D2}" \
  "${NEW_PROD}@${D2}" \
  "${NEW_STAG}-evil@${D2}" \
  "ghcr.io/attacker/aau-platform-staging@${D2}" \
  "ghcr.io/aau-university/other-package@${D2}" \
  "ghcr.io/AAU-University/aau-platform-staging@${D2}"; do
  check "staging refuses ${bad%@*}" "$(entry staging "$bad")" "1"
  lacks "  ...without calling deploy.sh" "${WORK}/entry.log" "DEPLOY_CALLED"
done
check "staging refuses a tag in the current channel" "$(entry staging "${NEW_STAG}:latest")" "1"

check "production accepts an AUTHORIZED ${NEW_PROD}@<digest>" "$(entry production "${NEW_PROD}@${D1}")" "0"
contains "  ...and hands it to deploy.sh as production" "${WORK}/entry.log" "DEPLOY_CALLED env=production image=${NEW_PROD}@${D1}"
check "production refuses an UNLISTED digest in its own channel" "$(entry production "${NEW_PROD}@${D2}")" "1"
contains "  ...naming the allow-list" "${WORK}/entry.log" "is not in the authorized release list"
for bad in "${OLD_PROD}@${D1}" "${NEW_STAG}@${D1}" "${OLD_STAG}@${D1}" "ghcr.io/attacker/aau-platform@${D1}"; do
  check "production refuses ${bad%@*} even for an authorized digest" "$(entry production "$bad")" "1"
  lacks "  ...without calling deploy.sh" "${WORK}/entry.log" "DEPLOY_CALLED"
done
: > "${FAKE_SRV}/production/deploy/authorized-releases"
check "production with an EMPTY allow-list refuses everything" "$(entry production "${NEW_PROD}@${D1}")" "1"

#############################################################################
# B. restore.sh
#############################################################################
echo
echo "=== B. restore.sh channel and pre-migration recovery ==="

# A docker stub. State lives in files so every call sees the same "host":
#   local.list    references present on this host (inspect succeeds)
#   registry.list "<ref> <required DOCKER_CONFIG>" lines a pull can satisfy
#   pulls.log     every pull and the credential store it used
#   compose.log   the first compose call (the stub stops the restore there)
mkdir -p "${WORK}/bin"
cat > "${WORK}/bin/docker" <<'STUB'
#!/usr/bin/env bash
S="$DRILL_STATE"
last="${!#}"
case "$1" in
  ps) exit 0 ;;
  image)
    # docker image inspect [--format F] <ref>
    if grep -qxF -- "$last" "$S/local.list"; then
      [[ "$*" == *--format* ]] && printf '%s\n' "$last"
      exit 0
    fi
    exit 1 ;;
  pull)
    printf 'PULL %s DOCKER_CONFIG=%s\n' "$last" "${DOCKER_CONFIG:-}" >> "$S/pulls.log"
    while read -r ref cfg; do
      if [[ "$ref" == "$last" && "$cfg" == "${DOCKER_CONFIG:-}" ]]; then
        printf '%s\n' "$last" >> "$S/local.list"; exit 0
      fi
    done < "$S/registry.list"
    exit 1 ;;
  compose)
    printf 'COMPOSE_REACHED APP_IMAGE=%s\n' "${APP_IMAGE:-}" >> "$S/compose.log"
    exit 97 ;;
  *) exit 0 ;;
esac
STUB
chmod +x "${WORK}/bin/docker"
# flock(1) is util-linux; present on the CI runner. Stub it only where it is
# genuinely absent so the drill can also run on a workstation shell. The lock
# itself is proven by tests/deploy/operation-lock-drill.sh, not here.
if ! command -v flock >/dev/null 2>&1; then
  printf '#!/usr/bin/env bash\nexit 0\n' > "${WORK}/bin/flock"; chmod +x "${WORK}/bin/flock"
  echo "  note: flock not installed here; using a pass-through stub for this drill"
fi

# make_env <env> -> sets ENVROOT; writes env file, compose file, credential dirs
make_env() {
  local env="$1"
  ENVROOT="${WORK}/hosts/${env}-$RANDOM$RANDOM"
  mkdir -p "${ENVROOT}/deploy" "${ENVROOT}/docker"
  cat > "${ENVROOT}/deploy/.env.${env}" <<EOF
POSTGRES_ADMIN_USER='drill_admin'
POSTGRES_DB='drill_${env}'
APP_DB_USER='drill_app'
APP_DB_PASSWORD='drill-placeholder-not-a-secret'
EOF
  : > "${ENVROOT}/deploy/docker-compose.vps.yml"
}

# make_backup <env> <database> <app_image> -> sets BACKUP
make_backup() {
  BACKUP="${WORK}/backups/b-$RANDOM$RANDOM"
  mkdir -p "$BACKUP"
  printf 'not-a-real-dump\n' > "${BACKUP}/postgres.dump"
  cat > "${BACKUP}/metadata.json" <<EOF
{
  "created_at": "20261101T000000Z",
  "environment": "$1",
  "database": "$2",
  "postgres_version": "18",
  "app_image": "$3",
  "image_revision": "",
  "applied_migrations": "",
  "uploads_included": false,
  "uploads_entries": 0,
  "consistency": "quiesced"
}
EOF
  printf 'postgres.dump\nmetadata.json\n' > "${BACKUP}/MANIFEST"
  ( cd "$BACKUP" && sha256sum postgres.dump metadata.json MANIFEST > SHA256SUMS )
}

# new_state: a fresh empty host/registry
new_state() {
  STATE="${WORK}/state-$RANDOM$RANDOM"
  mkdir -p "$STATE"
  : > "${STATE}/local.list"; : > "${STATE}/registry.list"
  : > "${STATE}/pulls.log"; : > "${STATE}/compose.log"
}

# run_restore <env> [VAR=value ...] -> prints exit status; log in $WORK/restore.log
run_restore() {
  local env="$1"; shift
  env -u DOCKER_CONFIG -u LEGACY_DOCKER_CONFIG \
    PATH="${WORK}/bin:$PATH" DRILL_STATE="$STATE" \
    AAU_ENV="$env" AAU_ENV_ROOT="$ENVROOT" \
    "$@" bash "${REPO_ROOT}/deploy/scripts/restore.sh" "$BACKUP" \
    > "${WORK}/restore.log" 2>&1
  echo $?
}
reached() { sed -n 's/^COMPOSE_REACHED APP_IMAGE=//p' "${STATE}/compose.log" | head -n1; }

echo "-- B1. current-channel backup (no migration involved)"
new_state; make_env staging; make_backup staging drill_staging "${NEW_STAG}@${D1}"
printf '%s %s\n' "${NEW_STAG}@${D1}" "${ENVROOT}/docker" >> "${STATE}/registry.list"
check "passes the gate" "$(run_restore staging)" "97"
check "  ...with the recorded current-channel build" "$(reached)" "${NEW_STAG}@${D1}"

echo "-- B2. pre-migration backup, digest-identical copy exists in the current package"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
printf '%s %s\n' "${NEW_STAG}@${D1}" "${ENVROOT}/docker" >> "${STATE}/registry.list"
# The legacy build is ALSO on the host; the current-channel copy still wins,
# because it is the path that survives retiring the old namespace.
printf '%s\n' "${OLD_STAG}@${D1}" >> "${STATE}/local.list"
check "passes the gate" "$(run_restore staging)" "97"
check "  ...running the SAME digest from the current channel" "$(reached)" "${NEW_STAG}@${D1}"
contains "  ...and saying which recorded build it stands in for" "${WORK}/restore.log" "this backup recorded ${OLD_STAG}@${D1}"
contains "  ...pulled with this environment's own credential store" "${STATE}/pulls.log" "PULL ${NEW_STAG}@${D1} DOCKER_CONFIG=${ENVROOT}/docker"

echo "-- B3. pre-migration backup, no copy, build present on the host"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
printf '%s\n' "${OLD_STAG}@${D1}" >> "${STATE}/local.list"
check "passes the gate" "$(run_restore staging)" "97"
check "  ...with the recorded pre-migration build" "$(reached)" "${OLD_STAG}@${D1}"
lacks "  ...never pulling the legacy name with the current credentials" "${STATE}/pulls.log" "PULL ${OLD_STAG}@${D1} DOCKER_CONFIG=${ENVROOT}/docker"

echo "-- B4. pre-migration backup, pulled through the separate legacy credential store"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
mkdir -p "${ENVROOT}/docker-legacy"
printf '%s %s\n' "${OLD_STAG}@${D1}" "${ENVROOT}/docker-legacy" >> "${STATE}/registry.list"
check "passes the gate" "$(run_restore staging)" "97"
check "  ...with the recorded pre-migration build" "$(reached)" "${OLD_STAG}@${D1}"
contains "  ...pulled with the legacy store, not the current one" "${STATE}/pulls.log" "PULL ${OLD_STAG}@${D1} DOCKER_CONFIG=${ENVROOT}/docker-legacy"
lacks "  ...and the legacy store was used for nothing else" "${STATE}/pulls.log" "PULL ${NEW_STAG}@${D1} DOCKER_CONFIG=${ENVROOT}/docker-legacy"

echo "-- B5. pre-migration backup whose build is obtainable from nowhere"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
check "is refused" "$(run_restore staging)" "1"
contains "  ...saying the recorded build cannot be obtained" "${WORK}/restore.log" "cannot obtain the pre-migration build recorded with this backup"
contains "  ...and forbidding a rebuild as a substitute" "${WORK}/restore.log" "Do NOT rebuild"
check "  ...before any data service was started" "$(reached)" ""

echo "-- B6. a legacy digest that is NOT this backup's recorded build"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
printf '%s\n' "${OLD_STAG}@${D2}" >> "${STATE}/local.list"
check "is refused" "$(run_restore staging RESTORE_IMAGE="${OLD_STAG}@${D2}")" "1"
contains "  ...as outside the recorded pairing" "${WORK}/restore.log" "recognised ONLY to restore a backup with"
check "  ...before anything started" "$(reached)" ""

new_state; make_env staging; make_backup staging drill_staging "${NEW_STAG}@${D1}"
printf '%s\n' "${OLD_STAG}@${D1}" >> "${STATE}/local.list"
check "a legacy override on a CURRENT-channel backup is refused" \
  "$(run_restore staging RESTORE_IMAGE="${OLD_STAG}@${D1}")" "1"

echo "-- B7. the explicit operator override still works in the current channel"
new_state; make_env staging; make_backup staging drill_staging "${OLD_STAG}@${D1}"
printf '%s %s\n' "${NEW_STAG}@${D3}" "${ENVROOT}/docker" >> "${STATE}/registry.list"
check "passes the gate" "$(run_restore staging RESTORE_IMAGE="${NEW_STAG}@${D3}")" "97"
check "  ...with exactly the named build" "$(reached)" "${NEW_STAG}@${D3}"

echo "-- B8. every widening of the channel is refused"
for bad in \
  "${OLD_PROD}@${D1}" \
  "${NEW_PROD}@${D1}" \
  "ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging-evil@${D1}" \
  "ghcr.io/attacker/aau-payload-platform-staging@${D1}" \
  "ghcr.io/aau-university/aau-platform-staging-evil@${D1}" \
  "ghcr.io/attacker/aau-platform-staging@${D1}"; do
  new_state; make_env staging; make_backup staging drill_staging "$bad"
  printf '%s\n' "$bad" >> "${STATE}/local.list"
  check "staging refuses a recorded ${bad%@*}" "$(run_restore staging)" "1"
  contains "  ...as not the approved staging channel" "${WORK}/restore.log" "not the approved staging channel"
done
for bad in "${OLD_STAG}:latest" "${NEW_STAG}:latest"; do
  new_state; make_env staging; make_backup staging drill_staging "$bad"
  printf '%s\n' "$bad" >> "${STATE}/local.list"
  check "staging refuses a mutable ${bad}" "$(run_restore staging)" "1"
  contains "  ...as a mutable reference" "${WORK}/restore.log" "is a mutable reference"
done

echo "-- B9. production: the same contract, its own packages"
new_state; make_env production; make_backup production drill_production "${OLD_PROD}@${D1}"
printf '%s %s\n' "${NEW_PROD}@${D1}" "${ENVROOT}/docker" >> "${STATE}/registry.list"
check "a pre-migration production backup passes via its digest-identical copy" "$(run_restore production)" "97"
check "  ...running the current production channel" "$(reached)" "${NEW_PROD}@${D1}"
for bad in "${OLD_STAG}@${D1}" "${NEW_STAG}@${D1}" "ghcr.io/attacker/aau-platform@${D1}"; do
  new_state; make_env production; make_backup production drill_production "$bad"
  printf '%s\n' "$bad" >> "${STATE}/local.list"
  check "production refuses a recorded ${bad%@*}" "$(run_restore production)" "1"
done

echo "-- B10. cross-environment restore cannot use the legacy channel"
# production -> staging is the one legitimate cross-environment direction. Its
# recorded image is a production build, so the staging legacy channel can
# never be the backup's own pairing.
new_state; make_env staging; make_backup production drill_staging "${OLD_PROD}@${D1}"
printf '%s\n' "${OLD_STAG}@${D1}" >> "${STATE}/local.list"
check "a legacy staging image is refused for a production->staging restore" \
  "$(run_restore staging ALLOW_CROSS_ENVIRONMENT_RESTORE=I-UNDERSTAND-THIS-OVERWRITES-A-DIFFERENT-ENVIRONMENT \
      RESTORE_IMAGE="${OLD_STAG}@${D1}")" "1"
printf '%s %s\n' "${NEW_STAG}@${D2}" "${ENVROOT}/docker" >> "${STATE}/registry.list"
check "a current staging image is accepted for it" \
  "$(run_restore staging ALLOW_CROSS_ENVIRONMENT_RESTORE=I-UNDERSTAND-THIS-OVERWRITES-A-DIFFERENT-ENVIRONMENT \
      RESTORE_IMAGE="${NEW_STAG}@${D2}")" "97"
new_state; make_env production; make_backup staging drill_production "${NEW_STAG}@${D1}"
check "staging -> production stays refused with no override" \
  "$(run_restore production RESTORE_IMAGE="${NEW_PROD}@${D1}")" "1"

echo
printf '[image-channel-drill] %d passed, %d failed\n' "$pass" "$fail"
(( fail == 0 ))
