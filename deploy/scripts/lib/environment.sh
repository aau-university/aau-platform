#!/usr/bin/env bash
# Resolves every path, name and port for ONE deployment environment.
#
# ── Why a shared resolver instead of two copies of deploy.sh ──────────────
# Production and staging run the same application, the same migrations and the
# same recovery procedures on the SAME host. Duplicating the deployment logic
# would mean every safety fix has to be made twice, and the copy that gets
# missed is the one that loses data. So the logic is shared and only the
# environment descriptor differs.
#
# ── What must never be shared ─────────────────────────────────────────────
# Compose project, database volume, Redis volume, networks, uploads tree,
# backup root, release-state file, operation lock, env/secrets file and host
# port. Each is derived from AAU_ENV below, so there is exactly one place where
# an environment could accidentally be given production's state — and
# `tests/deploy/environment-isolation-drill.sh` asserts that every one of these
# differs between the two.
#
# Compose project names are the documented Docker mechanism for running
# multiple isolated copies of an application on one host: resources are
# namespaced by project, so `aau-staging`'s volumes and networks are distinct
# objects from `aau-production`'s even though the service names match.
#
# Service names (app-prod, postgres-prod, redis-prod) are deliberately NOT
# renamed per environment. They are already namespaced by the project, and
# renaming them would churn every script, test, healthcheck and document for no
# isolation benefit.

# aau_env_resolve [environment]
# Sets the AAU_* variables for the named environment. Every value can still be
# overridden by an explicit process-env variable of the same name, which is how
# the drills point a whole environment at a temporary directory.
aau_env_resolve() {
  local env_name="${1:-${AAU_ENV:-production}}"

  case "$env_name" in
    production|staging) ;;
    *)
      printf '[environment] ERROR: unknown environment %q (expected production or staging)\n' \
        "$env_name" >&2
      return 1
      ;;
  esac

  AAU_ENV="$env_name"

  # Root of everything for this environment. Production and staging are
  # siblings, never nested, so no operation on one can reach the other by a
  # relative path.
  AAU_ENV_ROOT="${AAU_ENV_ROOT:-/srv/aau/${env_name}}"

  AAU_DEPLOY_ROOT="${DEPLOY_ROOT:-${AAU_ENV_ROOT}/deploy}"
  AAU_ENV_FILE="${ENV_FILE:-${AAU_DEPLOY_ROOT}/.env.${env_name}}"
  AAU_COMPOSE_FILE="${COMPOSE_FILE:-${AAU_DEPLOY_ROOT}/docker-compose.vps.yml}"
  AAU_STATE_FILE="${STATE_FILE:-${AAU_DEPLOY_ROOT}/deployed-image}"
  AAU_LOCK_FILE="${LOCK_FILE:-${AAU_DEPLOY_ROOT}/locks/operations.lock}"
  AAU_BACKUP_ROOT="${BACKUP_ROOT:-${AAU_ENV_ROOT}/backups}"
  AAU_UPLOADS_PATH="${UPLOADS_HOST_PATH:-${AAU_ENV_ROOT}/uploads}"
  AAU_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-aau-${env_name}}"

  # ── Per-environment registry credentials ────────────────────────────────
  # Every docker call in this deployment runs as root (the deploy accounts are
  # deliberately not in the `docker` group), so without this they would all
  # share ONE credential store at /root/.docker/config.json. A single
  # `docker login ghcr.io` there authorises pulls from BOTH the production and
  # the staging package — which quietly undoes the channel separation the whole
  # publish side is built around, where production and staging are separate
  # GHCR packages precisely so the package is the trust boundary.
  #
  # A separate DOCKER_CONFIG per environment means each host environment holds
  # only a token for its own channel, and a staging deployment cannot pull a
  # production image even by asking for it by digest.
  AAU_DOCKER_CONFIG="${DOCKER_CONFIG:-${AAU_ENV_ROOT}/docker}"
  DOCKER_CONFIG="$AAU_DOCKER_CONFIG"
  export DOCKER_CONFIG

  # Loopback bind for the stable service port. The reverse proxy (cPanel Apache
  # on the real host) forwards a public HTTPS vhost to exactly one of these.
  case "$env_name" in
    production) AAU_APP_PORT="${AAU_APP_PORT:-3000}" ;;
    staging)    AAU_APP_PORT="${AAU_APP_PORT:-13000}" ;;
  esac

  # The port the candidate is validated on BEFORE it is allowed to take over the
  # stable port. Distinct per environment so a production and a staging cutover
  # can be in flight simultaneously without colliding.
  AAU_CANDIDATE_PORT="${AAU_CANDIDATE_PORT:-$(( AAU_APP_PORT + 1 ))}"

  export AAU_ENV AAU_ENV_ROOT AAU_DEPLOY_ROOT AAU_ENV_FILE AAU_COMPOSE_FILE \
    AAU_STATE_FILE AAU_LOCK_FILE AAU_BACKUP_ROOT AAU_UPLOADS_PATH \
    AAU_PROJECT_NAME AAU_APP_PORT AAU_CANDIDATE_PORT AAU_DOCKER_CONFIG
}

# aau_state_image — the digest recorded by the last successful deploy/restore,
# or empty if nothing has been deployed.
#
# `docker compose` parses the whole compose file for EVERY subcommand, including
# read-only ones like `ps` and lifecycle ones like `start`. Because APP_IMAGE
# deliberately has no default, even `compose start app-prod` fails without it —
# so scripts that only manipulate EXISTING containers still have to supply a
# value. Reading it from the release-state file is the correct source: it is the
# identity those containers were created with.
aau_state_image() {
  [[ -f "${AAU_STATE_FILE:-}" ]] || return 0
  local image
  image="$(<"$AAU_STATE_FILE")"
  printf '%s' "${image//[$'\n\r']/}"
}

# aau_env_is_production — true only for the production environment. Used to
# make destructive staging-only operations structurally impossible in
# production rather than merely discouraged.
aau_env_is_production() { [[ "${AAU_ENV:-production}" == "production" ]]; }
