#!/usr/bin/env bash
# Root-owned deployment entrypoint. THE privilege boundary for CI deployments.
#
# This is the only thing a CI deploy account is permitted to run as root. It
# exists so that account can trigger a deployment without holding docker group
# membership (equivalent to root), a login shell as root, or read access to the
# root-owned env file.
#
# Provision one copy per environment:
#
#   install -o root -g root -m 0755 deploy-entrypoint.sh \
#     /srv/aau/production/deploy/scripts/deploy-entrypoint.sh
#   install -o root -g root -m 0755 deploy-entrypoint.sh \
#     /srv/aau/staging/deploy/scripts/deploy-entrypoint.sh
#
#   # /etc/sudoers.d/aau-deploy  (mode 0440, validate with `visudo -c`)
#   aau-deploy         ALL=(root) NOPASSWD: /srv/aau/production/deploy/scripts/deploy-entrypoint.sh
#   aau-deploy-staging ALL=(root) NOPASSWD: /srv/aau/staging/deploy/scripts/deploy-entrypoint.sh
#   Defaults!/srv/aau/production/deploy/scripts/deploy-entrypoint.sh !requiretty
#   Defaults!/srv/aau/staging/deploy/scripts/deploy-entrypoint.sh    !requiretty
#
# Each sudoers rule names ONE path with NO wildcard, so an account cannot
# substitute a different command — and, because the environment is derived from
# the script's own installed path (below), the staging account cannot ask for a
# production deployment. Arguments still reach the script, which is why the
# image reference is validated here rather than trusted: sudo rules constrain
# WHICH program runs, not what it is asked to do.
#
# Deliberately NOT granted to a deploy account:
#   - membership of the `docker` group (root-equivalent: it can bind-mount / )
#   - a root login shell
#   - read access to the env file (root-owned, 0600)
#   - any sudo rule containing a wildcard or a shell

set -euo pipefail

log() { printf '[entrypoint] %s\n' "$*" >&2; }
fail() { printf '[entrypoint] ERROR: %s\n' "$*" >&2; exit 1; }

# ── The environment is NOT caller-controlled ──────────────────────────────
# It is derived from this script's own installed path, which is root-owned and
# named literally in the sudoers rule. Taking it from an argument or from
# $AAU_ENV would let a staging key request a production deployment; taking it
# from a `${DEPLOY_ROOT:-...}` fallback would let an injected environment
# variable relocate the whole deployment. At a root privilege boundary neither
# may be possible, so the map below is a hardcoded constant.
#
# Anyone deploying a fork edits these lines deliberately, in the root-owned
# file, on the host.
self="$(readlink -f "${BASH_SOURCE[0]}")"
case "$self" in
  /srv/aau/production/deploy/scripts/deploy-entrypoint.sh)
    readonly AAU_ENV=production
    readonly DEPLOY_ROOT=/srv/aau/production/deploy
    readonly POLICY_FILE=/srv/aau/production/deploy/release-policy.conf
    ;;
  /srv/aau/staging/deploy/scripts/deploy-entrypoint.sh)
    readonly AAU_ENV=staging
    readonly DEPLOY_ROOT=/srv/aau/staging/deploy
    readonly POLICY_FILE=/srv/aau/staging/deploy/release-policy.conf
    ;;
  *)
    fail "this entrypoint is running from an unrecognised path: ${self}
  It must be installed at exactly one of the root-owned locations listed in the
  header, because that path is what selects the environment. Refusing to guess."
    ;;
esac

[[ $# -eq 1 ]] || fail "usage: $0 <image-reference>"
readonly REQUESTED_IMAGE="$1"

# ── Validate the one piece of caller-controlled input ─────────────────────
# The argument reaches a root context that then runs the image with production
# secrets, database access, uploads and internal-network reach. So it is
# constrained on three axes: shape, channel, and release.

# 1. SHAPE — an immutable digest, never a mutable tag.
#
# The deployment workflow already resolves and passes an `image@sha256:<digest>`
# reference, so a tag is never needed at this privileged boundary — and a tag
# could be repointed at a hostile image after review. A bare 64-character
# lowercase-hex digest also contains nothing a shell could reinterpret.
if ! [[ "$REQUESTED_IMAGE" =~ ^([a-zA-Z0-9._/-]+)@sha256:([a-f0-9]{64})$ ]]; then
  fail "not an immutable digest reference (expected <repo>@sha256:<64 hex>): ${REQUESTED_IMAGE}"
fi
readonly REQUESTED_REPO="${BASH_REMATCH[1]}"
readonly REQUESTED_DIGEST="sha256:${BASH_REMATCH[2]}"

# 2. CHANNEL — production and staging artifacts are DIFFERENT packages.
#
# Existing in the same registry namespace is not authorization. Staging images
# are built for the staging origin and from a laxer release lineage, so a
# staging artifact must be structurally incapable of entering the production
# path. Separate GHCR packages make that a property of the reference itself,
# not a convention: the production entrypoint simply does not accept a staging
# repository name.
case "$AAU_ENV" in
  production)
    readonly EXPECTED_REPO="ghcr.io/mohammed7779948484-tech/aau-payload-platform" ;;
  staging)
    readonly EXPECTED_REPO="ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging" ;;
esac

if [[ "$REQUESTED_REPO" != "$EXPECTED_REPO" ]]; then
  fail "image repository is not the approved ${AAU_ENV} channel.
  expected: ${EXPECTED_REPO}
  got:      ${REQUESTED_REPO}
  A staging artifact is never a production artifact, and vice versa."
fi

# 3. RELEASE — repository + digest shape prove WHICH artifact, not that it is an
#    APPROVED one. A stolen deploy credential would otherwise be able to
#    redeploy any historical or experimental digest that happens to exist in the
#    package, including one that predates a security fix.
#
#    The policy lives in a root-owned file the deploy account cannot write.
#    Format (shell-free, one `key=value` per line):
#
#      authorized_digests_file=/srv/aau/production/deploy/authorized-releases
#      # or, to accept any digest in the approved channel:
#      authorized_digests=any-in-channel
#
#    `any-in-channel` is the weaker mode. It is supported because unattended CI
#    deployment needs it, but it must be chosen EXPLICITLY and it is logged on
#    every run, so nobody is under the impression the allow-list is active when
#    it is not. A missing policy file fails closed.
[[ -f "$POLICY_FILE" ]] || fail "missing release policy file: ${POLICY_FILE}
  Refusing to deploy without an explicit consumer-side release policy. See
  deploy/STAGING_VPS_CONTRACT.md."

# Read the policy WITHOUT sourcing it: a root-owned config file that is
# `source`d is a root code-execution surface for anyone who can ever write it.
policy_value() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$POLICY_FILE" | tail -n1
}

authorized_digests="$(policy_value authorized_digests)"
authorized_digests_file="$(policy_value authorized_digests_file)"

if [[ -n "$authorized_digests_file" ]]; then
  [[ -f "$authorized_digests_file" ]] \
    || fail "release policy names ${authorized_digests_file} but it does not exist"
  if ! grep -Fxq "$REQUESTED_DIGEST" "$authorized_digests_file"; then
    fail "${REQUESTED_DIGEST} is not in the authorized release list for ${AAU_ENV}.
  Only digests an operator has recorded in ${authorized_digests_file} may be
  deployed. A valid image in the right channel is still not an approved release."
  fi
  log "release authorized against ${authorized_digests_file}"
elif [[ "$authorized_digests" == "any-in-channel" ]]; then
  log "WARNING: release policy is 'any-in-channel' — ANY digest in ${EXPECTED_REPO}"
  log "         will be accepted. The per-release allow-list is NOT in effect."
else
  fail "release policy ${POLICY_FILE} does not specify an authorization mode.
  Set either authorized_digests_file=<path> or the explicit weaker
  authorized_digests=any-in-channel."
fi

log "authorized ${AAU_ENV} image: ${REQUESTED_IMAGE}"

# Hand off to the real deployment script with a clean environment. The caller
# cannot inject AAU_ENV/DEPLOY_ROOT/ENV_FILE/SKIP_BACKUP and thereby relocate
# the deployment, cross environments, or bypass the backup gate.
exec env -i \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HOME=/root \
  AAU_ENV="$AAU_ENV" \
  "${DEPLOY_ROOT}/scripts/deploy.sh" "$REQUESTED_IMAGE"
