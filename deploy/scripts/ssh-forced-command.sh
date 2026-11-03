#!/usr/bin/env bash
# authorized_keys forced command for the CI deploy account (aau-deploy).
#
# ── Why a forced command, not just a nologin shell ────────────────────────
# `--shell /usr/sbin/nologin` does NOT work here. OpenSSH runs a remote command
# through the account's login shell (`$SHELL -c "<command>"`), and nologin
# refuses every invocation — including command execution — so
# `ssh aau-deploy@host "<image>"` would just print the nologin banner and exit
# non-zero. The deploy would never run.
#
# The account therefore has a real shell, and this forced command is what
# constrains it. Installed in authorized_keys as:
#
#   command="/srv/aau/production/deploy/scripts/ssh-forced-command.sh",\
#   no-agent-forwarding,no-port-forwarding,no-x11-forwarding,no-pty \
#   ssh-ed25519 AAAA... aau-deploy@ci
#
# With a forced command, sshd ignores whatever command the client requested and
# always runs THIS script; the client's requested command is preserved only in
# $SSH_ORIGINAL_COMMAND. So even a stolen CI key can do exactly one thing:
# trigger a deployment of an image reference it supplies — and that reference is
# then constrained by deploy-entrypoint.sh to the exact production repository at
# an immutable digest. It cannot open a shell, forward ports, or run any other
# command.
#
# ── Ownership ─────────────────────────────────────────────────────────────
# This script RUNS unprivileged, as the deploy account. It is not OWNED by it,
# and the distinction is the whole point: this file is what constrains that
# account, so an account that could rewrite it would be constrained by nothing.
#
# Install it root-owned and root-writable only, along with every directory on
# its path — the environment is derived from that path below, so being able to
# replace a parent directory is equivalent to being able to edit this file.
# `~/.ssh/authorized_keys` must be root-owned too, or the account can simply
# add a second key without the forced command.
#
# The only privileged step is the single wildcard-free sudo call to the
# root-owned entrypoint, which re-validates the image.
# See deploy/STAGING_VPS_CONTRACT.md §7.2 for the exact chown/chmod.

set -euo pipefail

fail() { printf '[ssh-forced-command] ERROR: %s\n' "$*" >&2; exit 1; }

# ── The environment comes from this file's own installed path ─────────────
# NOT from the environment, and not from a hardcoded constant that has to be
# hand-edited per copy. An SSH client can request environment variables, so a
# `${DEPLOY_ROOT:-...}` fallback would be caller-controlled at a privileged
# boundary. And a hand-edited constant fails the other way: copying the
# production file to the staging account without remembering to edit it would
# point the staging key at the PRODUCTION entrypoint.
#
# Deriving it from the path removes both. It matches how the root-owned
# entrypoints select their environment, so the two cannot disagree, and an
# unrecognised location is refused rather than guessed.
self="$(readlink -f "${BASH_SOURCE[0]}")"
case "$self" in
  /srv/aau/production/deploy/scripts/ssh-forced-command.sh)
    readonly DEPLOY_ROOT="/srv/aau/production/deploy" ;;
  /srv/aau/staging/deploy/scripts/ssh-forced-command.sh)
    readonly DEPLOY_ROOT="/srv/aau/staging/deploy" ;;
  *)
    fail "this forced command is installed at an unrecognised path: ${self}
  It must be at /srv/aau/<production|staging>/deploy/scripts/ssh-forced-command.sh,
  because that path is what selects the environment. Refusing to guess."
    ;;
esac
readonly ENTRYPOINT="${DEPLOY_ROOT}/scripts/deploy-entrypoint.sh"

# An interactive login attempt (no requested command) has an empty
# SSH_ORIGINAL_COMMAND. Refuse it: this key is for deployments only.
request="${SSH_ORIGINAL_COMMAND:-}"
[[ -n "$request" ]] || fail "this key may only trigger a deployment; no interactive shell is permitted"

# The client may send only a fixed, tiny vocabulary. Reject anything with a
# newline or a shell control character before it reaches the privileged
# boundary. The entrypoints validate again — this is defence in depth, not the
# only check.
if [[ "$request" == *$'\n'* || "$request" == *$'\r'* ]]; then
  fail "refusing a multi-line command"
fi
# Disable pathname expansion before the word-split so a value containing a glob
# metacharacter cannot expand against the deploy account's home directory.
set -f
# shellcheck disable=SC2086
set -- $request
set +f

# ── The whole vocabulary ──────────────────────────────────────────────────
# Exactly one shape is accepted:
#
#   <image@sha256:...>     deploy that release
#
# It dispatches to the root-owned entrypoint through its wildcard-free sudoers
# rule. It is not a shell and takes no path. (The former `seed <mode>` verb was
# removed with the canonical Seed: environments keep their data on the server
# and are recovered from verified backups, never re-seeded.)
[[ $# -eq 1 ]] || fail "expected exactly one image reference, got $# tokens"
# Hand the single validated token to the root-owned entrypoint. `sudo -n`
# fails closed if the wildcard-free NOPASSWD rule is absent.
exec sudo -n "$ENTRYPOINT" "$1"
