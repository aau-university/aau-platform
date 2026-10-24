#!/usr/bin/env bash
# Shared operation lock for coherence-sensitive host operations.
#
# ── Why one lock, not one per script ──────────────────────────────────────
# deploy, restore, a standalone quiesced backup and the one-shot Seed all
# mutate the SAME state: the PostgreSQL cluster, the uploads tree, the running
# app container and the release-state file. Any two of them running at once can
# produce an incoherent result — a restore dropping the schema while a backup
# is dumping it, two restores interleaving `DROP SCHEMA`, a deploy cutting over
# mid-restore. So they serialize against one lock file per ENVIRONMENT
# (production and staging have separate deploy roots and therefore separate
# locks; they never contend with each other).
#
# ── Why an inherited-lock handoff, not a recursive lock ───────────────────
# deploy.sh legitimately invokes backup.sh as a child. `flock(2)` locks are
# held per open file description, so a child opening the SAME path on a NEW
# descriptor would block forever against its own parent — a guaranteed
# deadlock. POSIX offers no "recursive flock".
#
# The fix is an explicit handoff: a holder exports AAU_OPLOCK_FILE and
# AAU_OPLOCK_PID, and a descendant that asks for the same lock re-uses the
# ancestor's hold instead of trying to take it again. Environment variables
# only propagate DOWNWARD, so this cannot make an unrelated process believe it
# holds the lock. The recorded PID is re-checked for liveness, so a stale value
# inherited from a dead holder falls through to a real acquisition rather than
# silently proceeding unlocked.
#
# This is a coherence mechanism, not a privilege boundary. It stops operators
# and automation from colliding; it is not a defence against a hostile local
# user, who could simply not call it.

# oplock_acquire <lock-file> <operation-name>
#
# Acquires the lock on the calling shell's own descriptor and keeps it for the
# lifetime of the process. The kernel releases it when the last descriptor
# referring to it closes, so no explicit release call — and no cleanup trap —
# is needed even if the operation is SIGKILLed.
#
# MEASURED, and deliberate: children inherit the descriptor, so the lock stays
# held until the holder AND every descendant still carrying it have exited. If
# deploy.sh is killed mid-`docker compose up`, the lock is retained by that
# still-running docker child. That is the property we want — the operation is
# genuinely still in flight, and releasing the lock at that moment would let a
# second operation start on top of it. An operator investigating a stuck lock
# can read `<lock-file>.status` for the operation name and PID.
#
# Set OPLOCK_WAIT_SECONDS to queue instead of failing immediately.
oplock_acquire() {
  local lock_file="$1" operation="$2" wait_seconds="${OPLOCK_WAIT_SECONDS:-0}"
  local resolved holder_alive=false

  mkdir -p "$(dirname "$lock_file")"
  # Normalise so `/a/b/../lock` and `/a/lock` are recognised as one lock.
  : >> "$lock_file"
  resolved="$(readlink -f "$lock_file")"

  if [[ -n "${AAU_OPLOCK_FILE:-}" && "$AAU_OPLOCK_FILE" == "$resolved" ]]; then
    if [[ -n "${AAU_OPLOCK_PID:-}" ]] && kill -0 "$AAU_OPLOCK_PID" 2>/dev/null; then
      holder_alive=true
    fi
    if [[ "$holder_alive" == "true" ]]; then
      printf '[oplock] %s proceeding under the lock already held by PID %s\n' \
        "$operation" "$AAU_OPLOCK_PID" >&2
      return 0
    fi
    printf '[oplock] ignoring a stale AAU_OPLOCK_PID (%s is not running)\n' \
      "${AAU_OPLOCK_PID:-<unset>}" >&2
  fi

  # A fresh descriptor for this process. Assigning to a caller-visible global
  # keeps it open — closing it would drop the lock. Opened for APPEND, never
  # truncate: `>` would empty the file before flock is even attempted, so a
  # process that goes on to be REFUSED the lock would still have destroyed the
  # current holder's breadcrumb.
  exec {AAU_OPLOCK_FD}>>"$resolved"

  if (( wait_seconds > 0 )); then
    if ! flock --wait "$wait_seconds" "$AAU_OPLOCK_FD"; then
      printf '[oplock] ERROR: %s could not acquire %s within %ss; another operation holds it\n' \
        "$operation" "$resolved" "$wait_seconds" >&2
      return 1
    fi
  elif ! flock --nonblock "$AAU_OPLOCK_FD"; then
    printf '[oplock] ERROR: %s refused — another operation already holds %s.\n' \
      "$operation" "$resolved" >&2
    printf '[oplock] deploy, restore, standalone backup and seed are mutually exclusive.\n' >&2
    return 1
  fi

  # Record the holder for descendants, and leave a human-readable breadcrumb
  # beside the lock so an operator can see what is running. The breadcrumb is a
  # SEPARATE file that is rewritten (not appended) by each holder, so it never
  # grows without bound and always shows the current operation.
  export AAU_OPLOCK_FILE="$resolved"
  export AAU_OPLOCK_PID="$$"
  printf '%s pid=%s started=%s\n' "$operation" "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    > "${resolved}.status" 2>/dev/null || true

  printf '[oplock] %s acquired %s\n' "$operation" "$resolved" >&2
}
