#!/usr/bin/env bash
# End-to-end drill for the REAL deploy/backup/restore scripts, starting from a
# completely empty host state.
#
# Every phase drives `deploy/scripts/*.sh` directly — the tooling an operator
# actually runs — rather than reimplementing the sequence. Regression coverage
# for the failure modes fixed after review:
#
#   1  first install   deploy.sh from nothing: no stack, no database, no
#                      deployed-image record, no backup directory
#   2  redeploy        second deploy.sh run takes and verifies a real backup
#   3  metadata        the backup records the image/revision/migration state it
#                      is compatible with
#   4  integrity       a corrupted uploads archive is REJECTED (tar --test
#                      passes on corrupt archives, so it cannot be the check)
#   5  rollback        a failing candidate that changed the schema must NOT
#                      auto-start the previous image
#   6  restore         restore.sh recovers using the image recorded with the
#                      backup, not a stale APP_IMAGE
#
# Usage: tests/docker/first-install-and-recovery-drill.sh [image-reference]

set -euo pipefail

readonly IMAGE="${1:-aau-runner:test}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-first-$$"

readonly ADMIN_EMAIL="admin@aau.simulation.test"
readonly ADMIN_PASSWORD="Simulation-Bootstrap-2026!"
readonly LATEST_MIGRATION="20260815_025241_one_study_plan_per_program"

WORKDIR="$(mktemp -d)"
DEPLOY_DIR="${WORKDIR}/deploy"
UPLOADS_DIR="${WORKDIR}/uploads"
DRILL_BACKUPS="${WORKDIR}/backups"
DRILL_ENV="${DEPLOY_DIR}/.env.production"
VPS_COMPOSE="${DEPLOY_DIR}/docker-compose.vps.yml"
# Distinct ports per drill so several can run on one CI runner without
# colliding, and so none of them binds a real 3000.
DRILL_APP_PORT="${DRILL_APP_PORT:-13920}"
DRILL_CANDIDATE_PORT="${DRILL_CANDIDATE_PORT:-13921}"

failures=0
phase() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }
info() { printf '  ....  %s\n' "$*"; }

cleanup() {
  compose --profile candidate down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  # Phase 7's separate, virgin environment.
  if [[ -n "${INIT_PROJECT:-}" ]]; then
    env APP_IMAGE=placeholder:down APP_HOST_PORT="${INIT_APP_PORT:-13900}" \
        CANDIDATE_HOST_PORT="${INIT_CANDIDATE_PORT:-13901}" \
        UPLOADS_HOST_PATH="${INIT_UPLOADS:-/nonexistent}" \
      docker compose -p "$INIT_PROJECT" --env-file "${INIT_ENV:-/dev/null}" \
        -f "$VPS_COMPOSE" --profile candidate down --volumes --remove-orphans \
        >/dev/null 2>&1 || true
    docker ps -aq --filter "name=${INIT_PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  fi
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$WORKDIR" 2>/dev/null || sudo rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# APP_IMAGE is supplied here rather than from the env file: release identity
# deliberately has no configuration default, so compose — which parses the whole
# file for every subcommand, `down` and `ps` included — needs an explicit value.
compose() {
  env APP_IMAGE="${APP_IMAGE:-${IMAGE}}" \
      APP_HOST_PORT="${DRILL_APP_PORT}" \
      CANDIDATE_HOST_PORT="${DRILL_CANDIDATE_PORT}" \
      UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    docker compose -p "$PROJECT" --env-file "$DRILL_ENV" -f "$VPS_COMPOSE" "$@"
}
psql_admin() {
  compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1" 2>/dev/null || true
}

# Mirror a real VPS layout: operational files only, no repository checkout.
mkdir -p "$DEPLOY_DIR" "${UPLOADS_DIR}/media" "${UPLOADS_DIR}/private" "$DRILL_BACKUPS"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "$DEPLOY_DIR/"
cp -r "${REPO_ROOT}/deploy/postgres" "$DEPLOY_DIR/"
cp -r "${REPO_ROOT}/deploy/scripts" "$DEPLOY_DIR/"
# Container runs as UID/GID 10001, not this drill's own uid. `chmod 0777` on the
# throwaway fixture dir lets the container write it without privilege while the
# drill keeps host-side control; chowning to 10001 would need sudo and lock the
# non-root drill out of its own directory.
chmod -R 0777 "$UPLOADS_DIR"

# ── Env file: the real contract, with deliberately hostile dummy secrets ──
# Every value is SINGLE-QUOTED, which is the only env-file form `docker compose`
# passes through byte for byte (measured in tests/deploy/env-contract-drill.sh).
# The passwords contain the interpolation, comment, URI-reserved and whitespace
# characters that a genuinely strong password contains, so the drill exercises
# the URI-encoding and redis.conf-quoting paths rather than a tame ASCII value.
#
# There is deliberately NO APP_IMAGE line: release identity lives in the
# release-state file, not in configuration.
cat > "$DRILL_ENV" <<EOF
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='drill-payload-secret-at-least-32-characters-long'
INITIAL_ADMIN_EMAIL='${ADMIN_EMAIL}'
INITIAL_ADMIN_PASSWORD='${ADMIN_PASSWORD}'
UPLOADS_HOST_PATH='${UPLOADS_DIR}'
EOF

run_deploy() {
  COMPOSE_PROJECT_NAME="$PROJECT" \
  AAU_APP_PORT="$DRILL_APP_PORT" \
  AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
  DEPLOY_ROOT="$DEPLOY_DIR" \
  ENV_FILE="$DRILL_ENV" \
  COMPOSE_FILE="$VPS_COMPOSE" \
  BACKUP_ROOT="$DRILL_BACKUPS" \
  UPLOADS_HOST_PATH="$UPLOADS_DIR" \
  HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT:-420}" \
    bash "${DEPLOY_DIR}/scripts/deploy.sh" "$@"
}

run_script() {
  local script="$1"; shift
  COMPOSE_PROJECT_NAME="$PROJECT" \
  AAU_APP_PORT="$DRILL_APP_PORT" \
  AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
  DEPLOY_ROOT="$DEPLOY_DIR" \
  ENV_FILE="$DRILL_ENV" \
  COMPOSE_FILE="$VPS_COMPOSE" \
  BACKUP_ROOT="$DRILL_BACKUPS" \
  UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    bash "${DEPLOY_DIR}/scripts/${script}" "$@"
}

# `deploy.sh` resolves a registry digest, which a locally-built tag does not
# have. Provide a local registry so the drill exercises the real digest path
# instead of a special case.
phase "Phase 0 — local registry so the real digest path is exercised"
registry_name="${PROJECT}-registry"
docker run -d --name "$registry_name" -p 127.0.0.1:5555:5000 registry:2 >/dev/null 2>&1 \
  && sleep 3 && pass "local registry started" || { fail "could not start a local registry"; exit 1; }
LOCAL_REF="127.0.0.1:5555/aau-runner:drill"
docker tag "$IMAGE" "$LOCAL_REF"
docker push "$LOCAL_REF" >/dev/null 2>&1 && pass "runner image pushed to the local registry" \
  || { fail "could not push to the local registry"; exit 1; }
cleanup_registry() { docker rm -f "$registry_name" >/dev/null 2>&1 || true; }
trap 'cleanup_registry; cleanup' EXIT

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 1 — first install from a completely empty host"

[[ ! -f "${DEPLOY_DIR}/deployed-image" ]] && pass "no deployed-image record exists yet" \
  || fail "state file already present"
[[ -z "$(ls -A "$DRILL_BACKUPS")" ]] && pass "no backups exist yet" || fail "backups already present"

first_log="${WORKDIR}/first-install.log"
if run_deploy "$LOCAL_REF" > "$first_log" 2>&1; then
  pass "deploy.sh succeeded from an empty host"
else
  fail "deploy.sh failed on first install"
  tail -30 "$first_log"
fi

grep -q "first install detected" "$first_log" \
  && pass "first install was detected explicitly, not silently skipped" \
  || fail "first install was not reported"

# The critical regression: the backup gate must not abort a first install by
# trying to dump a database that does not exist yet.
grep -q "pre-cutover backup failed" "$first_log" \
  && fail "the backup gate aborted the first install" \
  || pass "the backup gate did not abort the first install"

[[ -z "$(ls -A "$DRILL_BACKUPS")" ]] \
  && pass "no bogus backup was written for an empty database" \
  || fail "a backup was written despite there being no data"

roles="$(psql_admin "SELECT string_agg(slug, ' ' ORDER BY slug) FROM roles")"
[[ "$roles" == "admin content_manager coordinator doctor student super_admin" ]] \
  && pass "all canonical Roles exist after first install" || fail "roles after first install: ${roles}"

users="$(psql_admin "SELECT count(*) FROM users")"
[[ "$users" == "1" ]] && pass "the Super Admin was created by first install" || fail "user count ${users}"

[[ -s "${DEPLOY_DIR}/deployed-image" ]] && pass "deployed-image record written" || fail "no state file"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 2 — redeploy takes and verifies a real backup"

compose exec -T --user 10001 app-prod sh -c \
  'printf "first-install-media" > /app/uploads/media/drill.txt'
# No permission fixing here. initialize-from-backup.sh establishes the uploads
# ownership itself -- chown, falling back to sudo when it is not run as root,
# exactly as restore.sh already does when it stages uploads. Trying to
# pre-arrange the modes from this drill was the wrong layer and could not work:
# the tree has two owners (these directories belong to the drill's user, the
# file above to the container as UID 10001) and chmod is the owner's privilege
# alone, so neither identity can cover the whole tree.
psql_admin "CREATE TABLE IF NOT EXISTS drill_canary (marker text)" >/dev/null
psql_admin "INSERT INTO drill_canary VALUES ('keep-me')" >/dev/null

second_log="${WORKDIR}/redeploy.log"
if run_deploy "$LOCAL_REF" > "$second_log" 2>&1; then
  pass "redeploy succeeded"
else
  fail "redeploy failed"; tail -30 "$second_log"
fi

grep -q "first install detected" "$second_log" \
  && fail "redeploy wrongly reported a first install" \
  || pass "redeploy was not treated as a first install"

backup_count="$(find "$DRILL_BACKUPS" -mindepth 1 -maxdepth 1 -type d | wc -l)"
[[ "$backup_count" -ge 1 ]] && pass "redeploy created a backup (${backup_count})" \
  || fail "redeploy created no backup"

backup_dir="$(find "$DRILL_BACKUPS" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 3 — backup records the compatible application state"

meta="${backup_dir}/metadata.json"
if [[ -s "$meta" ]]; then
  pass "metadata.json written"
  grep -q '"app_image": *"[^"]\+"' "$meta" && pass "records the application image" \
    || fail "no app_image recorded"
  # The property that matters is faithfulness: metadata must record exactly the
  # revision the deployed image carries, and must not invent one when it does
  # not. CI builds the drill image with `--build-arg IMAGE_REVISION=<sha>`, so
  # the populated branch is exercised there; a local `docker build` without
  # that argument legitimately has no revision, and the empty branch proves the
  # value is read rather than fabricated.
  image_label_revision="$(docker image inspect --format \
    '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE" 2>/dev/null || true)"
  meta_revision="$(sed -n 's/.*"image_revision": *"\([^"]*\)".*/\1/p' "$meta")"

  if [[ "$meta_revision" == "$image_label_revision" ]]; then
    pass "records the deployed image's git revision exactly (${meta_revision:-<image carries none>})"
  else
    fail "image_revision '${meta_revision}' does not match the image label '${image_label_revision}'"
  fi

  if [[ -n "$image_label_revision" ]]; then
    grep -q '"image_revision": *"[0-9a-f]\{7,\}"' "$meta" \
      && pass "the recorded revision is a usable commit SHA" \
      || fail "image carries revision '${image_label_revision}' but metadata did not record it"
  else
    info "this image carries no revision label (local build); CI builds pass IMAGE_REVISION"
  fi
  grep -q '"applied_migrations": *"[^"]\+"' "$meta" \
    && pass "records the applied migration state" || fail "no migration state recorded"
else
  fail "metadata.json missing from the backup"
fi

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 4 — corrupt uploads archive is rejected"

# `tar --test` passes on corrupt AND truncated archives because it seeks past
# data blocks. Prove the real check catches what tar --test would not.
corrupt_dir="${WORKDIR}/corrupt-backup"
cp -r "$backup_dir" "$corrupt_dir"
archive="${corrupt_dir}/uploads.tar.gz"
if [[ -f "$archive" ]]; then
  size=$(stat -c%s "$archive")
  printf '\xff\xff\xff\xff\xff\xff\xff\xff' \
    | dd of="$archive" bs=1 seek=$((size / 2)) conv=notrunc status=none

  if tar --test --file "$archive" >/dev/null 2>&1; then
    info "confirmed: tar --test still passes on this corrupted archive"
  fi
  gzip --test "$archive" >/dev/null 2>&1 \
    && fail "gzip --test passed on a corrupted archive" \
    || pass "gzip --test rejects the corrupted archive"

  # restore.sh must refuse before destroying anything.
  if run_script restore.sh "$corrupt_dir" > "${WORKDIR}/corrupt-restore.log" 2>&1; then
    fail "restore.sh accepted a corrupted uploads archive"
  else
    pass "restore.sh refuses a corrupted uploads archive"
  fi
  grep -qiE "checksum|gzip integrity" "${WORKDIR}/corrupt-restore.log" \
    && pass "refusal names the integrity failure" \
    || { fail "refusal did not explain the integrity failure"; tail -5 "${WORKDIR}/corrupt-restore.log"; }
else
  fail "no uploads archive in the backup to corrupt"
fi

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 5a — rollback REFUSES when the candidate changed the schema"

# A genuine end-to-end scenario, not a simulated ledger edit:
#
#   1. roll the schema back one migration so the candidate has real pending
#      work (using that migration's own `down` SQL);
#   2. give the candidate an identity-bootstrap configuration that fails —
#      an unknown INITIAL_ADMIN_EMAIL with no password. Payload applies
#      `prodMigrations` during db.connect() and only then runs `onInit`, so
#      the migration genuinely lands BEFORE the failure;
#   3. the health gate therefore never passes, with the ledger changed
#      *during* the deployment, after deploy.sh captured MIGRATIONS_BEFORE.
#
# The previous drill inserted the ledger row before deploy.sh ran and used a
# database-unreachable env, so `migration_state()` returned empty both times
# and the UNCHANGED branch was taken — the test passed for the wrong reason.

ledger_before_5a="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
info "ledger before 5a: ${ledger_before_5a}"

# Undo the latest migration using its own down() SQL.
psql_admin "DROP INDEX \"study_plans_academic_program_idx\";
  CREATE INDEX \"academicProgram_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");
  CREATE INDEX \"version_academicProgram_idx\" ON \"_study_plans_v\" USING btree (\"version_academic_program_id\");
  CREATE INDEX \"study_plans_academic_program_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");" >/dev/null
psql_admin "DELETE FROM payload_migrations WHERE name = '${LATEST_MIGRATION}'" >/dev/null

staged="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
if [[ "$staged" != "$ledger_before_5a" ]]; then
  pass "schema staged one migration behind (pending: ${LATEST_MIGRATION})"
else
  fail "could not stage a pending migration"
fi

# Bootstrap fails AFTER migrations apply: unknown account, no password.
bootstrap_fail_env="${WORKDIR}/.env.bootstrap-fail"
# Single-quoted, matching the env-file contract the deploy scripts enforce.
sed -e "s/^INITIAL_ADMIN_EMAIL=.*/INITIAL_ADMIN_EMAIL='never-created@aau.test'/" \
    -e '/^INITIAL_ADMIN_PASSWORD=/d' "$DRILL_ENV" > "$bootstrap_fail_env"

changed_log="${WORKDIR}/rollback-changed.log"
if env COMPOSE_PROJECT_NAME="$PROJECT" DEPLOY_ROOT="$DEPLOY_DIR" ENV_FILE="$bootstrap_fail_env" \
   COMPOSE_FILE="$VPS_COMPOSE" BACKUP_ROOT="$DRILL_BACKUPS" UPLOADS_HOST_PATH="$UPLOADS_DIR" \
   AAU_APP_PORT="$DRILL_APP_PORT" AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
   HEALTH_TIMEOUT_SECONDS=90 SKIP_BACKUP=true \
   bash "${DEPLOY_DIR}/scripts/deploy.sh" "$LOCAL_REF" > "$changed_log" 2>&1; then
  fail "a candidate whose bootstrap failed reported deployment success"
else
  pass "the deployment exited non-zero"
fi

ledger_after_5a="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
if [[ "$ledger_after_5a" == "$ledger_before_5a" && "$ledger_after_5a" != "$staged" ]]; then
  pass "the candidate really applied the pending migration during the deployment"
else
  fail "ledger did not advance during the deployment (staged=${staged} after=${ledger_after_5a})"
fi

grep -q "migration state CHANGED" "$changed_log" \
  && pass "deploy.sh detected that the migration state CHANGED" \
  || { fail "deploy.sh did not detect the schema change"; grep -i migration "$changed_log" | tail -5; }

# With candidate gating the previous release is never replaced by a failing
# candidate, so there is nothing to "roll back" — but it IS now running against
# a schema its build predates, which is a live incident and must be reported as
# one rather than as a tidy automatic recovery.
grep -q "predates this schema" "$changed_log" \
  && pass "deploy.sh reports the previous release now runs against a newer schema" \
  || { fail "deploy.sh did not report the schema/build mismatch"; tail -12 "$changed_log"; }

grep -q "automatic rollback is unsafe" "$changed_log" \
  && pass "deploy.sh refuses to treat this as an automatic recovery" \
  || fail "deploy.sh did not refuse an automatic recovery"

# The service is deliberately left DOWN here: the previous build predates the
# schema the candidate applied, so starting it would run old code — and old
# WRITES — against a database it does not understand.
grep -q "A visible outage is the correct state here" "$changed_log" \
  && pass "deploy.sh says the outage is deliberate rather than implying recovery" \
  || fail "deploy.sh did not explain why nothing is being restarted"

grep -q "restore.sh" "$changed_log" \
  && pass "deploy.sh points the operator at a deliberate restore" \
  || fail "deploy.sh did not point at restore.sh"

# The decisive assertion: the UNCHANGED branch must NOT have run.
#
# The needle has to be the string deploy.sh ACTUALLY emits. It used to be
# "rolling back to previous image", which appears nowhere in deploy.sh, so the
# grep could never match, the else branch always ran, and the assertion this
# comment calls "decisive" reported PASS without deciding anything.
grep -q "schema unchanged" "$changed_log" \
  && fail "deploy.sh restarted the previous release despite the schema changing" \
  || pass "the previous image was NOT started"

grep -q "restore.sh" "$changed_log" \
  && pass "the operator is directed to restore.sh" \
  || fail "no restore instruction given to the operator"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 5b — rollback PROCEEDS when the schema did not change"

# Same failure surface (health gate never passes) but with no pending
# migration, so the ledger cannot move. A one-second health budget guarantees
# the gate times out while the schema stays exactly where it is.
psql_admin "DELETE FROM users WHERE email = 'never-created@aau.test'" >/dev/null 2>&1 || true
ledger_before_5b="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"

unchanged_log="${WORKDIR}/rollback-unchanged.log"
if env COMPOSE_PROJECT_NAME="$PROJECT" DEPLOY_ROOT="$DEPLOY_DIR" ENV_FILE="$DRILL_ENV" \
   COMPOSE_FILE="$VPS_COMPOSE" BACKUP_ROOT="$DRILL_BACKUPS" UPLOADS_HOST_PATH="$UPLOADS_DIR" \
   AAU_APP_PORT="$DRILL_APP_PORT" AAU_CANDIDATE_PORT="$DRILL_CANDIDATE_PORT" \
   HEALTH_TIMEOUT_SECONDS=1 SKIP_BACKUP=true \
   bash "${DEPLOY_DIR}/scripts/deploy.sh" "$LOCAL_REF" > "$unchanged_log" 2>&1; then
  fail "a candidate that missed the health budget reported success"
else
  pass "the deployment exited non-zero"
fi

ledger_after_5b="$(psql_admin "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
[[ "$ledger_after_5b" == "$ledger_before_5b" ]] \
  && pass "the migration state did not change" \
  || fail "ledger moved unexpectedly during the unchanged-schema case"

grep -q "migration state CHANGED" "$unchanged_log" \
  && fail "deploy.sh wrongly reported a schema change" \
  || pass "deploy.sh did not report a schema change"

# A deploy is a real maintenance window: the previous release is stopped before
# the candidate migrates, so it does NOT keep serving throughout. What must
# happen is that the window CLOSES again — the schema did not move, so the
# previous release is still a correct pairing with this database and must be
# brought back rather than left down.
grep -q "schema unchanged — restarting the previous release" "$unchanged_log" \
  && pass "deploy.sh restarted the previous release after a recoverable failure" \
  || { fail "deploy.sh did not restart the previous release"; tail -8 "$unchanged_log"; }

serving="$(compose exec -T app-prod node -e \
  "fetch('http://127.0.0.1:3000/api/health').then(r=>console.log(r.status)).catch(()=>console.log('down'))" 2>/dev/null || echo down)"
[[ "$serving" == "200" ]] \
  && pass "the previous release is serving again; the maintenance window closed" \
  || fail "the service was left down after a recoverable failure (health=${serving})"

candidate_left="$(docker ps --filter "name=${PROJECT}-app-candidate" --format '{{.Names}}' | wc -l)"
[[ "$candidate_left" -eq 0 ]] \
  && pass "no failed candidate is left crash-looping" \
  || fail "a failed candidate container is still running"

# The rollback is only meaningful if the restored image actually serves.
recovered=false
for _ in $(seq 1 60); do
  if [[ "$(compose ps --format '{{.Health}}' app-prod 2>/dev/null | head -1)" == "healthy" ]]; then
    recovered=true; break
  fi
  sleep 5
done
[[ "$recovered" == "true" ]] \
  && pass "the previous image became healthy after the automatic rollback" \
  || { fail "the rolled-back image never became healthy"; compose logs --tail 30 --no-color app-prod || true; }

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 6 — restore uses the image recorded with the backup"

psql_admin "DELETE FROM payload_migrations WHERE name = '99999999_drill_pending'" >/dev/null
psql_admin "DELETE FROM drill_canary" >/dev/null
psql_admin "DELETE FROM roles WHERE slug IN ('student','doctor')" >/dev/null
rm -f "${UPLOADS_DIR}/media/drill.txt"

# Point the RELEASE-STATE FILE at something unusable. The env file no longer
# carries an image at all, so this is now the only place a stale identity could
# come from — and a restore that trusted it instead of the backup's own metadata
# would fail loudly here.
printf '%s\n' "127.0.0.1:5555/aau-runner:does-not-exist" > "${DEPLOY_DIR}/deployed-image"
info "the release-state file deliberately points at a non-existent tag"

# The env file must not be able to reintroduce a release identity.
if grep -q '^APP_IMAGE=' "$DRILL_ENV"; then
  fail "the env file carries APP_IMAGE; release identity must live only in the state file"
else
  pass "the env file carries no release identity"
fi

# And a bare compose call must refuse rather than start something arbitrary.
if env -u APP_IMAGE APP_HOST_PORT="$DRILL_APP_PORT" UPLOADS_HOST_PATH="$UPLOADS_DIR" \
     docker compose -p "$PROJECT" --env-file "$DRILL_ENV" -f "$VPS_COMPOSE" config >/dev/null 2>&1; then
  fail "compose accepted a missing APP_IMAGE; a stale release could be resurrected"
else
  pass "compose refuses to run without an explicit release identity"
fi

restore_log="${WORKDIR}/restore.log"
if run_script restore.sh "$backup_dir" > "$restore_log" 2>&1; then
  pass "restore.sh completed despite a stale release-state file"
else
  fail "restore.sh failed"; tail -20 "$restore_log"
fi

grep -q "restoring with application image" "$restore_log" \
  && pass "restore.sh selected the image recorded with the backup" \
  || fail "restore.sh did not report the image it restored with"

roles_after="$(psql_admin "SELECT count(*) FROM roles")"
canary_after="$(psql_admin "SELECT marker FROM drill_canary")"
media_after="$(cat "${UPLOADS_DIR}/media/drill.txt" 2>/dev/null || echo MISSING)"

[[ "$roles_after" == "6" ]] && pass "all Roles restored" || fail "role count ${roles_after}"
[[ "$canary_after" == "keep-me" ]] && pass "application data restored" || fail "canary: ${canary_after}"
[[ "$media_after" == "first-install-media" ]] && pass "uploaded media restored" || fail "media: ${media_after}"

health="$(compose exec -T app-prod node -e \
  "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>console.log(t))" 2>/dev/null || echo '')"
grep -q '"status":"ok"' <<<"$health" && pass "/api/health ok after restore" || fail "health: ${health}"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 7 — founding a VIRGIN environment from a verified platform backup"

# The production data lineage, end to end:
#
#   accepted environment -> verified platform backup
#     -> initialize-from-backup.sh -> FIRST deployment onto that database
#
# The backup used here is a real one produced by backup.sh in Phase 2, with the
# real metadata, manifest and checksums. The target is a second, completely
# separate Compose project on its own ports and its own volumes, so "virgin"
# means virgin.

INIT_PROJECT="aau-init-$$"
INIT_ROOT="${WORKDIR}/initialized"
INIT_DEPLOY="${INIT_ROOT}/deploy"
INIT_UPLOADS="${INIT_ROOT}/uploads"
INIT_BACKUPS="${INIT_ROOT}/backups"
INIT_ENV="${INIT_DEPLOY}/.env.production"
INIT_APP_PORT="${INIT_APP_PORT:-13900}"
INIT_CANDIDATE_PORT="${INIT_CANDIDATE_PORT:-13901}"

mkdir -p "$INIT_DEPLOY" "$INIT_UPLOADS" "$INIT_BACKUPS"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "$INIT_DEPLOY/"
cp -r "${REPO_ROOT}/deploy/postgres" "$INIT_DEPLOY/"
cp -r "${REPO_ROOT}/deploy/scripts" "$INIT_DEPLOY/"
# The container runs as UID 10001 and this drill does not run as root, so the
# script's chown will warn rather than succeed. Make the tree writable the same
# way the primary environment does.
chmod -R 0777 "$INIT_UPLOADS"
# Same credential shape as the source environment, so the restored objects can
# be handed to the same application role name.
cp "$DRILL_ENV" "$INIT_ENV"

run_init() {
  # The application identity the ownership contract is checked against.
  #
  # Production leaves these at their 10001:10001 default and runs the script as
  # root, so the chown succeeds and the tree ends up owned by the container's
  # user. This drill is NOT root, and forcing 10001 here via the script's sudo
  # fallback makes the tree unreadable to the drill itself: the uploads root
  # ends up owned by 10001, and a non-root process cannot then traverse it to
  # assert on the restored media, or remove it during cleanup.
  #
  # Pointing the contract at this drill's own identity keeps every assertion
  # real -- the script still enumerates the whole tree and still judges each
  # entry the way the kernel would -- while leaving the result inspectable.
  # The negative case in 7b-bis proves it still refuses: a 0500 directory is
  # unwritable by its OWNER too, so chowning it changes nothing about the
  # refusal.
  #
  # That the default is the container's identity is pinned separately, in
  # vps-deployment-contract.test.ts, so this override cannot mask it.
  APP_UID="$(id -u)" \
  APP_GID="$(id -g)" \
  COMPOSE_PROJECT_NAME="$INIT_PROJECT" \
  AAU_ENV_ROOT="$INIT_ROOT" \
  AAU_APP_PORT="$INIT_APP_PORT" \
  AAU_CANDIDATE_PORT="$INIT_CANDIDATE_PORT" \
  DEPLOY_ROOT="$INIT_DEPLOY" \
  ENV_FILE="$INIT_ENV" \
  COMPOSE_FILE="$VPS_COMPOSE" \
  BACKUP_ROOT="$INIT_BACKUPS" \
  UPLOADS_HOST_PATH="$INIT_UPLOADS" \
    bash "${INIT_DEPLOY}/scripts/initialize-from-backup.sh" "$@"
}
init_compose() {
  env APP_IMAGE="${APP_IMAGE:-${LOCAL_REF}}" \
      APP_HOST_PORT="$INIT_APP_PORT" CANDIDATE_HOST_PORT="$INIT_CANDIDATE_PORT" \
      UPLOADS_HOST_PATH="$INIT_UPLOADS" \
    docker compose -p "$INIT_PROJECT" --env-file "$INIT_ENV" -f "$VPS_COMPOSE" "$@"
}
init_psql() {
  init_compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1" 2>/dev/null || true
}

# ── 7a. It refuses without the environment-named acknowledgement ──────────
if run_init "$backup_dir" > "${WORKDIR}/init-no-ack.log" 2>&1; then
  fail "initialization ran without an acknowledgement"
else
  pass "initialization refuses without an acknowledgement"
fi
grep -q "I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION" "${WORKDIR}/init-no-ack.log" \
  && pass "the refusal names the target environment in the acknowledgement" \
  || fail "the acknowledgement is not environment-specific"

# A staging acknowledgement must not initialize production.
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-STAGING \
   run_init "$backup_dir" > "${WORKDIR}/init-wrong-ack.log" 2>&1; then
  fail "a staging acknowledgement initialized production"
else
  pass "an acknowledgement for another environment is refused"
fi

# ── 7b. It refuses a tampered artifact ────────────────────────────────────
tampered="${WORKDIR}/tampered-backup"
cp -r "$backup_dir" "$tampered"
# One byte of metadata: enough to break the checksum, invisible to the eye.
sed -i 's/"environment": "production"/"environment": "productionX"/' "${tampered}/metadata.json"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   run_init "$tampered" > "${WORKDIR}/init-tampered.log" 2>&1; then
  fail "initialization accepted a tampered backup"
else
  pass "initialization refuses a tampered backup"
fi
grep -qi "checksum" "${WORKDIR}/init-tampered.log" \
  && pass "the refusal names the integrity failure" \
  || { fail "the refusal did not name the integrity failure"; tail -5 "${WORKDIR}/init-tampered.log"; }

# An incomplete artifact is refused too, and is NOT overridable.
missing="${WORKDIR}/incomplete-backup"
cp -r "$backup_dir" "$missing"
rm -f "${missing}/SHA256SUMS"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   ALLOW_UNVERIFIED_BACKUP=I-ACCEPT-POSSIBLE-DATA-LOSS \
   run_init "$missing" > "${WORKDIR}/init-incomplete.log" 2>&1; then
  fail "initialization accepted a backup with no checksums"
else
  pass "initialization refuses an unverifiable backup, with no opt-out"
fi

# ── 7b-bis. It refuses when the restored uploads are not writable ─────────
# The application container runs as UID:GID 10001. An initialization that
# restores the dataset but leaves the uploads tree unwritable by that identity
# used to report SUCCESS with a WARNING scrolling past mid-restore, and the
# consequence surfaced in production the first time anyone uploaded a file.
#
# The injection is an EMPTY directory with mode 0500 owned by this drill's user.
# It survives the virgin-target check (which looks for `-type f`) and the
# `cp -a` of the backup tree, and 10001 falls into its `other` class, which has
# neither write nor execute. So the tree is genuinely unusable by the container
# while every other check still passes -- the exact shape of the real failure.
mkdir -p "${INIT_UPLOADS}/locked"
chmod 0500 "${INIT_UPLOADS}/locked"
unwritable_log="${WORKDIR}/init-unwritable-uploads.log"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   run_init "$backup_dir" > "$unwritable_log" 2>&1; then
  fail "initialization succeeded with an uploads tree the container cannot write"
else
  pass "initialization refuses an uploads tree the application identity cannot write"
fi
grep -q "cannot be written by the" "$unwritable_log" \
  && pass "the refusal names the ownership contract, not a generic copy error" \
  || { fail "the refusal did not cite the uploads ownership contract"; tail -8 "$unwritable_log"; }
# It must be the ASSERTION that refused, not the chown's exit status: this drill
# does not run as root, so chown always fails here. If the script were still
# gated on that status it would refuse the writable tree in 7c as well.
grep -q "could not chown" "$unwritable_log" \
  && fail "the refusal came from the chown exit status rather than the asserted state" \
  || pass "the refusal came from asserting the resulting state, not from chown's status"

# Return the target to virgin. The refusal happened AFTER the database restore
# (uploads are installed last), so the project is torn down with its volumes and
# the tree is rebuilt -- the same starting state Phase 7 began with.
init_compose down --volumes --remove-orphans >/dev/null 2>&1 || true
rm -rf "$INIT_UPLOADS" "${INIT_DEPLOY}/first-install-receipt.json"
mkdir -p "$INIT_UPLOADS"
chmod -R 0777 "$INIT_UPLOADS"

# ── 7c. It founds the environment ─────────────────────────────────────────
init_log="${WORKDIR}/init.log"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   run_init "$backup_dir" > "$init_log" 2>&1; then
  pass "initialization completed from the verified backup"
else
  fail "initialization failed"; tail -30 "$init_log"
fi

grep -q "target is virgin" "$init_log" \
  && pass "it proved the target was virgin before writing anything" \
  || fail "it did not report the virginity proof"

init_roles="$(init_psql "SELECT count(*) FROM roles")"
[[ "${init_roles:-0}" -ge 1 ]] && pass "roles restored (${init_roles})" \
  || fail "no roles in the initialized database"
init_users="$(init_psql "SELECT count(*) FROM users")"
[[ "${init_users:-0}" -ge 1 ]] && pass "users restored (${init_users})" \
  || fail "no users in the initialized database"
# Compared against the backup's OWN metadata rather than a variable captured
# elsewhere in this drill: the artifact has to describe itself correctly, and
# the script refuses when the restored ledger and the recorded one differ.
recorded_ledger="$(sed -n 's/.*"applied_migrations": *"\([^"]*\)".*/\1/p' "${backup_dir}/metadata.json")"
init_ledger="$(init_psql "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
[[ -n "$recorded_ledger" && "$init_ledger" == "$recorded_ledger" ]] \
  && pass "the migration ledger matches the backup's recorded state exactly" \
  || fail "ledger '${init_ledger}' != recorded '${recorded_ledger}'"

# The ownership correction, asserted against the restored database rather than
# assumed from the pg_restore flags. An object owned by the admin role is
# invisible in every row count and surfaces later as a blank Admin page.
#
# Counting only the WRONG ones would pass on an empty database, which is
# exactly what a failed initialization leaves behind — so the number that are
# RIGHT is asserted too. The platform schema has dozens of tables and
# sequences; twenty is a floor, not a measurement.
wrong_owner="$(init_psql "SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','S')
    AND pg_get_userbyid(c.relowner) <> 'aau_app'")"
right_owner="$(init_psql "SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','S')
    AND pg_get_userbyid(c.relowner) = 'aau_app'")"
[[ "$wrong_owner" == "0" && "${right_owner:-0}" -ge 20 ]] \
  && pass "all ${right_owner} restored tables and sequences are owned by the application role" \
  || fail "${wrong_owner:-<unreadable>} restored object(s) are not owned by aau_app, and only ${right_owner:-<unreadable>} are"
grep -q "ownership contract satisfied" "$init_log" \
  && pass "the script asserted the ownership contract itself" \
  || fail "the script did not assert the ownership contract"

init_media="$(cat "${INIT_UPLOADS}/media/drill.txt" 2>/dev/null || echo MISSING)"
[[ "$init_media" == "first-install-media" ]] \
  && pass "uploaded media was installed alongside the database" \
  || fail "uploads were not installed (got: ${init_media})"

[[ -s "${INIT_DEPLOY}/first-install-receipt.json" ]] \
  && pass "an audit receipt was written" || fail "no receipt written"

# The release-state file must NOT exist: nothing has been deployed. Writing one
# would make the next deploy believe it has a previous known-good release.
[[ ! -e "${INIT_DEPLOY}/deployed-image" ]] \
  && pass "no release-state file was invented" \
  || fail "initialization wrote a release-state file"

# ── 7d. A second run refuses, on the system's own evidence ────────────────
# The receipt is deliberately removed first: the guard must be the database and
# the filesystem, not a marker anyone can delete.
rm -f "${INIT_DEPLOY}/first-install-receipt.json"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   run_init "$backup_dir" > "${WORKDIR}/init-rerun.log" 2>&1; then
  fail "a second initialization overwrote an initialized environment"
else
  pass "a second initialization is refused even with the receipt deleted"
fi
grep -q "payload_migrations" "${WORKDIR}/init-rerun.log" \
  && pass "the refusal cites the migrated database, not a marker file" \
  || { fail "the refusal did not cite live system state"; tail -6 "${WORKDIR}/init-rerun.log"; }

# ── 7e. The FIRST deployment onto that imported database ──────────────────
# The state this phase exists for: data present, uploads present, a migration
# ledger — and no previous release, so no release-state file and no application
# container. It is neither an empty fresh install nor a normal redeploy.
#
# deploy.sh must classify it as an EXISTING installation (it is), take a real
# verified pre-cutover backup of the imported dataset, and promote. Before the
# fix, backup.sh had no image reference to parse the compose file with — there
# was no release-state file — so the backup failed with "APP_IMAGE is not set"
# and the first production deployment could never happen.
init_deploy_log="${WORKDIR}/init-deploy.log"
if COMPOSE_PROJECT_NAME="$INIT_PROJECT" \
   AAU_ENV_ROOT="$INIT_ROOT" \
   AAU_APP_PORT="$INIT_APP_PORT" \
   AAU_CANDIDATE_PORT="$INIT_CANDIDATE_PORT" \
   DEPLOY_ROOT="$INIT_DEPLOY" \
   ENV_FILE="$INIT_ENV" \
   COMPOSE_FILE="$VPS_COMPOSE" \
   BACKUP_ROOT="$INIT_BACKUPS" \
   UPLOADS_HOST_PATH="$INIT_UPLOADS" \
   HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT:-420}" \
     bash "${INIT_DEPLOY}/scripts/deploy.sh" "$LOCAL_REF" > "$init_deploy_log" 2>&1; then
  pass "the first deployment onto the imported database succeeded"
else
  fail "the first deployment onto the imported database failed"; tail -30 "$init_deploy_log"
fi

grep -q "first install detected" "$init_deploy_log" \
  && fail "an imported database was wrongly classified as an empty first install" \
  || pass "the imported database was treated as an existing installation"

grep -q "pre-cutover backup failed" "$init_deploy_log" \
  && fail "the backup gate aborted the first deployment onto an imported database" \
  || pass "the backup gate did not abort the first deployment"

init_backup_count="$(find "$INIT_BACKUPS" -mindepth 1 -maxdepth 1 -type d | wc -l)"
[[ "$init_backup_count" -ge 1 ]] \
  && pass "a verified pre-cutover backup of the imported dataset was taken" \
  || fail "no pre-cutover backup was taken before the first deployment"

[[ -s "${INIT_DEPLOY}/deployed-image" ]] \
  && pass "the release-state file now records the deployed digest" \
  || fail "no release-state file after the first deployment"

init_health="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${INIT_APP_PORT}/api/health" || echo 000)"
[[ "$init_health" == "200" ]] \
  && pass "the initialized environment is serving on its stable port" \
  || fail "the initialized environment is not healthy (HTTP ${init_health})"

# The migrated identity was VALIDATED, never replaced: same user count, and the
# dataset's own Super Admin is still the one configured.
init_users_after="$(init_psql "SELECT count(*) FROM users")"
[[ "$init_users_after" == "$init_users" ]] \
  && pass "the deployment did not add or replace any user" \
  || fail "user count changed from ${init_users} to ${init_users_after}"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 8 — first imported-baseline deployment FAILS, and is recovered"

# The exact state the real first production launch passes through, and the one
# no previous phase proved recoverable:
#
#   founded from the accepted platform backup  ->  no release-state file,
#   no application container ever created  ->  FIRST deployment  ->  the
#   candidate applies migrations and then fails  ->  the schema has moved and
#   the only restore point is a pre-cutover backup that records NO application
#   image, because none has ever existed here.
#
# Phase 7e proved that first deployment SUCCEEDS. This phase proves the other
# branch: that when it fails after moving the schema, the environment can be
# returned to the exact accepted baseline through the documented path, with no
# Neon import, no seed, and no invented release identity.

# Back to virgin: Phase 7 left this environment with a real release.
init_compose down --volumes --remove-orphans >/dev/null 2>&1 || true
rm -rf "$INIT_UPLOADS" "${INIT_DEPLOY}/deployed-image" \
       "${INIT_DEPLOY}/first-install-receipt.json" "$INIT_BACKUPS"
mkdir -p "$INIT_UPLOADS" "$INIT_BACKUPS"
chmod -R 0777 "$INIT_UPLOADS"

refound_log="${WORKDIR}/init-refound.log"
if ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
   run_init "$backup_dir" > "$refound_log" 2>&1; then
  pass "the environment was founded again from the accepted platform backup"
else
  fail "re-founding from the accepted backup failed"; tail -20 "$refound_log"
fi

# The accepted baseline, measured from the live system rather than assumed.
baseline_ledger="$(init_psql "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
baseline_users="$(init_psql "SELECT count(*) FROM users")"
baseline_roles="$(init_psql "SELECT count(*) FROM roles")"
baseline_canary="$(init_psql "SELECT string_agg(marker, ',') FROM drill_canary")"
baseline_media="$(cat "${INIT_UPLOADS}/media/drill.txt" 2>/dev/null || echo MISSING)"
info "baseline: users=${baseline_users} roles=${baseline_roles} canary=${baseline_canary} media=${baseline_media}"
[[ "$baseline_media" == "first-install-media" && "${baseline_users:-0}" -gt 0 ]] \
  && pass "the baseline carries the accepted dataset and its uploads" \
  || fail "the baseline is not the accepted dataset (users=${baseline_users}, media=${baseline_media})"

[[ ! -e "${INIT_DEPLOY}/deployed-image" ]] \
  && pass "the baseline has no release-state file" \
  || fail "the baseline already records a release"

# Stage real pending work, the same way Phase 5a does: undo the latest migration
# with its own down() SQL so the candidate genuinely applies it mid-deployment.
init_psql "DROP INDEX \"study_plans_academic_program_idx\";
  CREATE INDEX \"academicProgram_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");
  CREATE INDEX \"version_academicProgram_idx\" ON \"_study_plans_v\" USING btree (\"version_academic_program_id\");
  CREATE INDEX \"study_plans_academic_program_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");" >/dev/null
init_psql "DELETE FROM payload_migrations WHERE name = '${LATEST_MIGRATION}'" >/dev/null
staged_init="$(init_psql "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
[[ "$staged_init" != "$baseline_ledger" ]] \
  && pass "a real pending migration is staged (${LATEST_MIGRATION})" \
  || fail "could not stage a pending migration on the baseline"

# The candidate reaches migrations and then fails its identity bootstrap, so the
# ledger moves BEFORE the health gate gives up -- the migration-changed branch.
init_fail_env="${WORKDIR}/.env.init-bootstrap-fail"
sed -e "s/^INITIAL_ADMIN_EMAIL=.*/INITIAL_ADMIN_EMAIL='never-created@aau.test'/" \
    -e '/^INITIAL_ADMIN_PASSWORD=/d' "$INIT_ENV" > "$init_fail_env"

run_init_deploy() {
  env COMPOSE_PROJECT_NAME="$INIT_PROJECT" AAU_ENV_ROOT="$INIT_ROOT" \
      AAU_APP_PORT="$INIT_APP_PORT" AAU_CANDIDATE_PORT="$INIT_CANDIDATE_PORT" \
      DEPLOY_ROOT="$INIT_DEPLOY" ENV_FILE="$1" COMPOSE_FILE="$VPS_COMPOSE" \
      BACKUP_ROOT="$INIT_BACKUPS" UPLOADS_HOST_PATH="$INIT_UPLOADS" \
      HEALTH_TIMEOUT_SECONDS="$2" \
    bash "${INIT_DEPLOY}/scripts/deploy.sh" "$LOCAL_REF"
}

# NOT SKIP_BACKUP: the pre-cutover backup is the artifact under test here.
first_fail_log="${WORKDIR}/init-first-deploy-failure.log"
if run_init_deploy "$init_fail_env" 90 > "$first_fail_log" 2>&1; then
  fail "the failing first deployment reported success"
else
  pass "the failing first deployment exited non-zero"
fi

grep -q "first install detected" "$first_fail_log" \
  && fail "the imported baseline was wrongly classified as an empty first install" \
  || pass "the imported baseline was treated as an existing installation"

ledger_after_fail="$(init_psql "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
[[ "$ledger_after_fail" == "$baseline_ledger" && "$ledger_after_fail" != "$staged_init" ]] \
  && pass "the candidate really applied the pending migration before failing" \
  || fail "the schema did not move during the failed deployment (after=${ledger_after_fail})"

grep -q "candidate failed after applying migrations" "$first_fail_log" \
  && pass "deploy.sh took the migration-changed branch" \
  || { fail "deploy.sh did not report a migration-changed failure"; tail -20 "$first_fail_log"; }

# The guidance must name the recovery that actually works for this state.
grep -q "BASELINE RECOVERY" "$first_fail_log" \
  && pass "the incident guidance names the baseline recovery path" \
  || fail "the incident guidance does not mention baseline recovery"
grep -qi "do NOT re-import from Neon" "$first_fail_log" \
  && pass "the guidance explicitly rules out a Neon re-import" \
  || fail "the guidance does not rule out a Neon re-import"

# Nothing may be left serving, and no release identity may have been invented.
[[ ! -e "${INIT_DEPLOY}/deployed-image" ]] \
  && pass "no release-state file was written by the failed deployment" \
  || fail "the failed deployment recorded a release identity"
failed_health="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
  "http://127.0.0.1:${INIT_APP_PORT}/api/health" || echo 000)"
[[ "$failed_health" != "200" ]] \
  && pass "nothing is serving the stable port after the failed first deployment" \
  || fail "the stable port reports healthy after a failed first deployment"

# ── The restore point: a backup that records NO application image ─────────
init_precutover="$(find "$INIT_BACKUPS" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)"
[[ -n "$init_precutover" && -d "$init_precutover" ]] \
  && pass "a pre-cutover backup of the imported baseline exists at $(basename "$init_precutover")" \
  || fail "no pre-cutover backup was taken before the first deployment"

recorded_app_image="$(sed -n 's/.*"app_image": *"\([^"]*\)".*/\1/p' "${init_precutover}/metadata.json")"
[[ -z "$recorded_app_image" ]] \
  && pass "the restore point records no application image, as this state requires" \
  || fail "the restore point unexpectedly recorded an image (${recorded_app_image})"

# ── The recovery itself: no RESTORE_IMAGE, no Neon, no seed ───────────────
baseline_restore_log="${WORKDIR}/init-baseline-restore.log"
# Same runtime identity run_init used. restore.sh reads APP_UID/APP_GID for
# exactly the same reason, and the two MUST agree: they install the same tree
# for the same container, so pinning one and not the other leaves a tree one
# script can walk and the other cannot.
if env COMPOSE_PROJECT_NAME="$INIT_PROJECT" AAU_ENV_ROOT="$INIT_ROOT" \
     APP_UID="$(id -u)" APP_GID="$(id -g)" \
     AAU_APP_PORT="$INIT_APP_PORT" AAU_CANDIDATE_PORT="$INIT_CANDIDATE_PORT" \
     DEPLOY_ROOT="$INIT_DEPLOY" ENV_FILE="$INIT_ENV" COMPOSE_FILE="$VPS_COMPOSE" \
     BACKUP_ROOT="$INIT_BACKUPS" UPLOADS_HOST_PATH="$INIT_UPLOADS" \
   bash "${INIT_DEPLOY}/scripts/restore.sh" "$init_precutover" \
     > "$baseline_restore_log" 2>&1; then
  pass "restore.sh recovered the imported baseline with no RESTORE_IMAGE"
else
  fail "restore.sh refused the only restore point this state produces"
  # Generously: this is the assertion the whole phase exists for, and a short
  # tail here cost a full CI round trip last time by cutting off the reason.
  tail -60 "$baseline_restore_log"
fi

grep -q "BASELINE RECOVERY" "$baseline_restore_log" \
  && pass "restore.sh entered baseline recovery rather than demanding an image" \
  || fail "restore.sh did not report a baseline recovery"
grep -q "starting app-prod" "$baseline_restore_log" \
  && fail "baseline recovery started an application against the restored baseline" \
  || pass "baseline recovery started nothing"
# Assert on the TOOLS, not on the words: the recovery's own log deliberately
# reassures the operator that neither Neon nor a seed was involved, so a
# case-insensitive search for those words matches that reassurance and can
# never fail. What must be absent is any invocation of them.
grep -qE "neon-import|neon\.dump|seed\.sh|SEED_MODE" "$baseline_restore_log" \
  && fail "the recovery invoked the Neon import or a seed" \
  || pass "the recovery invoked neither the Neon import nor any seed"

# The state after recovery must BE the accepted baseline, measured the same way.
recovered_ledger="$(init_psql "SELECT string_agg(name, ',' ORDER BY name) FROM payload_migrations")"
[[ "$recovered_ledger" == "$staged_init" ]] \
  && pass "the migration ledger is back at the restore point, before the candidate's migration" \
  || fail "the ledger is ${recovered_ledger}, expected ${staged_init}"

recovered_users="$(init_psql "SELECT count(*) FROM users")"
[[ "$recovered_users" == "$baseline_users" ]] \
  && pass "every migrated user survived the failure and the recovery (${recovered_users})" \
  || fail "user count changed from ${baseline_users} to ${recovered_users}"

recovered_roles="$(init_psql "SELECT count(*) FROM roles")"
[[ "$recovered_roles" == "$baseline_roles" ]] \
  && pass "the role set is intact (${recovered_roles})" \
  || fail "role count changed from ${baseline_roles} to ${recovered_roles}"

recovered_canary="$(init_psql "SELECT string_agg(marker, ',') FROM drill_canary")"
[[ "$recovered_canary" == "$baseline_canary" ]] \
  && pass "content rows are intact (${recovered_canary})" \
  || fail "canary changed from ${baseline_canary} to ${recovered_canary}"

recovered_media="$(cat "${INIT_UPLOADS}/media/drill.txt" 2>/dev/null || echo MISSING)"
[[ "$recovered_media" == "$baseline_media" ]] \
  && pass "the uploads tree is back at the baseline" \
  || fail "uploads are ${recovered_media}, expected ${baseline_media}"

[[ ! -e "${INIT_DEPLOY}/deployed-image" ]] \
  && pass "the recovery invented no release identity" \
  || fail "the recovery wrote a release-state file: $(cat "${INIT_DEPLOY}/deployed-image")"

# No failed candidate, and nothing falsely reporting health on the stable port.
leftover_init="$(docker ps --filter "label=com.docker.compose.project=${INIT_PROJECT}" \
  --filter "label=com.docker.compose.service=app-candidate" --format '{{.Names}}')"
[[ -z "$leftover_init" ]] \
  && pass "no failed candidate remains active" \
  || fail "a candidate container is still running: ${leftover_init}"
recovered_health="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
  "http://127.0.0.1:${INIT_APP_PORT}/api/health" || echo 000)"
[[ "$recovered_health" != "200" ]] \
  && pass "the stable port is honestly down after a baseline recovery" \
  || fail "the stable port reports healthy although no release is deployed"

# ── And the baseline is genuinely deployable again ────────────────────────
# A recovery that cannot be followed by the retry it exists to enable has not
# recovered anything.
retry_log="${WORKDIR}/init-first-deploy-retry.log"
if run_init_deploy "$INIT_ENV" "${DEPLOY_HEALTH_TIMEOUT:-420}" > "$retry_log" 2>&1; then
  pass "the first deployment succeeds when re-run against the recovered baseline"
else
  fail "the recovered baseline could not be deployed"; tail -30 "$retry_log"
fi

retry_users="$(init_psql "SELECT count(*) FROM users")"
[[ "$retry_users" == "$baseline_users" ]] \
  && pass "the successful retry still added or replaced no user" \
  || fail "user count changed from ${baseline_users} to ${retry_users} on retry"

retry_health="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  "http://127.0.0.1:${INIT_APP_PORT}/api/health" || echo 000)"
[[ "$retry_health" == "200" ]] \
  && pass "the recovered environment is serving its stable port" \
  || fail "the recovered environment is not healthy (HTTP ${retry_health})"

printf '\n'
if (( failures > 0 )); then
  printf '\033[1;31m%d assertion(s) failed.\033[0m\n' "$failures"
  exit 1
fi
printf '\033[1;32mFirst-install and recovery drill passed against the real deploy scripts.\033[0m\n'
printf 'PENDING REAL VPS: off-host backup destination and a restore drill from that copy.\n'
