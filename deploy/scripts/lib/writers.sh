#!/usr/bin/env bash
# One definition of "every application writer is frozen", shared by backup and
# restore so the two cannot drift. seed reaches it through backup.
#
# ── What counts as an application writer ──────────────────────────────────
# Not just app-prod. A crashed or interrupted earlier operation, or an in-flight
# one, can leave other things connected to the SAME database:
#
#   app-prod        the live application;
#   app-candidate   a candidate release from an in-flight or abandoned deploy,
#                   which connects to the same database and is NOT stopped by
#                   `compose stop app-prod`;
#   one-off runs    `compose run --rm ...` (the one-shot Seed) creates
#                   containers that are not services, so no `compose stop`
#                   reaches them.
#
# The data services (postgres-prod, redis-prod) must stay UP — the backup dumps
# through them and the restore replaces the schema underneath them.
#
# ── What "frozen" means, and what it does NOT ─────────────────────────────
# Frozen means none of those writers is in an ACTIVE docker state:
# running | restarting | paused | removing. It is deliberately NOT
# `compose ps --status running`: a container with `restart: unless-stopped`
# that is crash-looping sits in `restarting`, which that filter does not report.
#
# ── Fail closed, and tolerate only TRANSIENT states ───────────────────────
# Two things this must get right, both learned from a real CI flake and review:
#
#   1. "Cannot observe" is NOT "observed safe". If `docker ps` itself fails, the
#      writer state is UNKNOWN, and UNKNOWN must fail closed — never be read as
#      "no writers". The stop attempts are best-effort (`|| true`), but the
#      PROOF enumeration checks docker's exit status and aborts if it failed.
#   2. A one-off container from a just-finished `compose run --rm` can sit in
#      `removing` for a moment. That is transient, not a live writer, so the
#      proof RETRIES with a bounded budget rather than failing on the first
#      sample — while a genuinely active writer never clears and still fails.

readonly AAU_WRITER_SERVICES=(app-prod app-candidate)
readonly AAU_DATA_SERVICES=(postgres-prod redis-prod)
# Bounded proof budget. Overridable for tests; never an unbounded wait.
: "${AAU_WRITERS_FREEZE_ATTEMPTS:=40}"
: "${AAU_WRITERS_FREEZE_INTERVAL:=0.5}"

# writers__active_set <project>
# Prints the active (running|restarting|paused|removing) NON-data containers,
# one per line. Return status:
#   0  enumeration succeeded (stdout is the active set, possibly empty)
#   2  enumeration itself FAILED — state is UNKNOWN, caller must fail closed
writers__active_set() {
  local project="$1" rows rc row service rest state s is_data active=""
  rows="$(docker ps -a \
    --filter "label=com.docker.compose.project=${project}" \
    --format '{{.Label "com.docker.compose.service"}}|{{.State}}|{{.Names}}' 2>/dev/null)"
  rc=$?
  (( rc != 0 )) && return 2
  while IFS= read -r row; do
    [[ -n "$row" ]] || continue
    service="${row%%|*}"
    rest="${row#*|}"
    state="${rest%%|*}"
    case "$state" in
      running|restarting|paused|removing) ;;
      *) continue ;;
    esac
    is_data=false
    for s in "${AAU_DATA_SERVICES[@]}"; do [[ "$service" == "$s" ]] && is_data=true; done
    [[ "$is_data" == "true" ]] && continue
    active+="  ${row}"$'\n'
  done <<< "$rows"
  printf '%s' "$active"
  return 0
}

# writers_freeze <project> <compose-fn>
#   <compose-fn> is the caller's compose wrapper, invoked as: "$fn" stop svc...
# Stops every application writer (services + one-off containers), then PROVES
# none is active with a bounded retry. Returns 0 only when the active writer set
# is proven empty; returns 1 on timeout OR when the state cannot be observed at
# all (fail closed). Does not touch the data services.
writers_freeze() {
  local project="$1" compose_fn="$2"

  # 1. Stop the known writer services (best effort; the proof below is strict).
  "$compose_fn" stop "${AAU_WRITER_SERVICES[@]}" >/dev/null 2>&1 || true

  # 2. Stop one-off containers (compose run --rm, e.g. the one-shot Seed): these
  #    are not services, so `compose stop` never reaches them. Best effort — if
  #    this enumeration fails, the strict proof in step 3 still catches it.
  local oneoff oneoff_rc
  oneoff="$(docker ps -aq \
    --filter "label=com.docker.compose.project=${project}" \
    --filter "label=com.docker.compose.oneoff=True" 2>/dev/null)"
  oneoff_rc=$?
  if (( oneoff_rc == 0 )) && [[ -n "$oneoff" ]]; then
    # shellcheck disable=SC2086
    docker stop $oneoff >/dev/null 2>&1 || true
  fi

  # 3. Prove it, with a bounded retry so a transient `removing`/`restarting`
  #    container clears rather than failing the check, and with a hard
  #    fail-closed if the state cannot be enumerated at all.
  local attempts="$AAU_WRITERS_FREEZE_ATTEMPTS" active rc
  while (( attempts-- > 0 )); do
    active="$(writers__active_set "$project")"
    rc=$?
    if (( rc == 2 )); then
      printf 'writers_freeze: could not enumerate container state for project %s (docker ps failed).\n' "$project" >&2
      printf 'writers_freeze: state is UNKNOWN, refusing to claim writers are frozen.\n' >&2
      return 1
    fi
    [[ -z "$active" ]] && return 0
    sleep "$AAU_WRITERS_FREEZE_INTERVAL"
  done
  printf 'application writers still active after %s attempts:\n%s' \
    "$AAU_WRITERS_FREEZE_ATTEMPTS" "$active" >&2
  return 1
}
