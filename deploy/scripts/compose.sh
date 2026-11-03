#!/usr/bin/env bash
# `docker compose` for one deployment environment, with the release identity
# supplied from the release-state file.
#
# ── Why this wrapper exists ───────────────────────────────────────────────
# The compose file has NO default for APP_IMAGE and the env file does not
# contain one, so a bare `docker compose ... up` fails rather than silently
# resurrecting whatever release a stale APP_IMAGE happened to name. That is the
# safety property; this script is how an operator gets convenience back without
# giving it up. It reads `<deploy-root>/deployed-image` — written only by a
# successful deploy or restore — and passes that exact digest through.
#
# Usage:
#   deploy/scripts/compose.sh ps
#   deploy/scripts/compose.sh logs --tail 100 app-prod
#   deploy/scripts/compose.sh up --detach --force-recreate app-prod
#   AAU_ENV=staging deploy/scripts/compose.sh ps
#
# ── Locking ───────────────────────────────────────────────────────────────
# Read-only subcommands (`ps`, `logs`, `config`, ...) do NOT take the operation
# lock: blocking `logs` during a deploy would be unhelpful, and observing state
# cannot corrupt it.
#
# Everything that MUTATES services does take it. This script previously took no
# lock at all, on the reasoning that anything destructive goes through
# deploy.sh / restore.sh / backup.sh — but the documented bootstrap-password
# retirement step is `compose.sh up --detach --force-recreate app-prod` run
# straight from this wrapper, which recreated a service while a deploy, restore,
# backup or seed held the lock and was operating on that same service.
#
# `oplock_acquire` performs the inherited-lock handoff, so invoking this from a
# script that already holds the lock proceeds rather than deadlocking.

set -euo pipefail

readonly LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")/lib" && pwd)"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"
# shellcheck source=deploy/scripts/lib/oplock.sh
source "${LIB}/oplock.sh"

aau_env_resolve

fail() { printf '[compose] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -f "$AAU_ENV_FILE" ]] || fail "missing deployment env file: ${AAU_ENV_FILE}"
[[ -f "$AAU_COMPOSE_FILE" ]] || fail "missing compose file: ${AAU_COMPOSE_FILE}"

# ── The APP_IMAGE override ────────────────────────────────────────────────
# An operator can supply APP_IMAGE to address a release other than the recorded
# one. That is a legitimate escape hatch — inspecting a release that failed to
# promote, or starting a specific build during an incident — but it was silent,
# which made it a hole in the property this whole wrapper exists to provide:
# release identity comes from the release-state file, not from configuration.
#
# So the override survives, on three conditions. It must be an immutable digest,
# because the deployment's core identity invariant is that a release is a digest,
# not a tag someone can repoint underneath it. It is ANNOUNCED, because a bypass
# nobody notices is indistinguishable from the recorded release. And when the
# requested digest DIFFERS from the recorded one, it requires an explicit typed
# acknowledgement — an ambient env var that silently swaps the running release is
# exactly the hole this wrapper exists to close. Read-only inspection and using
# the recorded release stay frictionless; only a real divergence needs the word.
readonly OVERRIDE_ACK='I-UNDERSTAND-THIS-BYPASSES-RECORDED-RELEASE'
APP_IMAGE="${APP_IMAGE:-}"
if [[ -n "$APP_IMAGE" ]]; then
  [[ "$APP_IMAGE" == *@sha256:* ]] || fail "APP_IMAGE='${APP_IMAGE}' is not digest-pinned.
  Release identity in this deployment is an immutable digest; a tag can be
  repointed after it is checked, so it is not an identity. Pass
  <repository>@sha256:<64 hex> instead."

  recorded=""
  if [[ -f "$AAU_STATE_FILE" ]]; then
    recorded="$(<"$AAU_STATE_FILE")"
    recorded="${recorded//[$'\n\r']/}"
  fi
  printf '[compose] NOTE: using APP_IMAGE from the environment, NOT the release-state file.\n' >&2
  printf '[compose]       requested: %s\n' "$APP_IMAGE" >&2
  printf '[compose]       recorded:  %s\n' "${recorded:-<none>}" >&2
  if [[ "$recorded" != "$APP_IMAGE" ]]; then
    # A genuine divergence from the recorded release. Refuse without the ack.
    if [[ "${ALLOW_IMAGE_OVERRIDE:-}" != "$OVERRIDE_ACK" ]]; then
      fail "APP_IMAGE differs from the recorded release, which is the source of truth for
  what is deployed:
      requested: ${APP_IMAGE}
      recorded:  ${recorded:-<none>}
  Running a different image this way is a deliberate bypass (inspecting a build
  that failed to promote, or starting a specific image during an incident). If
  that is what you mean, re-run with the acknowledgement:
      ALLOW_IMAGE_OVERRIDE=${OVERRIDE_ACK} \\
      APP_IMAGE=${APP_IMAGE} deploy/scripts/compose.sh $*
  Note: this does NOT update the release-state file, so the next deploy will
  still treat ${recorded:-<none>} as the previous known-good release."
    fi
    printf '[compose]       ACKNOWLEDGED override (ALLOW_IMAGE_OVERRIDE): these DIFFER, and\n' >&2
    printf '[compose]       starting a service this way does NOT update the release-state file,\n' >&2
    printf '[compose]       so the next deploy still treats %s as previous known-good.\n' "${recorded:-<none>}" >&2
  fi
else
  [[ -f "$AAU_STATE_FILE" ]] || fail "no release-state file at ${AAU_STATE_FILE}.
  Nothing has been deployed to ${AAU_ENV} yet, so there is no release identity
  to use. Run deploy/scripts/deploy.sh <image@sha256:...> first."
  APP_IMAGE="$(<"$AAU_STATE_FILE")"
  APP_IMAGE="${APP_IMAGE//[$'\n\r']/}"
fi
[[ -n "$APP_IMAGE" ]] || fail "${AAU_STATE_FILE} is empty; refusing to guess a release identity"

# The first non-option argument is the compose subcommand. Read-only ones run
# unlocked; everything else — `up`, `down`, `stop`, `restart`, `rm`, `run`,
# `exec`, and anything added to Compose later — acquires the operation lock.
# The default is to LOCK, so an unrecognised or future subcommand is treated as
# mutating rather than waved through.
compose_subcommand=""
for arg in "$@"; do
  case "$arg" in
    -*) continue ;;
    *) compose_subcommand="$arg"; break ;;
  esac
done

needs_lock=true
case "$compose_subcommand" in
  ps|logs|config|top|port|images|events|version|ls) needs_lock=false ;;
esac

run_compose() {
  env \
    APP_IMAGE="$APP_IMAGE" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
}

if [[ "$needs_lock" == "false" ]]; then
  # `exec`: no lock to hold open, so hand the process straight over.
  exec env \
    APP_IMAGE="$APP_IMAGE" \
    APP_HOST_PORT="$AAU_APP_PORT" \
    CANDIDATE_HOST_PORT="$AAU_CANDIDATE_PORT" \
    UPLOADS_HOST_PATH="$AAU_UPLOADS_PATH" \
    docker compose -p "$AAU_PROJECT_NAME" --env-file "$AAU_ENV_FILE" -f "$AAU_COMPOSE_FILE" "$@"
fi

oplock_acquire "$AAU_LOCK_FILE" "compose ${compose_subcommand:-<none>}(${AAU_ENV})" \
  || fail "another operation holds the ${AAU_ENV} operation lock.
  Mutating Compose commands wait for deploy/restore/backup/seed to finish;
  read-only ones (ps, logs, config) never block."

# Deliberately NOT `exec`: bash marks the lock's file descriptor close-on-exec,
# so replacing this shell would release the lock while the command it protects
# is still running. Staying alive keeps it held for the real duration.
run_compose "$@"
