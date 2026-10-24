#!/usr/bin/env bash
# Report on backup and image retention. READ-ONLY — it deletes nothing.
#
# ── Why a report and not a pruner ─────────────────────────────────────────
# Retention on this host is one contract with two halves that can be broken
# independently:
#
#   * a backup is only a restore point if the application image recorded in its
#     metadata can still be obtained. `restore.sh` starts THAT image, because a
#     restored schema needs the build that understands it;
#   * an image is only safe to retire once no retained backup names it.
#
# So the dangerous operation is not "delete an old backup" — it is "delete an
# image that a retained backup still depends on", which produces no error at all
# until the day someone needs to restore. Automating that deletion would put the
# decision in a cron job. This surfaces the facts and leaves the decision to a
# person.
#
# `docker system prune --volumes` must NEVER be run on this host: it would
# destroy the PostgreSQL data and the uploads.
#
# Usage:
#   deploy/scripts/retention-report.sh
#   AAU_ENV=staging deploy/scripts/retention-report.sh

set -euo pipefail

readonly LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")/lib" && pwd)"
# shellcheck source=deploy/scripts/lib/environment.sh
source "${LIB}/environment.sh"

aau_env_resolve

# Every backup's usability is decided below by `docker image inspect`, whose
# failure is indistinguishable from "image not present" once stderr is
# discarded. The deploy accounts are deliberately NOT in the `docker` group, so
# without this check an operator running this read-only report unprivileged gets
# ABSENT for every backup and the instruction to treat each one as lost.
docker version >/dev/null 2>&1 \
  || { printf 'Cannot reach the Docker daemon (not running, or this account is not\npermitted to use it). Every backup would be reported ABSENT, so this\nrefuses rather than answer wrongly. Re-run with sudo.\n' >&2; exit 1; }

printf 'Retention report for %s\n' "$AAU_ENV"
printf '  backup root:  %s\n' "$AAU_BACKUP_ROOT"
printf '  release state: %s\n\n' "$AAU_STATE_FILE"

[[ -d "$AAU_BACKUP_ROOT" ]] || { printf 'No backup root yet.\n'; exit 0; }

current_image=""
[[ -f "$AAU_STATE_FILE" ]] && current_image="$(<"$AAU_STATE_FILE")"

unknown=0
missing=0
total=0
declare -A needed_images=()

printf '%-26s %-10s %-9s %s\n' 'BACKUP' 'SIZE' 'IMAGE' 'PAIRED IMAGE'
while IFS= read -r dir; do
  [[ -d "$dir" ]] || continue
  total=$((total + 1))
  name="$(basename "$dir")"
  size="$(du -sh "$dir" 2>/dev/null | cut -f1)"

  image=""
  [[ -f "${dir}/metadata.json" ]] \
    && image="$(sed -n 's/.*"app_image": *"\([^"]*\)".*/\1/p' "${dir}/metadata.json")"

  if [[ -z "$image" ]]; then
    # No image recorded at all. Counted separately from ABSENT: this backup
    # names nothing to pull, so the "not on this host" guidance below does not
    # apply to it and produces no `docker pull` line for it either.
    state='UNKNOWN'
    unknown=$((unknown + 1))
  elif docker image inspect "$image" >/dev/null 2>&1; then
    state='present'
    needed_images["$image"]=1
  else
    # Not on this host. It may still be pullable from the registry — which is
    # exactly the thing to check before assuming this backup is usable.
    state='ABSENT'
    missing=$((missing + 1))
    needed_images["$image"]=1
  fi

  printf '%-26s %-10s %-9s %s\n' "$name" "${size:-?}" "$state" "${image:-<none recorded>}"
done < <(find "$AAU_BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort)

printf '\n%d backup(s).\n' "$total"

if (( unknown > 0 )); then
  printf '\n%d backup(s) record no application image at all. Their pairing cannot be\n' "$unknown"
  printf 'established from here; verify each one before relying on it as a restore point.\n'
fi

if (( missing > 0 )); then
  printf '\n%d backup(s) name an application image that is NOT on this host.\n' "$missing"
  printf 'Each of those is only a restore point if the image can still be pulled:\n\n'
  for image in "${!needed_images[@]}"; do
    docker image inspect "$image" >/dev/null 2>&1 || printf '  docker pull %s\n' "$image"
  done
  printf '\nIf a pull fails, that backup cannot be restored. Treat it as lost, and\n'
  printf 'take a fresh verified backup of the current state.\n'
fi

printf '\nImages that must NOT be retired (a retained backup or the current release depends on them):\n'
[[ -n "$current_image" ]] && printf '  %s   (current release)\n' "$current_image"
for image in "${!needed_images[@]}"; do
  [[ "$image" == "$current_image" ]] && continue
  printf '  %s\n' "$image"
done

printf '\nOff-host copies are NOT visible from here. A backup that exists only on\n'
printf 'this disk does not survive the failure it is meant to protect against —\n'
printf 'see deploy/STAGING_VPS_CONTRACT.md §12.\n'
