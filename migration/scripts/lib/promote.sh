#!/usr/bin/env bash
# The two-rename database promotion, and its automatic rollback.
#
# ── Why this is a library and not eight lines inline ──────────────────────
# This is the only genuinely dangerous moment in the Neon import: between the
# two renames the live database NAME does not exist. Inline, that window was
# unreachable by any test — it needs a real PostgreSQL, a real dump and a
# rename that fails on demand — so the one piece of the import that can leave
# staging without an application database was the one piece nothing exercised.
#
# Here it takes its rename operation as an injected function, so
# `tests/migration/neon-promotion-drill.sh` can fail whichever rename it likes
# and assert the resulting state. The behaviour is identical to the inline
# version; only its testability changed.
#
# ── The states, and why they are tracked rather than inferred ─────────────
#   none          the live database is under its own name — either nothing was
#                 renamed, or a failed promotion has been rolled back
#   live_renamed  THE WINDOW. The live database is aside and nothing carries its
#                 name. The migrated database is the only copy of the migration.
#   promoted      the migrated database IS the live database
#
# A caller cannot work this out after the fact from a single exit status: "the
# promotion failed" is the same status for "nothing happened" and "the live
# database is gone", and those two need opposite handling. So the state is
# recorded as it changes.

# Set before any promotion runs so `set -u` callers can read it unconditionally.
# Read by the caller's cleanup handler, not by this file — hence the disable.
# shellcheck disable=SC2034
promotion_state=none

# promote_database <live> <previous> <scratch>
#
# Requires the caller to define:
#   rename_database <from> <to>   — one rename, non-zero on failure
#   db_exists <name>              — 0 when a database of that name exists
#   log <message>                 — operator-visible progress
#
# Sets `promotion_state` and returns:
#   0  promoted            — <scratch> is now <live>, <previous> holds the old content
#   1  rolled back         — the promotion failed and <live> is back under its own
#                            name; nothing was lost and <scratch> is safe to drop
#   2  needs manual repair — the promotion AND the rollback failed; no database is
#                            named <live>; NOTHING may be dropped
# What the catalog ACTUALLY shows after a rename reported failure.
#
# `rename_database` runs one ALTER DATABASE through psql. The server can commit
# that rename and THEN lose the connection, so psql's non-zero status does not
# prove the rename did not happen — and a caller that assumes it did not can
# report "staging is unchanged" while no database holds the live name.
#
# Conservative by construction: anything other than the two states we can name
# with confidence is treated as "the window is open, drop nothing". A catalog
# that cannot be read reports every name as absent, which lands in exactly that
# branch rather than in a false "nothing happened".
reconcile_after_failed_rename() {
  local live="$1" previous="$2"
  local live_here=false previous_here=false
  db_exists "$live" && live_here=true
  db_exists "$previous" && previous_here=true

  if [[ "$live_here" == "true" && "$previous_here" == "false" ]]; then
    log "catalog check: ${live} is still in place; the rename did not take effect"
    printf 'unchanged'
  elif [[ "$live_here" == "false" && "$previous_here" == "true" ]]; then
    log "ERROR: the rename FAILED but the catalog shows it took effect:"
    log "ERROR: no database is named ${live}; its content is under ${previous}"
    printf 'renamed'
  else
    log "ERROR: the catalog could not be reconciled after a failed rename"
    log "ERROR: live=${live_here} previous=${previous_here} — nothing may be dropped"
    printf 'unknown'
  fi
}

promote_database() {
  local live="$1" previous="$2" scratch="$3"

  # Step 1 of 2. A failure here changes nothing at all, so it is the cheap case:
  # the caller can simply abort and let the scratch database be dropped.
  if ! rename_database "$live" "$previous"; then
    # Do not assume nothing happened — ask the catalog.
    case "$(reconcile_after_failed_rename "$live" "$previous")" in
      unchanged)
        promotion_state=none
        return 1 ;;
      *)
        # The rename may have committed, or the state is unreadable. Either way
        # the live name may be gone, which is the caller's "do not drop
        # anything, a human must look" case.
        promotion_state=live_renamed
        return 2 ;;
    esac
  fi
  promotion_state=live_renamed

  # Step 2 of 2 — inside the window.
  if rename_database "$scratch" "$live"; then
    promotion_state=promoted
    return 0
  fi

  log "ERROR: could not rename the migrated database into place"
  log "restoring ${live} from ${previous} before doing anything else"

  # Automatic, immediate, and BEFORE the caller's cleanup can run. A database
  # that has merely not been promoted is recoverable; an environment with no
  # database under the expected name is an outage, and one whose only migrated
  # copy was then dropped by a cleanup handler is data loss.
  if rename_database "$previous" "$live"; then
    promotion_state=none
    return 1
  fi

  # The rollback reported failure — which, again, is not proof it did not
  # happen. If the catalog shows the live name restored, this is the ordinary
  # rolled-back case and the scratch database is safe to drop.
  case "$(reconcile_after_failed_rename "$previous" "$live")" in
    renamed)
      log "the catalog shows ${live} restored despite the error; treating this as rolled back"
      promotion_state=none
      return 1 ;;
    *)
      # The state is reported exactly, and the caller must not delete anything.
      promotion_state=live_renamed
      return 2 ;;
  esac
}
