#!/usr/bin/env bash
# Restore a PostgreSQL + uploads backup produced by backup.sh.
#
# This is the *real* rollback path once a release has applied migrations.
# Rolling the Docker image back does not roll the database back.
#
# ── The ordering rule this script exists to enforce ───────────────────────
# Everything that can fail is done BEFORE anything is destroyed:
#
#   verify integrity -> prove the dump is readable -> obtain the matching image
#   -> prove the application cannot write -> extract uploads to a staging tree
#   -> [ DROP SCHEMA; pg_restore; swap uploads ] -> restart
#
# Only the bracketed section is destructive, and it is entered only once every
# fallible preparation step has already succeeded. The failure this ordering
# prevents is the worst one available here: a database rolled back to T1 while
# the uploads it belongs with are still at T2, because the archive turned out
# to be unreadable or the disk was full AFTER the schema was already gone.
#
# ── Fail closed on unverifiable backups ───────────────────────────────────
# A backup without MANIFEST, SHA256SUMS or metadata.json cannot be shown to be
# complete or to match any application build. Restoring one is a deliberate,
# dangerous act, so it requires an explicit opt-in rather than a warning that
# scrolls past at 3am. See ALLOW_UNVERIFIED_BACKUP below.
#
# Usage:
#   deploy/scripts/restore.sh /srv/aau/production/backups/20260816T010203Z
#   RESTORE_IMAGE=<ref> deploy/scripts/restore.sh <dir>   # explicit override
#   AAU_ENV=staging     deploy/scripts/restore.sh <dir>

set -euo pipefail

readonly LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")/lib" && pwd)"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${LIB}/oplock.sh"
# shellcheck source=deploy/scripts/lib/writers.sh
source "${LIB}/writers.sh"
# shellcheck source=deploy/scripts/read-env.sh
source "$(dirname "${BASH_SOURCE[0]}")/read-env.sh"

aau_env_resolve

readonly RESTORE_UPLOADS="${RESTORE_UPLOADS:-true}"

# The runtime identity of the runner image (`nextjs:nodejs`). The uploads tree
# must end up owned by it or the application cannot write its own media.
#
# Overridable for the same reason initialize-from-backup.sh makes it
# overridable, and it must stay the SAME concept in both: they install the same
# tree for the same container, so a drill that pins one and not the other ends
# up with a tree one script can read and the other cannot. Production never
# sets these -- it runs as root and takes the default.
readonly APP_UID="${APP_UID:-10001}"
readonly APP_GID="${APP_GID:-10001}"
# Restoring a backup that cannot be verified complete is a data-loss risk, so
# it is not a boolean: the operator has to type the acknowledgement.
readonly UNVERIFIED_ACK='I-ACCEPT-POSSIBLE-DATA-LOSS'
readonly ALLOW_UNVERIFIED_BACKUP="${ALLOW_UNVERIFIED_BACKUP:-}"

log() { printf '[restore] %s\n' "$*" >&2; }
fail() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail "usage: $0 <backup-directory>"
readonly SOURCE="$1"
readonly DUMP="${SOURCE}/postgres.dump"

[[ -d "$SOURCE" ]] || fail "no such backup directory: ${SOURCE}"
[[ -s "$DUMP" ]] || fail "missing or empty ${DUMP}"

[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

# ── Serialize against every other coherence-sensitive operation ───────────
oplock_acquire "$AAU_LOCK_FILE" "restore(${AAU_ENV})" \
  || fail "refusing to restore while another operation is running"

compose() {
  # APP_IMAGE is whatever this restore is targeting (set once RESTORE_IMAGE is
  # resolved) or the recorded release; compose needs a value to parse the file
  # at all, including for the data-services-only commands below.
  # Ports and the uploads path come from the environment descriptor, not from
  # the secrets file: they are deployment topology, not secrets, and they are
  # what keeps production and staging bound to different ports on one host.
  env \
    APP_IMAGE="${APP_IMAGE:-$(aau_state_image)}" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

# One admin psql call. Defined here rather than inline so the write freeze
# below reads as the sequence of steps it is.
psql_admin() {
  compose exec -T postgres-prod \
    psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc "$1"
}

# ALTER ROLE <app role> LOGIN | NOLOGIN.
#
# The write freeze is a LOGIN barrier, not a CONNECT revoke. `REVOKE CONNECT ON
# DATABASE ... FROM <app role>` does NOT stop the app role reconnecting:
# PostgreSQL grants CONNECT to PUBLIC by default and every role inherits PUBLIC,
# so the direct revoke leaves the effective privilege intact. Verified against
# the pinned postgres image -- the app role still opened a fresh TCP session
# after the revoke. `ALTER ROLE ... NOLOGIN` is the documented barrier: a role
# with rolcanlogin=false "cannot be used as the initial role for a client
# connection", regardless of PUBLIC grants or pg_hba, and PostgreSQL rejects the
# connection with FATAL "role is not permitted to log in".
#
# The role name is passed as a psql variable and quoted as an identifier by
# psql's :"var" interpolation. That interpolation only fires for SQL read from
# stdin, never for text concatenated into the command, so a hostile role name
# cannot break out -- verified: a value like 'x"; DROP ROLE ...' is treated as a
# single nonexistent identifier.
set_app_login() {
  printf 'ALTER ROLE :"role" %s;\n' "$1" \
    | compose exec -T postgres-prod \
        psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" \
          -v ON_ERROR_STOP=1 -v role="$APP_DB_USER" -Atq
}

# If this script dies while the app role is NOLOGIN, the application would be
# left permanently unable to log in -- an outage caused by the safety mechanism
# itself -- so re-enabling LOGIN is a trap, not a final line.
app_login_disabled=false
restore_app_login() {
  [[ "$app_login_disabled" == "true" ]] || return 0
  set_app_login LOGIN >/dev/null 2>&1 \
    || log "WARNING: could not restore LOGIN for ${APP_DB_USER}; run 'ALTER ROLE \"${APP_DB_USER}\" LOGIN' as ${POSTGRES_ADMIN_USER} before starting the app"
  app_login_disabled=false
}
trap restore_app_login EXIT

# A real TCP authentication attempt as the application role, over 127.0.0.1
# inside the postgres container so it goes through the host-based pg_hba rules
# the app itself uses -- not the local unix socket, whose rules can differ. The
# captured output lets the caller assert on the exact rejection rather than on a
# bare non-zero exit.
app_tcp_login_probe() {
  compose exec -T -e PGPASSWORD="$APP_DB_PASSWORD" postgres-prod \
    psql -h 127.0.0.1 -p 5432 -U "$APP_DB_USER" -d "$POSTGRES_DB" \
      -Atc "select 'APP_LOGIN_OK'" 2>&1 || true
}

POSTGRES_ADMIN_USER="$(require_env_var "$AAU_ENV_FILE" POSTGRES_ADMIN_USER)" \
  || fail "POSTGRES_ADMIN_USER missing from ${AAU_ENV_FILE}"
POSTGRES_DB="$(require_env_var "$AAU_ENV_FILE" POSTGRES_DB)" \
  || fail "POSTGRES_DB missing from ${AAU_ENV_FILE}"
APP_DB_USER="$(require_env_var "$AAU_ENV_FILE" APP_DB_USER)" \
  || fail "APP_DB_USER missing from ${AAU_ENV_FILE}"
# Needed to PROVE the freeze: a TCP login attempt as the app role must be
# rejected while the barrier is up and accepted again after it is lifted.
APP_DB_PASSWORD="$(require_env_var "$AAU_ENV_FILE" APP_DB_PASSWORD)" \
  || fail "APP_DB_PASSWORD missing from ${AAU_ENV_FILE}"
UPLOADS_PATH="$AAU_UPLOADS_PATH"

log "environment: ${AAU_ENV} (project ${AAU_PROJECT_NAME})"
log "uploads path: ${UPLOADS_PATH}"

#############################################################################
# PHASE 1 — verification. Nothing here touches production state.
#############################################################################

unverified_reasons=()

# 1.1 Manifest: every artifact the backup declared required must be present.
manifest="${SOURCE}/MANIFEST"
if [[ -f "$manifest" ]]; then
  missing=()
  while IFS= read -r required; do
    [[ -z "$required" ]] && continue
    [[ -s "${SOURCE}/${required}" ]] || missing+=("$required")
  done < "$manifest"
  if (( ${#missing[@]} > 0 )); then
    # Never opt-outable: the backup itself says these files are required, so
    # their absence is proven incompleteness, not merely unproven completeness.
    fail "backup is incomplete — required artifact(s) missing: ${missing[*]}
  This backup declared them in MANIFEST, so restoring would silently lose data.
  Use a complete backup."
  fi
  log "manifest satisfied ($(grep -c . "$manifest") required artifacts present)"
else
  unverified_reasons+=("MANIFEST is absent, so completeness cannot be established")
fi

# 1.2 Checksums. Deliberately NOT --ignore-missing: that option makes
#     `sha256sum --check` PASS when a listed file has been deleted (verified),
#     which is precisely the failure the manifest exists to catch.
if [[ -f "${SOURCE}/SHA256SUMS" ]]; then
  log "verifying backup checksums"
  (cd "$SOURCE" && sha256sum --check --status SHA256SUMS) \
    || fail "backup checksums do not match or a listed file is missing; refusing to restore"
else
  unverified_reasons+=("SHA256SUMS is absent, so the artifacts cannot be checked for corruption")
fi

metadata="${SOURCE}/metadata.json"
[[ -f "$metadata" ]] \
  || unverified_reasons+=("metadata.json is absent, so the matching application build is unknown")

# 1.3 The explicit dangerous opt-in.
if (( ${#unverified_reasons[@]} > 0 )); then
  if [[ "$ALLOW_UNVERIFIED_BACKUP" != "$UNVERIFIED_ACK" ]]; then
    printf '[restore] ERROR: this backup cannot be verified:\n' >&2
    printf '[restore]   - %s\n' "${unverified_reasons[@]}" >&2
    fail "refusing to drop the live schema for a backup whose completeness cannot be
  established. Legacy backups predating the integrity contract can still be
  restored, but only as a deliberate act:

      ALLOW_UNVERIFIED_BACKUP=${UNVERIFIED_ACK} \\
        deploy/scripts/restore.sh ${SOURCE}

  Take a fresh verified backup of the CURRENT state first — this operation is
  not reversible."
  fi
  log "WARNING: proceeding with an UNVERIFIED backup by explicit operator acknowledgement:"
  printf '[restore]   - %s\n' "${unverified_reasons[@]}" >&2
fi

# 1.4 Archive integrity. `tar --test` would pass on a corrupt or truncated
#     archive, so the whole stream is decompressed and every member read.
if [[ -f "${SOURCE}/uploads.tar.gz" ]]; then
  log "verifying the uploads archive (full decompress and read)"
  gzip --test "${SOURCE}/uploads.tar.gz" \
    || fail "uploads archive fails gzip integrity check; refusing to restore"
  tar --extract --gzip --file "${SOURCE}/uploads.tar.gz" --to-stdout > /dev/null \
    || fail "uploads archive is not fully readable; refusing to restore"
fi

# 1.5 Compatibility metadata.
recorded_image=""
recorded_revision=""
recorded_migrations=""
recorded_uploads=""
recorded_consistency=""
if [[ -f "$metadata" ]]; then
  recorded_image="$(sed -n 's/.*"app_image": *"\([^"]*\)".*/\1/p' "$metadata")"
  recorded_revision="$(sed -n 's/.*"image_revision": *"\([^"]*\)".*/\1/p' "$metadata")"
  recorded_migrations="$(sed -n 's/.*"applied_migrations": *"\([^"]*\)".*/\1/p' "$metadata")"
  recorded_uploads="$(sed -n 's/.*"uploads_included": *\([a-z]*\).*/\1/p' "$metadata")"
  recorded_consistency="$(sed -n 's/.*"consistency": *"\([^"]*\)".*/\1/p' "$metadata")"
  log "backup recorded image:      ${recorded_image:-<unknown>}"
  log "backup recorded revision:   ${recorded_revision:-<unknown>}"
  log "backup recorded migrations: ${recorded_migrations:-<none>}"
  log "backup includes uploads:    ${recorded_uploads:-<unknown>} (consistency: ${recorded_consistency:-<unknown>})"

  if [[ "$recorded_uploads" == "true" && ! -s "${SOURCE}/uploads.tar.gz" ]]; then
    fail "metadata says this restore point includes local uploads, but
  ${SOURCE}/uploads.tar.gz is missing. Refusing to restore the database
  without the media it belongs with."
  fi
fi

# 1.5a Cross-environment restore.
#
#      backup.sh has always RECORDED which environment a backup came from, and
#      restore.sh never read it. Nothing stopped a staging backup -- disposable
#      content, demo users, whatever a reset-and-full left behind ten minutes
#      earlier -- from being restored straight over production. The two paths
#      differ by one word.
#
#      The directions are NOT symmetric, so they are not treated the same:
#
#        staging -> production   never. There is no acknowledgement string for
#                                this. Production content cannot be recovered
#                                from a disposable environment, and an operator
#                                who believes otherwise has already lost it.
#
#        production -> staging   a legitimate operation ("refresh staging from
#                                production"), but never an accident: it needs
#                                the explicit acknowledgement below AND an
#                                explicit RESTORE_IMAGE, because the image
#                                recorded with a production backup belongs to
#                                the production channel and must not run here.
readonly CROSS_ENV_ACK='I-UNDERSTAND-THIS-OVERWRITES-A-DIFFERENT-ENVIRONMENT'
recorded_environment=""
recorded_database=""
if [[ -f "$metadata" ]]; then
  recorded_environment="$(sed -n 's/.*"environment": *"\([^"]*\)".*/\1/p' "$metadata")"
  recorded_database="$(sed -n 's/.*"database": *"\([^"]*\)".*/\1/p' "$metadata")"
fi

if [[ -z "$recorded_environment" ]]; then
  # Covered by the unverified-backup opt-in above; named explicitly so the
  # operator knows this specific check could not run.
  log "WARNING: this backup records no environment, so the cross-environment check cannot run"
else
  log "backup recorded environment: ${recorded_environment} (restoring into ${AAU_ENV})"

  if [[ "$recorded_environment" != "$AAU_ENV" ]]; then
    if aau_env_is_production; then
      fail "REFUSING: this backup was taken from '${recorded_environment}' and the target is
  production. A non-production backup carries non-production content -- seeded
  demo data, test users, whatever the last reset left behind -- and restoring it
  over production is data loss dressed up as recovery.

  There is no override for this direction. If production genuinely needs to be
  rolled back, restore a PRODUCTION backup."
    fi

    if [[ "${ALLOW_CROSS_ENVIRONMENT_RESTORE:-}" != "$CROSS_ENV_ACK" ]]; then
      fail "REFUSING: this backup was taken from '${recorded_environment}' and the target is
  '${AAU_ENV}'. Restoring across environments is deliberate, not routine.

  To refresh ${AAU_ENV} from ${recorded_environment}, re-run with:

      ALLOW_CROSS_ENVIRONMENT_RESTORE=${CROSS_ENV_ACK} \\
      RESTORE_IMAGE=<a ${AAU_ENV}-channel image> \\
        deploy/scripts/restore.sh ${SOURCE}"
    fi

    [[ -n "${RESTORE_IMAGE:-}" ]] || fail "a cross-environment restore requires an explicit RESTORE_IMAGE for the
  ${AAU_ENV} channel; the image recorded with this backup is a
  ${recorded_environment} artifact and must not run here."

    log "WARNING: cross-environment restore acknowledged: ${recorded_environment} -> ${AAU_ENV}"
  fi
fi

# 1.5b Database identity.
#      One host, two stacks, two databases. A backup of the wrong database
#      passes every checksum in this script and still destroys the right one.
if [[ -n "$recorded_database" && "$recorded_database" != "$POSTGRES_DB" ]]; then
  fail "REFUSING: this backup is of database '${recorded_database}', but this environment's
  database is '${POSTGRES_DB}'. Restoring one database's contents into another
  is not a recovery operation.

  If the database was deliberately renamed, take a fresh backup under the new
  name rather than overriding this."
fi

# 1.6 Pair the schema with the application build that matches it.
#     Deliberately NOT whatever APP_IMAGE happens to be around — after a failed
#     deploy that is exactly the build that must not run.
RESTORE_IMAGE="${RESTORE_IMAGE:-$recorded_image}"

# ── 1.6-baseline: the imported-baseline restore point ─────────────────────
#
# There is exactly one legitimate state in which a backup pairs with NO
# application image, and it is the one the first production launch passes
# through:
#
#   initialize-from-backup.sh founds the environment from the final accepted
#   staging platform backup. It deliberately writes no release-state file --
#   no release has been deployed -- and starts no app container. The database,
#   the users and the uploads are real; the application is absent.
#
#   The FIRST deployment then takes a pre-cutover backup of that dataset.
#   backup.sh looks for a release identity in the release-state file and in the
#   running app-prod container, finds neither, and records app_image: "". That
#   is not a defect: there genuinely is no previous release to name.
#
#   If that first candidate then fails AFTER moving the schema, deploy.sh
#   correctly refuses to start anything and points at restore.sh -- which,
#   until this branch existed, refused the only restore point that exists,
#   because it could not be handed an image that never existed.
#
# The correct recovery is NOT to substitute the incoming release as the
# "previous image". That image is the one whose migrations just ran and whose
# health gate just failed; starting it against the pre-migration schema pairs a
# build with a database it has already been shown not to work against, and
# writes it into the release-state file as this environment's release identity.
#
# The correct recovery is to return the environment to the state the backup
# actually describes: the accepted baseline, with NO release deployed. That is
# a data-only restore -- database and uploads -- after which nothing serves,
# exactly as immediately after initialize-from-backup.sh. The operator then
# re-runs the first deployment, which is the same first deployment as before.
#
# This mode is entered only when the system's own state agrees that no release
# has ever been deployed here. Every one of these must hold:
#
#   * the backup records no application image (nothing to pair with), and
#   * no RESTORE_IMAGE was supplied (the operator is not naming one), and
#   * there is no release-state file (no release was ever promoted), and
#   * no app-prod container exists at all (not merely stopped).
#
# If a release-state file DOES exist, this is not a virgin environment and a
# backup with no recorded image is a bookkeeping failure, not a baseline: the
# refusal below still applies, and the operator must name the image.
BASELINE_RECOVERY=false
if [[ -z "$RESTORE_IMAGE" ]]; then
  # `docker ps -a` failing must not read as "no containers": that would turn an
  # unobservable host into a baseline recovery on an environment that may well
  # have a release. Fail closed by treating an unreadable state as "present".
  if existing_app_containers="$(docker ps -a \
        --filter "label=com.docker.compose.project=${AAU_PROJECT_NAME}" \
        --filter "label=com.docker.compose.service=app-prod" \
        --format '{{.Names}}' 2>/dev/null)"; then
    :
  else
    existing_app_containers="<unreadable>"
  fi

  if [[ ! -e "$AAU_STATE_FILE" && -z "$existing_app_containers" ]]; then
    BASELINE_RECOVERY=true
  fi
fi

if [[ "$BASELINE_RECOVERY" == "true" ]]; then
  log "=================================================================="
  log "BASELINE RECOVERY: this backup records no application image, this"
  log "environment has no release-state file and no app-prod container has"
  log "ever been created here. That is the imported-baseline state:"
  log "founded from an accepted platform backup, never yet released."
  log ""
  log "The database and uploads will be returned to this restore point and"
  log "NOTHING will be started. No release identity is invented, and no"
  log "release-state file is written. After this completes the environment"
  log "is exactly as initialize-from-backup.sh left it, and the next step"
  log "is the first ${AAU_ENV} deployment."
  log "=================================================================="
  # compose parses the whole file for every subcommand and APP_IMAGE has no
  # default, so the data-services commands below need a value. This one is
  # never started: PHASE 5 skips `compose up app-prod` entirely in this mode.
  RESTORE_IMAGE='aau-compose-parse-only:no-release-recorded'
fi

if [[ -z "$RESTORE_IMAGE" ]]; then
  fail "no application image recorded with this backup and no RESTORE_IMAGE override given;
  restoring the schema without the matching build would leave production running
  code that does not match the database. Re-run with RESTORE_IMAGE=<ref>.

  Backup retention and IMAGE retention are ONE recovery contract: a retained
  backup whose image has been pruned from the host and the registry is not a
  restore point. See deploy/README.md."
fi
# 1.6a The release must belong to THIS environment's channel, matched by EXACT
#      repository identity -- the same boundary deploy-entrypoint.sh enforces.
#
#      A suffix heuristic (reject `*-staging` in production; require it in
#      staging) is NOT a release boundary: `ghcr.io/attacker/aau-platform`
#      passes the production test, and `ghcr.io/attacker/anything-staging` passes
#      the staging test. The trust boundary is the exact package published by
#      build-publish.yml, so the reference must equal it exactly. The CURRENT
#      constants MUST match deploy-entrypoint.sh's EXPECTED_REPO.
#
#      Scoped to ghcr.io references, because that is the only registry whose
#      naming this contract governs; local and test registries are unaffected.
#
# ── The GHCR channel migration (see deploy/GHCR_CHANNEL_MIGRATION.md) ─────
# The packages moved when the repository moved to aau-university/aau-platform.
# Backups taken before that move record, in metadata.json, the COMPLETE image
# reference of the build they pair with -- under the old namespace. That record
# is history and is never rewritten.
#
# So exactly one LEGACY package per environment is still recognised, and only
# for recovery, never for deployment:
#
#   * it is the same environment's pre-migration package, matched exactly
#     (never another owner, never the other environment's package);
#   * it is accepted ONLY when RESTORE_IMAGE is byte-for-byte the image this
#     backup recorded -- i.e. the backup's own pairing. An operator cannot name
#     an arbitrary historical digest from the old package; and a cross-
#     environment restore, whose recorded image is by definition someone
#     else's, cannot use the legacy channel at all;
#   * the build is then obtained by digest, so whatever is started IS the
#     recorded build (see 1.6b). No rebuild is ever assumed to be equivalent.
readonly CURRENT_CHANNEL_PRODUCTION="ghcr.io/aau-university/aau-platform"
readonly CURRENT_CHANNEL_STAGING="ghcr.io/aau-university/aau-platform-staging"
readonly LEGACY_CHANNEL_PRODUCTION="ghcr.io/mohammed7779948484-tech/aau-payload-platform"
readonly LEGACY_CHANNEL_STAGING="ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging"

LEGACY_PAIRING=false
if [[ "$RESTORE_IMAGE" == ghcr.io/* ]]; then
  restore_repository="${RESTORE_IMAGE%%@*}"
  restore_repository="${restore_repository%%:*}"
  case "$AAU_ENV" in
    production)
      expected_restore_repo="$CURRENT_CHANNEL_PRODUCTION"
      legacy_restore_repo="$LEGACY_CHANNEL_PRODUCTION" ;;
    staging)
      expected_restore_repo="$CURRENT_CHANNEL_STAGING"
      legacy_restore_repo="$LEGACY_CHANNEL_STAGING" ;;
    *)
      fail "no known GHCR channel for environment '${AAU_ENV}'; refusing to authorize a ghcr.io restore image" ;;
  esac

  # Immutable, or not at all. The repository test below would also be
  # satisfied by `${expected_restore_repo}:latest`, which names whatever that
  # tag points at today -- and this value is exported as APP_IMAGE, started,
  # and written to the release-state file as this environment's release
  # identity. A restore that cannot say which exact build now pairs with the
  # restored schema has not restored a known state.
  #
  # Scoped to ghcr.io with the rest of this gate: the local and test registries
  # this contract does not govern push tags deliberately, and the real host
  # pulls the release channel and nothing else.
  [[ "$RESTORE_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]] \
    || fail "REFUSING: ${RESTORE_IMAGE} is a mutable reference.
  A ${AAU_ENV} release must be restored by immutable digest —
  ${expected_restore_repo}@sha256:<64 hex> — because a tag names whatever it
  points at today, and this reference becomes the recorded release identity."

  if [[ "$restore_repository" == "$expected_restore_repo" ]]; then
    :
  elif [[ "$restore_repository" == "$legacy_restore_repo" ]]; then
    [[ -n "$recorded_image" && "$RESTORE_IMAGE" == "$recorded_image" ]] \
      || fail "REFUSING: ${RESTORE_IMAGE} is in the pre-migration ${AAU_ENV} package
  (${legacy_restore_repo}), which is recognised ONLY to restore a backup with
  the exact build that backup recorded.
  this backup recorded: ${recorded_image:-<nothing>}
  requested:            ${RESTORE_IMAGE}
  Restore this backup with its own recorded image, or name a build in the
  current ${AAU_ENV} channel: ${expected_restore_repo}@sha256:<64 hex>."
    LEGACY_PAIRING=true
    log "this backup pairs with a pre-migration ${AAU_ENV} build: ${RESTORE_IMAGE}"
  else
    fail "REFUSING: ${RESTORE_IMAGE} is not the approved ${AAU_ENV} channel.
  expected repository: ${expected_restore_repo}
  got:                 ${restore_repository}
  A staging artifact is never a production artifact, and vice versa; and a
  third-party repository is never either. Pass a ${AAU_ENV}-channel image via
  RESTORE_IMAGE."
  fi
fi

# 1.6b Obtain the exact build.
#
#      Current channel: the local image, else a pull with this environment's
#      own credential store -- unchanged from before the migration.
#
#      Legacy pairing: the recorded DIGEST is the identity, not the old
#      repository name. Three sources, in order, each of which can only yield
#      the build with that digest (a pull by digest is verified by the registry
#      client against the content address, and the result is then re-checked
#      against the image's RepoDigests):
#
#        1. the same digest in the CURRENT package -- a digest-preserving copy
#           made by an operator before the old namespace is retired. Preferred:
#           it is the path that survives revoking the old credentials, and the
#           release-state file then records a current-channel reference.
#        2. the recorded reference already present on this host. A cache is
#           not a retention policy, so this is never the only path offered.
#        3. a pull of the recorded reference through a SEPARATE, root-only,
#           per-environment legacy credential store (AAU_LEGACY_DOCKER_CONFIG),
#           used for this one pull and for nothing else. It exists only while
#           the old namespace is kept readable for recovery.
#
#      If none yields the build, the restore refuses before anything is
#      touched: the backup is intact, but its pairing cannot be honoured.

# True when the local image <ref> lists exactly <ref> among its RepoDigests,
# i.e. it really is that digest in that repository.
image_has_repo_digest() {
  local ref="$1" listed
  while IFS= read -r listed; do
    [[ "$listed" == "$ref" ]] && return 0
  done < <(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ref" 2>/dev/null)
  return 1
}

if [[ "$BASELINE_RECOVERY" != "true" && "$LEGACY_PAIRING" == "true" ]]; then
  legacy_digest="${RESTORE_IMAGE##*@}"
  mirrored_image="${expected_restore_repo}@${legacy_digest}"
  legacy_sources_tried=()

  if docker pull "$mirrored_image" >/dev/null 2>&1 \
      && image_has_repo_digest "$mirrored_image"; then
    log "using the digest-identical copy in the current ${AAU_ENV} channel: ${mirrored_image}"
    log "  (this backup recorded ${RESTORE_IMAGE}; same content address)"
    RESTORE_IMAGE="$mirrored_image"
  else
    legacy_sources_tried+=("current-channel copy ${mirrored_image}: not obtainable")
    if image_has_repo_digest "$RESTORE_IMAGE"; then
      log "using the recorded pre-migration build already present on this host"
    else
      legacy_sources_tried+=("recorded build on this host: not present")
      if [[ -d "$AAU_LEGACY_DOCKER_CONFIG" ]] \
          && DOCKER_CONFIG="$AAU_LEGACY_DOCKER_CONFIG" docker pull "$RESTORE_IMAGE" >/dev/null \
          && image_has_repo_digest "$RESTORE_IMAGE"; then
        log "pulled the recorded pre-migration build through ${AAU_LEGACY_DOCKER_CONFIG}"
      else
        legacy_sources_tried+=("legacy credential store ${AAU_LEGACY_DOCKER_CONFIG}: absent or pull failed")
        printf '[restore]   - %s\n' "${legacy_sources_tried[@]}" >&2
        fail "cannot obtain the pre-migration build recorded with this backup: ${RESTORE_IMAGE}

  The backup is intact, but none of the three sources for its paired build
  yielded that exact digest (listed above). Nothing has been touched.

  Make ${mirrored_image} available (a digest-preserving copy into the current
  ${AAU_ENV} package), or provide read access to the old package through
  ${AAU_LEGACY_DOCKER_CONFIG}. Do NOT rebuild and do NOT edit metadata.json:
  a rebuild is a different build. See deploy/GHCR_CHANNEL_MIGRATION.md."
      fi
    fi
  fi
fi

# From here on every compose call is for this restore's target release.
export APP_IMAGE="$RESTORE_IMAGE"
if [[ "$BASELINE_RECOVERY" == "true" ]]; then
  log "no application image to obtain: this is a baseline recovery"
else
log "restoring with application image ${RESTORE_IMAGE}"
docker image inspect "$RESTORE_IMAGE" >/dev/null 2>&1 \
  || docker pull "$RESTORE_IMAGE" >/dev/null \
  || fail "cannot obtain the application image recorded with this backup: ${RESTORE_IMAGE}

  The backup is intact but its paired application build is gone from both this
  host and the registry, so the database cannot be returned to a state any
  running code understands. This is the backup/image retention contract
  failing, not a transient error."
fi

# 1.7 The database services must be up for the remaining verification and for
#     the restore itself. This starts ONLY the data services, never the app.
log "starting the data services"
compose up --detach --wait postgres-prod redis-prod >/dev/null

# 1.8 Prove the dump is readable BEFORE the live schema is dropped. Without
#     this a corrupt dump is discovered only after `DROP SCHEMA` has already
#     destroyed the data it was supposed to replace.
log "verifying the dump is readable by pg_restore (before any destructive work)"
# `|| true` discarded the verification's own verdict. pg_restore can emit some
# table-of-contents entries and THEN fail, which left `toc` non-empty, passed
# both checks below, and deferred the discovery to the destructive restore —
# after DROP SCHEMA had already removed the data this dump was to replace.
if ! toc="$(compose exec -T postgres-prod pg_restore --list < "$DUMP" 2>&1)"; then
  fail "the dump failed pg_restore verification; refusing to drop the live schema.
  The live database has NOT been touched. pg_restore said:
${toc}"
fi
[[ -n "$toc" ]] \
  || fail "the dump is not readable by pg_restore; refusing to drop the live schema.
  The live database has NOT been touched."
entries="$(printf '%s\n' "$toc" | grep -c ';' || true)"
[[ "${entries:-0}" -gt 0 ]] \
  || fail "the dump's table of contents is empty; refusing to drop the live schema.
  The live database has NOT been touched."
log "dump verified readable (${entries} archive entries)"

#############################################################################
# PHASE 2 — prove the application cannot write.
#############################################################################

# Every service that can write, not just the one that usually is: app-prod,
# app-candidate, and one-off Seed containers. writers_freeze (shared with
# backup.sh so the definition of "frozen" cannot drift between the two) stops
# them all and PROVES none is active -- including a crash-looping `restarting`
# container that `compose ps --status running` would miss. The data services
# stay up; the restore runs through them.
log "stopping every application container"
if ! writers_freeze "$AAU_PROJECT_NAME" compose; then
  fail "application containers are STILL ACTIVE after being stopped (see above).
  Refusing to drop the schema underneath them: they would keep writing into a
  database being replaced, and the result would be neither the backup nor the
  current state. A container in 'restarting' is not idle -- it is reconnecting
  on a loop. Investigate manually."
fi
log "all application containers confirmed stopped"

# ── Close the door before counting who is inside ──────────────────────────
# Terminating sessions and then checking that none remain is a time-of-check /
# time-of-use race: anything holding the credentials can reconnect in the gap,
# and `restart: unless-stopped` guarantees something will try. Disabling LOGIN
# on the app role first is what makes the count meaningful, because a terminated
# session cannot come back and a fresh one cannot be opened.
#
# This is deliberately NOT `REVOKE CONNECT`: CONNECT is granted to PUBLIC by
# default and the role inherits it, so a revoke does not actually close the door
# (proven against the pinned image). NOLOGIN does. `restore_app_login` (trapped
# on EXIT) re-enables it.
log "disabling LOGIN on ${APP_DB_USER} so no application session can reconnect during the restore"
set_app_login NOLOGIN >/dev/null \
  || fail "could not disable LOGIN for ${APP_DB_USER}; refusing to restore without a
  guaranteed write freeze."
app_login_disabled=true

log "terminating any remaining ${APP_DB_USER} sessions"
psql_admin "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = current_database() AND usename = '${APP_DB_USER}' AND pid <> pg_backend_pid()" \
  >/dev/null 2>&1 || true

# Count EVERY other client session on this database, not only the app role. A
# restore is not safe merely because the application is quiet: an operator's
# psql, a forgotten migration shell or a monitoring agent connected as another
# role can write just as effectively, and none of them were counted before.
# Retried, not sampled once. The postgres healthcheck runs `pg_isready` on a
# timer, and an in-flight probe is briefly a client backend of its own. A
# single sample would therefore fail the restore at random, which is its own
# kind of unsafe: an operator who has seen a safety check fire spuriously
# starts working around it. A session that is genuinely holding the database
# open does not disappear between attempts; a probe does.
remaining=""
for _ in $(seq 1 20); do
  remaining="$(psql_admin "SELECT count(*) FROM pg_stat_activity
   WHERE datname = current_database() AND pid <> pg_backend_pid()
     AND backend_type = 'client backend'" 2>/dev/null || echo "")"
  [[ "${remaining//[[:space:]]/}" == "0" ]] && break
  sleep 0.5
done
[[ -n "${remaining//[[:space:]]/}" ]] \
  || fail "could not query pg_stat_activity to prove no sessions remain; refusing to restore"
[[ "$remaining" -eq 0 ]] || {
  offenders="$(psql_admin "SELECT usename || '@' || coalesce(host(client_addr)::text, 'local') ||
     ' (' || coalesce(application_name, '?') || ')'
   FROM pg_stat_activity
   WHERE datname = current_database() AND pid <> pg_backend_pid()
     AND backend_type = 'client backend'" 2>/dev/null || true)"
  fail "${remaining} client session(s) are still connected to ${POSTGRES_DB} after
  termination was requested:

${offenders}

  Something outside this stack is holding a connection that could write while
  the schema is being replaced. Refusing to drop the schema."
}
log "no client database sessions remain"

# ── PROVE the barrier, do not assume it ───────────────────────────────────
# An empty session count proves nothing about whether the app role can open a
# NEW session -- that is exactly the reconnect race. Attempt a real TCP login
# as the app role, the same way the application connects, and require it to be
# refused with the login-barrier rejection. Anything else (a success, or a
# different failure such as postgres being unreachable) fails the restore
# closed: we do not drop the schema on an unproven freeze.
freeze_probe="$(app_tcp_login_probe)"
case "$freeze_probe" in
  *"not permitted to log in"*)
    log "verified: a fresh TCP login as ${APP_DB_USER} is refused -- writes are frozen" ;;
  *APP_LOGIN_OK*)
    fail "the write freeze did NOT hold: a fresh TCP login as ${APP_DB_USER} SUCCEEDED
  after LOGIN was supposedly disabled. Refusing to drop the schema." ;;
  *)
    fail "could not prove the write freeze: a TCP login as ${APP_DB_USER} neither
  succeeded nor returned the expected login-barrier rejection. Got:

${freeze_probe}

  Refusing to drop the schema on an unproven freeze." ;;
esac

#############################################################################
# PHASE 3 — stage the uploads. Still non-destructive: the live tree is
# untouched and every expensive/fallible step happens here, not after the
# database has been dropped.
#############################################################################

staging=""
uploads_will_restore=false
if [[ "$RESTORE_UPLOADS" == "true" && -f "${SOURCE}/uploads.tar.gz" ]]; then
  uploads_will_restore=true
  staging="${UPLOADS_PATH}.restore.$$"
  rm -rf "$staging"
  mkdir -p "$staging"

  # Space preflight. The staged copy exists alongside the live tree, so the
  # filesystem must hold both at once. This is a guard against the obvious
  # failure, NOT a guarantee: the archive's uncompressed size is an estimate,
  # other processes are writing to the same filesystem concurrently, and
  # filesystem overhead is not modelled. It fails closed when it can see a
  # problem and stays quiet when it cannot.
  needed_kb="$(gzip --list "${SOURCE}/uploads.tar.gz" 2>/dev/null | awk 'NR==2 {print int($2/1024)+1}' || true)"
  avail_kb="$(df -Pk "$(dirname "$UPLOADS_PATH")" 2>/dev/null | awk 'NR==2 {print $4}' || true)"
  if [[ -n "${needed_kb//[[:space:]]/}" && -n "${avail_kb//[[:space:]]/}" ]]; then
    # gzip --list reports the size modulo 2^32 for archives over 4 GiB, so a
    # small figure is not trustworthy on a large archive; only act on a clear
    # shortfall and say what the check does not cover.
    if (( avail_kb < needed_kb )); then
      rm -rf "$staging"
      fail "not enough free space on $(dirname "$UPLOADS_PATH") to stage the uploads restore:
  need ~${needed_kb} KiB for the staged copy, ${avail_kb} KiB available.
  Free space and retry. The live database and uploads have NOT been touched."
    fi
    log "space preflight: ~${needed_kb} KiB needed, ${avail_kb} KiB available"
  else
    log "WARNING: could not measure required or available space; continuing without a preflight"
  fi

  log "extracting uploads into a staging tree (live uploads untouched)"
  if ! tar --extract --gzip --file "${SOURCE}/uploads.tar.gz" --directory "$staging"; then
    rm -rf "$staging"
    fail "failed to extract the uploads archive into staging.
  Nothing was destroyed: the live uploads and the live database are unchanged."
  fi

  # The runner image runs as UID:GID ${APP_UID}:${APP_GID}. Set
  # ownership on the staged tree so the swapped-in directory is already correct
  # — doing it here rather than after the swap keeps the destructive section
  # short.
  #
  # This FAILS CLOSED, and it verifies rather than trusting the exit code.
  # It used to log a warning and carry on, which meant a restore could report
  # complete success and leave the application unable to read or write its own
  # media — a failure nobody discovers until a page renders without images,
  # long after the restore looks finished. We are still in the non-destructive
  # staging phase here, so refusing costs nothing: the live uploads and the
  # live database are both untouched.
  #
  # On the VPS this script runs as root, so the direct chown succeeds and the
  # sudo fallback is never reached — it is inert in production. The fallback
  # exists only so the recovery drills, which invoke restore.sh as an
  # unprivileged CI user, can still establish ownership to a UID/GID that are
  # not their own (the hosted runner grants passwordless sudo). Either way the
  # `find` check below is the real gate and still fails closed.
  chown -R "${APP_UID}:${APP_GID}" "$staging" 2>/dev/null \
    || sudo chown -R "${APP_UID}:${APP_GID}" "$staging" 2>/dev/null || true

  # `chown -R` can fail partway and still exit 0 on some filesystems, so verify
  # BOTH halves of the runtime identity directly. A correct UID with the wrong
  # primary GID is still an ownership-contract failure.
  #
  # The status of `find` is CAPTURED, not discarded. This was
  # `find ... 2>/dev/null | head -5`, and under `set -euo pipefail` a `find`
  # that cannot descend into a subdirectory exits non-zero, fails the pipeline,
  # fails the assignment, and kills the script — with its own stderr sent to
  # /dev/null and no message of its own. A restore that aborts in the staging
  # phase saying NOTHING is the worst possible shape for this script: the
  # operator sees it stop after "extracting uploads" and has no idea whether
  # anything was destroyed. (Nothing was: this is still the non-destructive
  # phase. But the output has to say so.)
  owner_probe_rc=0
  wrong_owner="$(find "$staging" \( ! -uid "$APP_UID" -o ! -gid "$APP_GID" \) -printf '%p\n' 2>&1)" \
    || owner_probe_rc=$?
  if (( owner_probe_rc != 0 )); then
    fail "could not enumerate the staged uploads to verify their ownership:

$(printf '    %s\n' "$wrong_owner" | head -10)

  The ownership contract was NOT checked, so this restore stops here.
  Nothing has been destroyed: the live uploads and the live database are
  unchanged, and the staged copy is at ${staging}."
  fi
  wrong_owner="$(printf '%s\n' "$wrong_owner" | head -5)"
  if [[ -n "${wrong_owner//[[:space:]]/}" ]]; then
    fail "could not give the staged uploads UID:GID ${APP_UID}:${APP_GID}, which is the runtime
  identity of the runner image. Restoring them with either half wrong would
  violate the host ownership boundary and could leave the application unable
  to read or write its own media while the restore still reported success.
  Examples:

$(printf '    %s\n' $wrong_owner)

  Nothing was destroyed: the live uploads and the live database are unchanged.
  Re-run the restore as root, or on a filesystem that supports ownership."
  fi

  staged_members="$(find "$staging" -mindepth 1 | wc -l)"
  log "uploads staged and verified (${staged_members} entries)"
elif [[ "$RESTORE_UPLOADS" == "true" && "$recorded_uploads" == "true" ]]; then
  fail "uploads archive disappeared between verification and staging"
fi

#############################################################################
# PHASE 4 — the destructive critical section. Everything fallible is done.
#############################################################################

log "=== entering the destructive section ==="

log "recreating the public schema"
compose exec -T postgres-prod \
  psql --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<-EOSQL
	DROP SCHEMA IF EXISTS public CASCADE;
	CREATE SCHEMA public;
	ALTER SCHEMA public OWNER TO "${APP_DB_USER}";
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

log "restoring ${DUMP}"
compose exec -T postgres-prod \
  pg_restore --no-owner --role "$APP_DB_USER" \
  --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" --exit-on-error \
  < "$DUMP" || fail "pg_restore failed AFTER the schema was dropped.
  The database is now EMPTY OR PARTIAL. The dump was verified readable before
  this point, so this is an unexpected failure — do not start the application.
  Investigate, then re-run this restore."

if [[ "$uploads_will_restore" == "true" ]]; then
  # Reproduce the snapshot, do NOT overlay. A plain `tar --extract` into the
  # live tree re-adds the backed-up files but leaves any file created AFTER the
  # backup in place — so restoring a backup of {A} onto {A,B} would wrongly
  # yield {A,B}. The restore point must be exactly what the backup captured.
  log "swapping the staged uploads into ${UPLOADS_PATH}"
  previous="${UPLOADS_PATH}.previous.$$"
  rm -rf "$previous"
  mkdir -p "$UPLOADS_PATH"

  # Rename pair on one filesystem. The window between the two renames is the
  # dangerous one: if the second fails, the live path does not exist. That is
  # handled explicitly below rather than being left to a fallback branch that
  # assumes the live path is still there.
  if mv "$UPLOADS_PATH" "$previous" 2>/dev/null; then
    if mv "$staging" "$UPLOADS_PATH" 2>/dev/null; then
      # The previous tree is the uploads that were live before this restore; a
      # prior restore may have made it owned by UID 10001. On the VPS this script
      # runs as root and the direct rm removes it; the sudo fallback exists only
      # so the recovery drills, invoked as an unprivileged CI user, can remove a
      # 10001-owned previous tree. Best-effort: a lingering .previous is harmless.
      rm -rf "$previous" 2>/dev/null || sudo rm -rf "$previous" 2>/dev/null || true
      log "uploads swapped"
    else
      # SECOND RENAME FAILED. The live path is currently missing. Put the
      # original tree back before doing anything else — an uploads tree that has
      # merely not been rolled back is recoverable; one that has vanished is not.
      if mv "$previous" "$UPLOADS_PATH" 2>/dev/null; then
        rm -rf "$staging"
        fail "could not move the staged uploads into place, so the ORIGINAL uploads
  tree was restored to ${UPLOADS_PATH}. The database HAS been rolled back to the
  backup but the uploads have NOT — re-run this restore once the cause is fixed.
  Do not start the application until they agree."
      fi
      fail "CRITICAL: could not move the staged uploads into place AND could not put the
  original tree back. The uploads are at:
      ${previous}   (the tree that was live before this restore)
      ${staging}    (the tree from the backup)
  Move one of them to ${UPLOADS_PATH} manually. Nothing has been deleted."
    fi
  else
    # UPLOADS_PATH could not be renamed at all — typically because it is itself
    # a mount point. Nothing has moved yet, so replacing its contents in place
    # is safe here in a way it would not be after a half-completed rename.
    log "rename swap unavailable (uploads path may be a mount point) — copying onto the live filesystem first"
    # ORDER MATTERS, and it used to be wrong here.
    #
    # This branch is reached exactly when UPLOADS_PATH could not be renamed —
    # typically because it IS a mount point. $staging is a sibling of it, so
    # $staging is on the PARENT filesystem. The old sequence deleted the live
    # tree and only then moved $staging in, which is a cross-filesystem COPY:
    # the fallible step ran after the destructive one, so a full uploads volume
    # or a permissions problem left the tree empty or half-populated. Neither
    # `find` status was inspected, so `set -e` aborted with a bare find error
    # and the operator was told nothing about which state they were in.
    #
    # So: copy INSIDE the mount first (fallible, while the live tree is still
    # intact), then delete, then move within one filesystem (atomic renames).
    incoming="${UPLOADS_PATH}/.incoming.$$"
    rm -rf "$incoming"
    mkdir -p "$incoming" || fail "could not create ${incoming}; the live uploads tree is UNCHANGED.
  The database HAS been rolled back to the backup — do not start the application
  until they agree. The tree from the backup is at ${staging}."
    if ! cp -a "$staging/." "$incoming/"; then
      rm -rf "$incoming"
      fail "could not copy the staged uploads onto ${UPLOADS_PATH} (out of space on the
  uploads volume, or permissions). The live uploads tree is UNCHANGED. The
  database HAS been rolled back to the backup — do not start the application
  until they agree. The tree from the backup is at ${staging}."
    fi
    # Everything fallible has now succeeded, and the replacement is sitting on
    # the destination filesystem. Only now is anything deleted.
    find "$UPLOADS_PATH" -mindepth 1 -maxdepth 1 ! -name ".incoming.$$" -exec rm -rf {} + \
      || fail "could not clear ${UPLOADS_PATH}. The replacement tree is intact at
      ${incoming}
  and the previous contents may be partially deleted. Move the replacement into
  place manually; do not start the application until you have."
    find "$incoming" -mindepth 1 -maxdepth 1 -exec mv -t "$UPLOADS_PATH" {} + \
      || fail "CRITICAL: could not move the copied uploads into place. They are complete
  and intact at:
      ${incoming}
  Move its contents up one level into ${UPLOADS_PATH} manually. Nothing from the
  backup has been lost."
    rmdir "$incoming" 2>/dev/null || true
    rm -rf "$staging"
    log "uploads contents replaced"
  fi
fi

log "=== destructive section complete ==="

#############################################################################
# PHASE 5 — bring the paired build back up.
#############################################################################

# Lift the write freeze BEFORE starting the app. The trap is the safety net for
# an abnormal exit; on the normal path LOGIN has to be back in place first, or
# app-prod would come up and be refused at every connection.
restore_app_login
# Prove the barrier is actually gone before we hand the port back to the app.
# A restore that leaves the app role NOLOGIN would present as a healthy restore
# whose application then cannot reach its own database.
reconnect_probe="$(app_tcp_login_probe)"
case "$reconnect_probe" in
  *APP_LOGIN_OK*)
    log "verified: ${APP_DB_USER} can log in again" ;;
  *)
    fail "restore finished but ${APP_DB_USER} still cannot log in over TCP:

${reconnect_probe}

  The database was restored; re-enable the role before starting the app with
  'ALTER ROLE \"${APP_DB_USER}\" LOGIN' as ${POSTGRES_ADMIN_USER}." ;;
esac
if [[ "$BASELINE_RECOVERY" == "true" ]]; then
  # Nothing is started, and no release identity is written. The environment is
  # being returned to "founded, never released", so a release-state file here
  # would be a lie the NEXT deployment would act on: deploy.sh reads it as the
  # previous known-good release and would restart it on a recoverable failure.
  #
  # Prove the end state rather than assume it. The failed candidate was stopped
  # by deploy.sh before it pointed here, but a restore must not report a clean
  # baseline while a container from the failed attempt is still active.
  # Repeated `--filter label=` arguments are AND-ed by docker, so asking for
  # service=app-prod AND service=app-candidate in one call matches nothing and
  # would always report a clean baseline. Query each service separately.
  baseline_leftover=""
  for app_service in app-prod app-candidate; do
    if service_rows="$(docker ps --all \
          --filter "label=com.docker.compose.project=${AAU_PROJECT_NAME}" \
          --filter "label=com.docker.compose.service=${app_service}" \
          --format '{{.State}} {{.Names}}' 2>/dev/null)"; then
      while IFS= read -r service_row; do
        [[ -n "$service_row" ]] || continue
        case "${service_row%% *}" in
          running|restarting|paused|removing) baseline_leftover+="  ${service_row}"$'\n' ;;
        esac
      done <<< "$service_rows"
    else
      fail "the database and uploads WERE restored to the accepted baseline, but the
  container state could not be read, so this script cannot prove no application
  is running against it. Check 'docker ps' for project ${AAU_PROJECT_NAME}
  before re-running the first ${AAU_ENV} deployment."
    fi
  done

  if [[ -n "$baseline_leftover" ]]; then
    printf '%s' "$baseline_leftover" >&2
    fail "the database and uploads WERE restored to the accepted baseline, but an
  application container is STILL ACTIVE against it (listed above). A baseline
  recovery must leave nothing serving. Stop it before re-running the first
  ${AAU_ENV} deployment."
  fi
  log "verified: no application container is active against the restored baseline"

  # Belt and braces: a stale release-state file must not survive a baseline
  # recovery. It cannot normally exist here (its absence is one of the four
  # conditions for entering this mode), but if one appeared during the restore
  # it would misdirect the next deployment.
  rm -f "$AAU_STATE_FILE"

  log "=== baseline recovery complete ==="
  log "${AAU_ENV} is back at the accepted baseline this backup describes:"
  log "  migrations: ${recorded_migrations:-<none>}"
  log "  uploads:    ${recorded_uploads:-<unknown>}"
  log "Nothing is serving port ${AAU_APP_PORT}, and no release-state file exists."
  log "That is the correct state: no release has ever been deployed here."
  log ""
  log "The database was NOT re-imported from Neon and NO seed was run — this is"
  log "the same accepted dataset, restored from the backup taken before the"
  log "failed attempt."
  log ""
  log "Next step: fix what made the candidate fail (its logs are in the deploy"
  log "output above), then re-run the first ${AAU_ENV} deployment."
else
log "starting app-prod on the restored-compatible image"
APP_IMAGE="$RESTORE_IMAGE" compose up --detach --force-recreate --wait app-prod

# The release-state record must reflect what is actually running now, or the
# next deploy would report the wrong "previous known-good" image. Create the
# directory first: a restore can legitimately run on a host where the deploy
# root has not been laid out yet (recovery onto a replacement machine).
mkdir -p "$(dirname "$AAU_STATE_FILE")"
printf '%s\n' "$RESTORE_IMAGE" > "$AAU_STATE_FILE"

log "restore complete"
log "running image: ${RESTORE_IMAGE}"
log "Verify manually: /api/health returns 200, admin login works, and"
log "representative content is present before declaring recovery successful."
fi
