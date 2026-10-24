#!/usr/bin/env bash
# Fault injection for the ONE dangerous window in the Neon import: the moment
# between the two database renames, when the live database NAME does not exist.
#
# The failure this drill exists to prevent, which the first implementation had:
#
#   1. rename live -> previous            succeeds
#   2. rename scratch -> live             FAILS
#   3. the script calls fail(), which exits
#   4. the EXIT trap drops the scratch database
#   -> staging now has NO database named <live>, and the only copy of the
#      migrated content has just been deleted.
#
# Every scenario below drives the real promote_database from
# migration/scripts/lib/promote.sh with a rename that fails exactly where the
# scenario wants it to, and asserts both the returned status and the recorded
# state — because the state is what the caller's cleanup handler reads before
# deciding whether anything may be dropped.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly IMPORT="${REPO_ROOT}/migration/scripts/neon-import.sh"

pass=0
fail_count=0
ok()  { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  FAIL %s\n       %s\n' "$1" "$2"; fail_count=$((fail_count + 1)); }
check() {
  if [[ "$2" == "$3" ]]; then ok "$1"
  else bad "$1" "expected: $3
       actual:   $2"; fi
}

# shellcheck source=migration/scripts/lib/promote.sh
source "${REPO_ROOT}/migration/scripts/lib/promote.sh"

log() { RENAME_LOG+=("$*"); }

# A rename that maintains a real (in-memory) set of database names, so a
# scenario cannot pass by accident: a rename of a database that is not there
# fails the way PostgreSQL would, and the final set of names is asserted.
DATABASES=""
RENAME_LOG=()
RENAME_FAIL_ON=""      # "<from>:<to>" that must fail, or "" for none
db_present() { [[ " ${DATABASES} " == *" $1 "* ]]; }
# promote.sh now requires this from its caller, and reconciles the catalog with
# it after a rename reports failure. neon-import.sh defines the real one.
db_exists() { db_present "$1"; }
# Order is an artifact of the fixture, not a property under test; compare sets.
db_set() { printf '%s' "$(printf '%s\n' $DATABASES | sort | tr '\n' ' ' | sed 's/ $//')"; }
rename_database() {
  local from="$1" to="$2" next="" name
  RENAME_LOG+=("rename ${from} -> ${to}")
  [[ "${from}:${to}" == "$RENAME_FAIL_ON" ]] && return 1
  db_present "$from" || return 1          # PostgreSQL: database does not exist
  db_present "$to" && return 1            # PostgreSQL: database already exists
  for name in $DATABASES; do
    [[ "$name" == "$from" ]] && name="$to"
    next="${next} ${name}"
  done
  DATABASES="${next# }"
  return 0
}

run_scenario() {
  DATABASES="live scratch"
  RENAME_LOG=()
  RENAME_FAIL_ON="$1"
  promotion_state=none
  promote_database live previous scratch
  PROMOTION_STATUS=$?
}

# The caller's rule, reproduced exactly: the scratch database may be dropped
# only when the promotion is complete or the live database is confirmed back.
may_drop_scratch() {
  [[ "$promotion_state" == "none" ]] && db_present live
}

printf '\n== 1. the happy path ==\n'
run_scenario ""
check 'promotion succeeds'                "$PROMOTION_STATUS" 0
check 'state is promoted'                 "$promotion_state"  promoted
check 'the migrated database is now live' "$(db_set)"        "live previous"

printf '\n== 2. the FIRST rename fails: nothing has changed ==\n'
run_scenario "live:previous"
check 'promotion reports a safe failure'  "$PROMOTION_STATUS" 1
check 'state is none'                     "$promotion_state"  none
check 'both databases keep their names'   "$(db_set)"        "live scratch"
if may_drop_scratch; then ok 'the scratch database may be dropped'
else bad 'the scratch database may be dropped' 'it was withheld unnecessarily'; fi

printf '\n== 2b. the first rename reports failure but COMMITTED ==\n'
# The server can commit an ALTER DATABASE and then lose the connection, so
# psql's non-zero status is not proof the rename did not happen. Reported as
# "nothing changed", this left the caller believing staging was untouched while
# no database held the live name — and the scratch database could then be
# dropped as if the promotion had never started.
DATABASES="live scratch"
RENAME_LOG=()
promotion_state=none
rename_database() {
  local from="$1" to="$2"
  RENAME_LOG+=("rename ${from} -> ${to}")
  case "${from}:${to}" in
    # Committed on the server, reported as a failure to the caller.
    live:previous) DATABASES="previous scratch"; return 1 ;;
  esac
  return 1
}
promote_database live previous scratch
status=$?
check 'promotion reports it needs manual repair'  "$status"           2
check 'state reflects the rename that happened'   "$promotion_state"  live_renamed
check 'nothing was dropped'                       "$(db_set)"         "previous scratch"
if may_drop_scratch; then
  bad 'the scratch database is withheld' 'it was offered for dropping while live was missing'
else
  ok 'the scratch database is withheld — no database holds the live name'
fi

printf '\n== 2c. an unreadable catalog is not "nothing happened" ==\n'
# db_exists reports every name as absent when the catalog cannot be read. That
# must land in the conservative branch, never in the "safe failure" one.
DATABASES="live scratch"
RENAME_LOG=()
promotion_state=none
db_exists() { return 1; }
rename_database() { RENAME_LOG+=("rename $1 -> $2"); return 1; }
promote_database live previous scratch
status=$?
check 'promotion reports it needs manual repair'  "$status"           2
check 'state is conservative'                     "$promotion_state"  live_renamed
if may_drop_scratch; then
  bad 'the scratch database is withheld' 'it was offered for dropping on an unreadable catalog'
else
  ok 'the scratch database is withheld on an unreadable catalog'
fi
db_exists() { db_present "$1"; }
# Both scenarios above replaced the fixture's rename_database; put the
# canonical one back so the scenarios below exercise what they think they do.
rename_database() {
  local from="$1" to="$2" next="" name
  RENAME_LOG+=("rename ${from} -> ${to}")
  [[ "${from}:${to}" == "$RENAME_FAIL_ON" ]] && return 1
  db_present "$from" || return 1          # PostgreSQL: database does not exist
  db_present "$to" && return 1            # PostgreSQL: database already exists
  for name in $DATABASES; do
    [[ "$name" == "$from" ]] && name="$to"
    next="${next} ${name}"
  done
  DATABASES="${next# }"
  return 0
}

printf '\n== 3. THE WINDOW: the second rename fails ==\n'
# This is the exact scenario that used to delete the migrated database.
run_scenario "scratch:live"
check 'promotion reports a safe failure'         "$PROMOTION_STATUS" 1
check 'state is none — the window was left'      "$promotion_state"  none
check 'the ORIGINAL live database name is back'  "$(db_set)"        "live scratch"
if [[ "${RENAME_LOG[*]}" == *"rename previous -> live"* ]]; then
  ok 'the rollback rename was issued automatically'
else
  bad 'the rollback rename was issued automatically' "log: ${RENAME_LOG[*]}"
fi
if may_drop_scratch; then ok 'the scratch database may be dropped once live is back'
else bad 'the scratch database may be dropped once live is back' 'it was withheld'; fi

printf '\n== 4. the second rename AND the rollback fail ==\n'
# Injected by making the rollback impossible: `live` is recreated underneath,
# so `previous -> live` collides the way PostgreSQL would.
DATABASES="live scratch"
RENAME_LOG=()
promotion_state=none
rename_database() {
  local from="$1" to="$2"
  RENAME_LOG+=("rename ${from} -> ${to}")
  case "${from}:${to}" in
    live:previous)    DATABASES="previous scratch"; return 0 ;;
    scratch:live)     return 1 ;;
    previous:live)    return 1 ;;   # the rollback fails too
  esac
  return 1
}
promote_database live previous scratch
status=$?
check 'promotion reports it needs manual repair' "$status"          2
check 'state stays live_renamed'                 "$promotion_state" live_renamed
check 'nothing was renamed away or deleted'      "$(db_set)"       "previous scratch"
if may_drop_scratch; then
  bad 'the scratch database is WITHHELD from the drop' \
      'it would have been dropped while no database is named live — this is the original data-loss bug'
else
  ok 'the scratch database is WITHHELD from the drop'
fi

printf '\n== 5. the import wires the state machine to its cleanup ==\n'
# The library is only half the fix; the caller has to honour the state. These
# assert the wiring that makes the guarantees above reach the real script.
import_src="$(cat "$IMPORT")"

if [[ "$import_src" == *'source "${HERE}/lib/promote.sh"'* ]]; then
  ok 'neon-import.sh uses the shared promotion state machine'
else
  bad 'neon-import.sh uses the shared promotion state machine' 'it does not source lib/promote.sh'
fi

if [[ "$import_src" == *'if [[ "$promotion_state" != "none" ]] || ! db_exists "$POSTGRES_DB"; then'* ]]; then
  ok 'drop_scratch refuses unless the live database is confirmed present'
else
  bad 'drop_scratch refuses unless the live database is confirmed present' 'the guard is missing'
fi

# The barrier is lifted against the maintenance database, so a live database
# that is mid-rename cannot strand the application role as NOLOGIN.
if [[ "$import_src" == *'psql -U "$POSTGRES_ADMIN_USER" -d postgres \'* ]]; then
  ok 'the LOGIN barrier is lifted independently of the live database name'
else
  bad 'the LOGIN barrier is lifted independently of the live database name' \
      'set_app_login still targets $POSTGRES_DB'
fi

# Asserted as an ORDER, not as an exact string: the handler legitimately grew a
# third step (dropping the staged uploads tree), and an exact-match assertion
# would have to be edited every time it does — which is how an assertion quietly
# stops meaning anything. What matters is that LOGIN is restored FIRST, so the
# application role is usable even when a later step refuses and exits early.
# cleanup() is currently written on ONE line, which the substitution below
# extracts exactly. Reformatting it across several lines is a legitimate edit
# and must not silently empty this check, so a multi-line extraction is tried
# next. If neither shape matches, cleanup_body stays empty and the assertion
# below reports `bad` — this fails closed, it does not fall through to `ok`.
cleanup_body="$(sed -n 's/^cleanup()[[:space:]]*{\(.*\)}$/\1/p' "$IMPORT")"
if [[ -z "${cleanup_body//[[:space:]]/}" ]]; then
  cleanup_body="$(
    awk '
      /^cleanup[[:space:]]*\([[:space:]]*\)[[:space:]]*\{/ { in_fn = 1; next }
      in_fn && /^\}/ { exit }
      in_fn { print }
    ' "$IMPORT"
  )"
fi
login_at="$(printf '%s' "${cleanup_body%%restore_app_login*}" | wc -c)"
drop_at="$(printf '%s' "${cleanup_body%%drop_scratch*}" | wc -c)"
if [[ "$cleanup_body" == *restore_app_login* && "$cleanup_body" == *drop_scratch* ]] \
   && (( login_at < drop_at )); then
  ok 'cleanup restores LOGIN before it considers dropping anything'
else
  bad 'cleanup restores LOGIN before it considers dropping anything' \
      "cleanup() is: ${cleanup_body:-<not found>}"
fi

# The single-invocation form is what made the window undetectable, so the guard
# is on the psql BOUNDARY inside rename_database(), not on a substring of the
# whole file.
#
# The previous form searched for a literal `\n` — two characters, inside single
# quotes — which no source file contains, so it could never fire and reported
# `ok` unconditionally. A mutation guard that cannot fail is worse than none: it
# reads as coverage. This counts what actually matters: more than one
# `ALTER DATABASE` reaching a single psql invocation.
rename_src="$(
  awk '
    /^rename_database[[:space:]]*\(\)[[:space:]]*\{/ { in_fn = 1 }
    in_fn { print }
    in_fn && /^}/ { exit }
  ' "$IMPORT"
)"
# `grep -o | wc -l`, not `grep -c`: the combined form this guards against puts
# both statements in ONE printf on ONE line, and `grep -c` counts matching
# LINES, so it would report 1 and the guard would pass on exactly the mutation
# it exists to catch (measured).
rename_alters="$(grep -o 'ALTER DATABASE' <<<"$rename_src" | wc -l)"
rename_psql="$(grep -o 'psql ' <<<"$rename_src" | wc -l)"
if [[ -z "${rename_src//[[:space:]]/}" ]]; then
  bad 'the two renames are issued separately' 'rename_database() was not found in neon-import.sh'
elif (( rename_alters > 1 && rename_psql == 1 )); then
  bad 'the two renames are issued separately' 'both are still sent in one psql invocation'
else
  ok 'the two renames are issued separately'
fi

# Under `set -e`, a bare `promote_database` that returns non-zero aborts the
# script before the status can be read — so every diagnostic below it, including
# the automatic rollback's "nothing was lost", would be replaced by a silent
# exit. `set -e` is only suspended for the left operand of `||` or an `if`
# condition, so the capture has to be written that way. Proven empirically here
# rather than asserted from the source alone.
sete_probe="$(
  bash -c '
    set -euo pipefail
    promote_database() { return 2; }
    promotion_status=0
    promote_database x y z || promotion_status=$?
    echo "reached:${promotion_status}"
  ' 2>&1 || true
)"
check 'the promotion status survives set -e' "$sete_probe" 'reached:2'

sete_bare="$(
  bash -c '
    set -euo pipefail
    promote_database() { return 2; }
    promote_database x y z
    promotion_status=$?
    echo "reached:${promotion_status}"
  ' 2>&1 || true
)"
if [[ -z "$sete_bare" ]]; then
  ok 'MUTATION: the bare-call form would abort silently (proving the idiom matters)'
else
  bad 'MUTATION: the bare-call form would abort silently' "it produced: ${sete_bare}"
fi

if [[ "$import_src" == *'promote_database "$POSTGRES_DB" "$PREVIOUS_DB" "$SCRATCH_DB" || promotion_status=$?'* ]]; then
  ok 'neon-import.sh captures the status with the set -e safe idiom'
else
  bad 'neon-import.sh captures the status with the set -e safe idiom' \
      'the bare-call form is back'
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail_count"
(( fail_count == 0 ))
