#!/usr/bin/env bash
# Root-owned entrypoint for the explicit one-shot canonical Seed.
#
# Separate from deploy-entrypoint.sh on purpose. They are DIFFERENT
# capabilities: "deploy an approved release" and "write canonical content".
# Keeping them in one script would mean any account allowed to deploy could
# also seed, and on production those should almost never be the same grant.
#
# Provision on STAGING ONLY. The canonical Seed is a staging capability:
# production content is the accepted migrated dataset, installed once by
# deploy/scripts/initialize-from-backup.sh. Installing this at the production
# path is refused below rather than merely discouraged, so a copy made by
# mistake is inert.
#
#   install -o root -g root -m 0755 seed-entrypoint.sh \
#     /srv/aau/staging/deploy/scripts/seed-entrypoint.sh
#
#   # /etc/sudoers.d/aau-deploy  (mode 0440, validate with `visudo -c`)
#   aau-deploy-staging ALL=(root) NOPASSWD: /srv/aau/staging/deploy/scripts/seed-entrypoint.sh
#
# As with the deployment entrypoint, the ENVIRONMENT is derived from this
# script's own root-owned installed path, never from an argument or the
# environment — so a staging key cannot seed production even if the production
# copy exists on the same host.

set -euo pipefail

log() { printf '[seed-entrypoint] %s\n' "$*" >&2; }
fail() { printf '[seed-entrypoint] ERROR: %s\n' "$*" >&2; exit 1; }

self="$(readlink -f "${BASH_SOURCE[0]}")"
case "$self" in
  /srv/aau/production/deploy/scripts/seed-entrypoint.sh)
    readonly AAU_ENV=production
    readonly DEPLOY_ROOT=/srv/aau/production/deploy
    ;;
  /srv/aau/staging/deploy/scripts/seed-entrypoint.sh)
    readonly AAU_ENV=staging
    readonly DEPLOY_ROOT=/srv/aau/staging/deploy
    ;;
  *)
    fail "this entrypoint is running from an unrecognised path: ${self}
  It must be installed at exactly one of the root-owned locations in the header,
  because that path is what selects the environment. Refusing to guess."
    ;;
esac

[[ $# -eq 1 ]] || fail "usage: $0 <full|reset-and-full>"
readonly MODE="$1"

case "$MODE" in
  full|reset-and-full) ;;
  *) fail "unknown seed mode '${MODE}' (expected full or reset-and-full)" ;;
esac

# Refused here, in seed.sh, AND in the seed runner itself. Three independent
# refusals, and this is the one that cannot be reached around: the environment
# comes from this file's own root-owned installed path, so a remote key has no
# way to ask for the production copy even if one exists on the host.
[[ "$AAU_ENV" == "staging" ]] || fail "the canonical Seed is a STAGING-ONLY operation and can never run against
  ${AAU_ENV}. Production content is the accepted migrated dataset:

    first install   deploy/scripts/initialize-from-backup.sh <verified backup>
    recovery        deploy/scripts/restore.sh <backup>

  This entrypoint should not be installed at ${self}. Remove it and its sudoers
  rule."

log "authorized ${AAU_ENV} seed: ${MODE}"

# Clean environment: the caller cannot inject AAU_ENV, DEPLOY_ROOT or anything
# else that would change which environment is seeded.
#
# There is deliberately NO confirmation variable to forward. A production Seed
# is not gated behind a typed string, it is refused — above, in seed.sh and in
# the runner — so there is nothing a remote key could supply that would make one
# happen.
exec env -i \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HOME=/root \
  AAU_ENV="$AAU_ENV" \
  "${DEPLOY_ROOT}/scripts/seed.sh" "$MODE"
