#!/usr/bin/env bash
# Create and verify a PostgreSQL + uploads backup for a deployment environment.
#
# Contracts that matter here:
#
#   Fail closed. On the selected production profile local uploads ARE durable
#   application data, so a missing uploads directory is a broken backup, not a
#   warning. Every required artifact is listed in MANIFEST and re-checked by
#   restore.sh before it destroys anything.
#
#   Full verification. Artifacts are read back end to end. `tar --test` is not
#   used: it seeks past data blocks and passes on corrupt and truncated
#   archives (measured — see tests/docker/first-install-and-recovery-drill.sh).
#
#   Coherent restore point. A pg_dump followed by a live tar of a directory the
#   application is still writing to represents two different instants. When
#   QUIESCE_APP=true the application is stopped first, so the dump and the
#   uploads describe the same state — and this only claims "quiesced" once the
#   app is PROVEN stopped, never on a stop that silently failed.
#
#   Never leave the service down. A standalone quiesced backup stops a HEALTHY
#   application. If it then fails — or is interrupted — the app must come back.
#   That is an EXIT trap, not a line at the end of the happy path, so it also
#   runs on failure and on SIGINT/SIGTERM.
#
#   Secrets-grade permissions. A backup contains every row of the database,
#   including password hashes and private uploads. It is created under
#   `umask 077` so no artifact is ever group- or world-readable, even for the
#   instant between creation and a later chmod.
#
# A persistent Docker volume is NOT a backup. At least one current copy must
# also leave the VPS — see deploy/README.md (PENDING REAL VPS).

set -euo pipefail

# A backup is as sensitive as the database. Set before anything is created so
# there is no window in which an artifact exists with looser permissions.
umask 077

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

# Stop the application for the duration of the backup so the dump and the
# uploads archive describe one instant. deploy.sh sets this.
readonly QUIESCE_APP="${QUIESCE_APP:-false}"
# Whether to put a quiesced application back after the backup. Default true:
# a standalone backup must never be the reason production is down. deploy.sh
# sets this false because it owns the container lifecycle from that point on
# and has its own failure-recovery path.
readonly RESTART_AFTER_QUIESCE="${RESTART_AFTER_QUIESCE:-true}"
# The production profile stores uploads on the local filesystem. Only an
# explicitly external object-storage profile may omit them.
readonly REQUIRE_UPLOADS="${REQUIRE_UPLOADS:-true}"

log() { printf '[backup] %s\n' "$*" >&2; }
fail() { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

# Serialize against deploy/restore/seed. When deploy.sh invokes this script the
# lock is already held by the parent and the handoff lets it proceed, so there
# is no self-deadlock; a standalone run acquires it for real.
oplock_acquire "$AAU_LOCK_FILE" "backup(${AAU_ENV})" \
  || fail "refusing to back up while another operation is running"

# ── A value for compose to parse with, never a release choice ─────────────
# Compose parses the entire file for every subcommand, and APP_IMAGE has no
# default on purpose, so even `exec postgres-prod pg_dump` needs a value. This
# script never CHOOSES a release: it takes the caller's (deploy.sh passes the
# digest it is cutting over to) or the one the release-state file records, and
# the image it RECORDS in metadata.json is resolved separately, below, from the
# release-state file and the running container.
#
# There genuinely may be neither — a first deployment onto a database that was
# initialized from a platform backup has data to protect and no previous
# release, and a stack brought up by hand has no release-state file either.
# An empty value reaches compose as "APP_IMAGE is not set", which reads as a
# broken compose file and refuses a backup that could perfectly well have
# succeeded. Refusing to PROTECT DATA for a bookkeeping reason is the wrong
# trade, so a parse-only placeholder is used instead and announced.
#
# It is safe precisely because this script never STARTS anything from it: the
# only lifecycle command here is `compose start app-prod`, which restarts the
# existing container with the image it was already created with. There is no
# `compose up` in this file.
COMPOSE_APP_IMAGE="${APP_IMAGE:-$(aau_state_image)}"
if [[ -z "$COMPOSE_APP_IMAGE" ]]; then
  COMPOSE_APP_IMAGE='aau-compose-parse-only:no-release-recorded'
  log "NOTE: no release-state file at ${AAU_STATE_FILE} and no APP_IMAGE supplied."
  log "      Using a parse-only placeholder so compose can read the file. Nothing is"
  log "      started from it, and the image recorded with this backup still comes from"
  log "      the running container."
fi

compose() {
  # Ports and the uploads path come from the environment descriptor, not from
  # the secrets file: they are deployment topology, not secrets, and they are
  # what keeps production and staging bound to different ports on one host.
  env \
    APP_IMAGE="$COMPOSE_APP_IMAGE" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

POSTGRES_ADMIN_USER="$(require_env_var "$AAU_ENV_FILE" POSTGRES_ADMIN_USER)" \
  || fail "POSTGRES_ADMIN_USER missing from ${AAU_ENV_FILE}"
POSTGRES_DB="$(require_env_var "$AAU_ENV_FILE" POSTGRES_DB)" \
  || fail "POSTGRES_DB missing from ${AAU_ENV_FILE}"
S3_ENABLED="$(read_env_var "$AAU_ENV_FILE" S3_ENABLED || true)"
UPLOADS_PATH="$AAU_UPLOADS_PATH"

# ── Unique destination ────────────────────────────────────────────────────
# A timestamp alone is not unique: two backups started in the same second — a
# cron run and an operator, or two environments sharing a mount — would write
# into one directory and interleave their artifacts. `mkdir` without -p is the
# atomic claim: it fails if the directory already exists, so the loop finds a
# name no other run holds.
mkdir -p "$AAU_BACKUP_ROOT"
# The backup root holds complete database copies; it must not be traversable
# by other local accounts.
chmod 700 "$AAU_BACKUP_ROOT" 2>/dev/null || log "WARNING: could not chmod 700 ${AAU_BACKUP_ROOT}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target=""
for attempt in $(seq 1 50); do
  candidate="${AAU_BACKUP_ROOT}/${timestamp}"
  (( attempt > 1 )) && candidate="${AAU_BACKUP_ROOT}/${timestamp}-$(printf '%04x' $((RANDOM % 65536)))"
  if mkdir "$candidate" 2>/dev/null; then target="$candidate"; break; fi
done
[[ -n "$target" ]] || fail "could not create a unique backup directory under ${AAU_BACKUP_ROOT}"
log "backup destination: ${target}"

# ── Quiesce, with a guaranteed return to the original state ───────────────
# `consistency: quiesced` is a promise that the dump and the uploads archive
# describe ONE instant. That promise may only be recorded once the app is
# PROVEN stopped — a stop that silently failed while we still archived a live,
# mutating uploads tree would record an incoherent restore point as if it were
# coherent. So this fails closed rather than trusting the stop command.
quiesced=false
app_was_running=false
backup_succeeded=false

restore_service_state() {
  # Runs on EVERY exit path, including failure and interruption.
  if [[ "$quiesced" == "true" && "$app_was_running" == "true" \
        && "$RESTART_AFTER_QUIESCE" == "true" ]]; then
    log "restarting app-prod (it was running before this backup quiesced it)"
    # No --force-recreate: this starts the container this script stopped, using
    # the image it was already created with, so the service returns to exactly
    # the state it was in. Recreating would need an APP_IMAGE this script has no
    # business choosing.
    if compose start app-prod >/dev/null 2>&1; then
      log "app-prod restarted"
    else
      log "WARNING: could not restart app-prod after the backup. The application"
      log "         is DOWN and needs manual attention: docker compose -p ${AAU_PROJECT_NAME} start app-prod"
    fi
  fi
  if [[ "$backup_succeeded" != "true" && -n "${target:-}" ]]; then
    log "removing the incomplete backup at ${target}"
    rm -rf "$target"
  fi
}
trap restore_service_state EXIT

if [[ "$QUIESCE_APP" == "true" ]]; then
  # A FAILED probe is not "app-prod was not running". Through a pipeline the
  # compose exit status was discarded, so a transient Compose failure left
  # app_was_running=false — and the EXIT trap then did not restart the
  # application after writers_freeze had stopped it, leaving the site down with
  # no warning. Fail closed instead: refuse to quiesce a service whose state
  # could not be observed.
  running_services="$(compose ps --status running --services 2>/dev/null)" \
    || fail "could not determine whether app-prod is running; refusing to quiesce it.
  Re-run once Docker Compose responds; the application has not been touched."
  if grep -Fxq app-prod <<<"$running_services"; then
    app_was_running=true
  fi
  # "quiesced" means every application WRITER is frozen, not just app-prod. A
  # crashed or interrupted earlier operation can leave app-candidate or a
  # one-off Seed container connected to the same database and still writing; a
  # backup taken while any of them writes is not the coherent instant
  # `consistency: quiesced` promises. writers_freeze (shared with restore.sh, so
  # the definition cannot drift) stops them all and PROVES none is active —
  # including a crash-looping `restarting` container that `--status running`
  # would miss. postgres/redis stay up; the dump reads through them.
  log "freezing every application writer so the dump and uploads describe one instant"
  if ! writers_freeze "$AAU_PROJECT_NAME" compose; then
    fail "requested a quiesced backup but an application writer is still active after being
  stopped (see above). Refusing to record a coherent restore point over a live,
  mutating database or uploads tree."
  fi
  quiesced=true
  log "all application writers confirmed frozen"
fi

# ── Capacity preflight ────────────────────────────────────────────────────
# Bounds the obvious failure — starting a backup onto a filesystem that is
# already nearly full. It is NOT a guarantee: the dump is compressed so its
# size is not known in advance, PostgreSQL and the application keep writing to
# the same filesystem during the run, and on this host Docker, the database,
# the uploads, the logs and these backups may all share one filesystem. A
# genuine capacity guarantee needs off-host storage and host monitoring; see
# deploy/README.md.
readonly MIN_FREE_MB="${BACKUP_MIN_FREE_MB:-2048}"
# An unmeasurable floor is not a cleared floor. This used to warn and continue,
# which is the one outcome the check exists to prevent: on this shared host the
# database, the uploads, the mail spool and the logs sit on the same
# filesystem, so a full-size dump started blind can exhaust it and take
# PostgreSQL and cPanel services down with it.
if ! avail_mb="$(df -Pm "$AAU_BACKUP_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"; then
  fail "could not measure free space on ${AAU_BACKUP_ROOT}; refusing to start a backup
  that could fill the filesystem this host's other services share."
fi
if [[ -z "${avail_mb//[[:space:]]/}" ]]; then
  fail "the free-space probe returned no value for ${AAU_BACKUP_ROOT}; refusing to start
  a backup that could fill the filesystem this host's other services share."
fi
(( avail_mb >= MIN_FREE_MB )) || fail "only ${avail_mb} MiB free on the backup filesystem; at least ${MIN_FREE_MB} MiB
  is required before starting a backup (BACKUP_MIN_FREE_MB). Free space or move
  the backup root. This is a floor, not a guarantee the backup will fit."
log "capacity preflight: ${avail_mb} MiB free (floor ${MIN_FREE_MB} MiB)"

# ── PostgreSQL ────────────────────────────────────────────────────────────
# Custom format (-Fc): compressed, and restorable selectively with pg_restore.
# Run as the administration role so the dump covers every object regardless of
# which role owns it.
dump="${target}/postgres.dump"
log "dumping ${POSTGRES_DB}"
compose exec -T postgres-prod \
  pg_dump --format=custom --no-password \
  --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" \
  > "$dump" || fail "pg_dump failed"

[[ -s "$dump" ]] || fail "pg_dump produced an empty artifact"

# pg_restore --list parses the archive's table of contents, so a truncated or
# corrupt dump fails here rather than during a real emergency.
log "verifying dump is readable"
compose exec -T postgres-prod pg_restore --list < "$dump" > "${target}/postgres.toc" \
  || fail "dump is not readable by pg_restore; treating backup as failed"

entries="$(grep -c ';' "${target}/postgres.toc" || true)"
[[ "${entries:-0}" -gt 0 ]] || fail "dump table of contents is empty"
log "dump verified (${entries} archive entries)"

# ── Uploads ───────────────────────────────────────────────────────────────
uploads_required="$REQUIRE_UPLOADS"
if [[ "${S3_ENABLED:-false}" == "true" ]]; then
  uploads_required=false
  log "S3_ENABLED=true — local uploads are not part of this restore point"
fi

uploads_included=false
uploads_members=0

if [[ ! -d "$UPLOADS_PATH" ]]; then
  # Fail closed: on the local-storage profile this is missing application data,
  # not an optional extra.
  [[ "$uploads_required" == "true" ]] \
    && fail "configured uploads directory does not exist: ${UPLOADS_PATH}
  Local uploads are durable application data on this profile, so a restore
  point without them is incomplete. Set REQUIRE_UPLOADS=false only for an
  external object-storage profile."
  log "uploads directory absent and not required for this profile"
else
  uploads="${target}/uploads.tar.gz"
  log "archiving uploads from ${UPLOADS_PATH}"
  tar --create --gzip --file "$uploads" --directory "$UPLOADS_PATH" . \
    || fail "uploads archive failed"

  # Full-stream verification: gzip validates its CRC and length trailer over
  # the whole archive, then every member is read end to end.
  gzip --test "$uploads" || fail "uploads archive fails gzip integrity check"
  tar --extract --gzip --file "$uploads" --to-stdout > /dev/null \
    || fail "uploads archive is not fully readable"

  uploads_members="$(tar --list --gzip --file "$uploads" | wc -l)"
  # An empty uploads tree is legitimate (a fresh install before any media was
  # uploaded). tar still emits the "./" entry, so a valid archive always has at
  # least one member; zero means the archive is malformed.
  [[ "${uploads_members:-0}" -gt 0 ]] || fail "uploads archive contains no members"
  uploads_included=true
  log "uploads archive verified (${uploads_members} entries, full read)"
fi

# ── Compatibility metadata ────────────────────────────────────────────────
# The schema this dump captures only works with an application build that
# expects it. Record enough to reconstruct that pairing exactly.
# These two are REQUIRED: without them this archive is a dump nobody can pair
# with an application build, and a restore point that cannot be paired is not a
# restore point. `|| true` turned a failed probe into an empty field and the
# script still wrote MANIFEST and reported success.
applied_migrations="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations" 2>/dev/null)" \
  || fail "could not read payload_migrations; refusing to record a backup whose schema
  generation is unknown. The dump has not been published as a restore point."

postgres_version="$(compose exec -T postgres-prod \
  psql -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -Atc "SHOW server_version" 2>/dev/null)" \
  || fail "could not read the PostgreSQL server version; refusing to record a backup
  whose server generation is unknown."

# Release identity comes from the release-state file and NOWHERE else.
#
# This used to prefer `compose ps --format '{{.Image}}'`, which reports the
# reference from the running container's configuration — a tag, or a manually
# started or stale container — and it OVERRODE the immutable digest written by
# deploy.sh. A backup could therefore record a mutable reference, or the wrong
# release, and the paired-image restore contract silently stopped holding.
deployed_image=""
[[ -f "$AAU_STATE_FILE" ]] && deployed_image="$(<"$AAU_STATE_FILE")"

running_image="$(compose ps --all --format '{{.Image}}' app-prod 2>/dev/null | head -1 || true)"
if [[ -n "$deployed_image" ]]; then
  # The release state EXISTS, so it is the identity. The running container's
  # configured reference is diagnostics only: it can be a tag, a stale
  # container or a manually started one, and letting it win here is what
  # allowed a backup to record a mutable or simply wrong release.
  if [[ -n "$running_image" && "$running_image" != "$deployed_image" ]]; then
    log "WARNING: app-prod is running ${running_image} but the release state records ${deployed_image}."
    log "WARNING: recording the release-state value; investigate the divergence before relying on a restore."
  fi
elif [[ -n "$running_image" ]]; then
  # No release state at all — this environment was started by something other
  # than deploy.sh or restore.sh. The running container is then the ONLY
  # evidence of what produced this data, and recording nothing would write a
  # backup that restore.sh must later refuse for having no paired image: an
  # archive that looks like a restore point and is not one. Recorded, and said
  # out loud, because it carries less authority than a release-state digest.
  deployed_image="$running_image"
  log "NOTE: no release-state file at ${AAU_STATE_FILE}; recording the image app-prod"
  log "NOTE: is running (${running_image}) as this backup's pairing. It is the only"
  log "NOTE: evidence available here, and it is NOT an authorized release identity."
fi

# Optional, and deliberately so: the image may legitimately not be present on
# this host (retention-report.sh reports exactly that as ABSENT), which is not
# a reason to refuse a backup of the data.
image_revision=""
if [[ -n "$deployed_image" ]]; then
  image_revision="$(docker image inspect --format \
    '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$deployed_image" 2>/dev/null || true)"
fi

cat > "${target}/metadata.json" <<EOF
{
  "created_at": "${timestamp}",
  "environment": "${AAU_ENV}",
  "database": "${POSTGRES_DB}",
  "postgres_version": "${postgres_version}",
  "app_image": "${deployed_image}",
  "image_revision": "${image_revision}",
  "applied_migrations": "${applied_migrations}",
  "uploads_included": ${uploads_included},
  "uploads_entries": ${uploads_members},
  "consistency": "$([[ "$quiesced" == "true" ]] && echo quiesced || echo live)"
}
EOF
log "recorded state: env=${AAU_ENV} image=${deployed_image:-<unknown>} revision=${image_revision:-<unknown>} uploads=${uploads_included} consistency=$([[ "$quiesced" == "true" ]] && echo quiesced || echo live)"

# ── Manifest of REQUIRED artifacts ────────────────────────────────────────
# restore.sh refuses to start unless every listed file is present. This is the
# contract that makes a partially-deleted backup a hard failure rather than a
# silently degraded restore.
{
  echo "postgres.dump"
  echo "postgres.toc"
  echo "metadata.json"
  [[ "$uploads_included" == "true" ]] && echo "uploads.tar.gz"
} > "${target}/MANIFEST"

# Checksums cover every artifact including the manifest itself.
( cd "$target" && sha256sum -- * > SHA256SUMS.tmp && mv SHA256SUMS.tmp SHA256SUMS )

# Belt and braces alongside `umask 077`: assert the permissions rather than
# assume the umask was in force (a caller could have exported one, and a
# future edit could add a `chmod`).
chmod 700 "$target"
find "$target" -type f -exec chmod 600 {} +

# Only now is the backup real. Set before the trap runs so it is not deleted.
backup_succeeded=true

log "backup complete: ${target}"
printf '%s\n' "$target"
