#!/usr/bin/env bash
# Proves the canonical Seed is an explicit, source-free, one-shot operation.
#
# The four properties that matter, each asserted against the REAL runner image
# and a REAL database:
#
#   1. it is source-free — one bundled artifact, no src/ tree, no Payload CLI,
#      no TypeScript loader on the VPS;
#   2. it does NOT run during a normal deploy or a container restart, which is
#      the failure a `FULL_SEED=true` toggle would guarantee;
#   3. it DOES work when explicitly invoked, and verifies its own result;
#   4. BOTH modes are impossible in production.
#
# The working stack below is therefore a STAGING one: production is only ever
# probed for its refusals. Production content is the accepted migrated dataset
# installed by deploy/scripts/initialize-from-backup.sh, so there is no
# production Seed left to exercise.

set -euo pipefail

readonly RUNNER_IMAGE="${1:?usage: $0 <runner-image>}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-seed-$$"
readonly REGISTRY_NAME="seed-registry-$$"
readonly REGISTRY_PORT="${SEED_REGISTRY_PORT:-5563}"
readonly APP_PORT="${SEED_APP_PORT:-13950}"
readonly CANDIDATE_PORT="${SEED_CANDIDATE_PORT:-13951}"

ROOT="$(mktemp -d)"
pass=0
fail=0
# `contains <label> <haystack> <needle>` — a boolean, not a line count. Counting
# matching LINES is fragile here: these messages are printed twice (once by the
# runner's own handler, once by Node's uncaught-error output), so a `-c` result
# of 2 would fail a check for 1.
contains() {
  if printf '%s' "$2" | grep -qF -- "$3"; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       output did not contain: %s\n' "$1" "$3"; fail=$((fail + 1))
  fi
}
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}

cleanup() {
  APP_IMAGE=placeholder:down docker compose -p "$PROJECT" \
    --env-file "${ROOT}/deploy/.env.staging" \
    -f "${ROOT}/deploy/docker-compose.vps.yml" --profile candidate \
    down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker ps -aq --filter "name=${PROJECT}-" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$ROOT" 2>/dev/null || sudo rm -rf "$ROOT" 2>/dev/null || true
}
trap cleanup EXIT

run_env() {
  # STAGING: the Seed is a staging capability, so the stack this drill drives is
  # a staging one. The production refusals are probed separately, against the
  # runner image alone, because there is no production stack to run them on.
  env AAU_ENV="${AAU_ENV_OVERRIDE:-staging}" AAU_ENV_ROOT="$ROOT" \
    DEPLOY_ROOT="${ROOT}/deploy" AAU_APP_PORT="$APP_PORT" \
    AAU_CANDIDATE_PORT="$CANDIDATE_PORT" COMPOSE_PROJECT_NAME="$PROJECT" \
    "$@"
}
compose() {
  env APP_IMAGE="$(cat "${ROOT}/deploy/deployed-image" 2>/dev/null || echo placeholder:none)" \
      APP_HOST_PORT="$APP_PORT" CANDIDATE_HOST_PORT="$CANDIDATE_PORT" \
      UPLOADS_HOST_PATH="${ROOT}/uploads" \
    docker compose -p "$PROJECT" --env-file "${ROOT}/deploy/.env.staging" \
      -f "${ROOT}/deploy/docker-compose.vps.yml" "$@"
}
psql_admin() {
  compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1" 2>/dev/null || true
}

echo "=== 1. the seed artifact is source-free ==="
# Asserted against the image itself, not the repository: what matters is what
# reaches the VPS.
listing="$(docker run --rm --entrypoint sh "$RUNNER_IMAGE" -c 'ls -A /app')"
check "the bundled seed artifact is present" \
  "$(printf '%s\n' "$listing" | grep -cx 'seed-runner.mjs')" "1"
check "no src/ tree ships with it" "$(printf '%s\n' "$listing" | grep -cx 'src')" "0"
check "no Payload CLI shell wrapper ships with it" \
  "$(docker run --rm --entrypoint sh "$RUNNER_IMAGE" -c 'test -x /app/node_modules/.bin/payload && echo 1 || echo 0')" "0"
size="$(docker run --rm --entrypoint sh "$RUNNER_IMAGE" -c 'wc -c < /app/seed-runner.mjs')"
check "the artifact is a real bundle, not a stub" \
  "$([[ "$size" -gt 100000 ]] && echo yes || echo no)" "yes"

echo
echo "=== 2. it refuses without an explicit mode ==="
probe="$(docker run --rm --entrypoint node "$RUNNER_IMAGE" /app/seed-runner.mjs 2>&1 || true)"
contains "no mode is a hard failure" "$probe" "--mode must be"

echo
echo "=== 3. reset-and-full is impossible in production ==="
# Checked BEFORE Payload initialises, so it cannot depend on a database being
# reachable — and so a production run cannot get far enough to delete anything.
probe="$(docker run --rm --entrypoint node -e AAU_ENV=production "$RUNNER_IMAGE" \
  /app/seed-runner.mjs --mode reset-and-full 2>&1 || true)"
contains "production refuses reset-and-full" "$probe" "STAGING-ONLY"
check "it refuses before touching a database" \
  "$(printf '%s' "$probe" | grep -ci 'ECONNREFUSED' || true)" "0"

echo
echo "=== 4. a production full seed is refused outright ==="
probe="$(docker run --rm --entrypoint node -e AAU_ENV=production "$RUNNER_IMAGE" \
  /app/seed-runner.mjs --mode full 2>&1 || true)"
contains "production full seed is refused" "$probe" "STAGING-ONLY"
contains "and it names where production content comes from" "$probe" "initialize-from-backup.sh"
check "it refuses before touching a database" \
  "$(printf '%s' "$probe" | grep -ci 'ECONNREFUSED' || true)" "0"

# The confirmation that used to open this path must not re-open it.
probe="$(docker run --rm --entrypoint node \
  -e AAU_ENV=production -e SEED_CONFIRM=I-UNDERSTAND-THIS-WRITES-CANONICAL-CONTENT \
  "$RUNNER_IMAGE" /app/seed-runner.mjs --mode full 2>&1 || true)"
contains "the retired SEED_CONFIRM does not re-open it" "$probe" "STAGING-ONLY"

# An absent AAU_ENV is ASSUMED production by the shared fail-closed rule, so a
# seed with no environment at all must be refused too.
probe="$(docker run --rm --entrypoint node "$RUNNER_IMAGE" \
  /app/seed-runner.mjs --mode full 2>&1 || true)"
contains "an absent AAU_ENV is refused as assumed-production" "$probe" "STAGING-ONLY"

echo
echo "=== 5. setup a real STAGING stack ==="
mkdir -p "${ROOT}/deploy/scripts" "${ROOT}/uploads" "${ROOT}/backups"
cp -r "${REPO_ROOT}/deploy/scripts/." "${ROOT}/deploy/scripts/"
cp "${REPO_ROOT}/deploy/docker-compose.vps.yml" "${ROOT}/deploy/"
cp -r "${REPO_ROOT}/deploy/postgres" "${ROOT}/deploy/"
cat > "${ROOT}/deploy/.env.staging" <<'EOF'
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='adm@n:p/ss?x=1&y#z%20 A1!'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='app@p:a/ss?q=2&r#s%20 B2!'
REDIS_PASSWORD='red@s:p/ss?w=3#t C3!'
PAYLOAD_SECRET='seed-drill-payload-secret-at-least-32-characters'
INITIAL_ADMIN_EMAIL='admin@example.test'
INITIAL_ADMIN_PASSWORD='Seed-Drill-Admin-2026!'
EOF

docker rm -f "$REGISTRY_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REGISTRY_NAME" -p "${REGISTRY_PORT}:5000" registry:2 >/dev/null
for _ in $(seq 1 30); do curl -sf "http://127.0.0.1:${REGISTRY_PORT}/v2/" >/dev/null 2>&1 && break; sleep 1; done
REF="127.0.0.1:${REGISTRY_PORT}/aau/runner:seed"
docker tag "$RUNNER_IMAGE" "$REF"
docker push -q "$REF" >/dev/null

run_env HEALTH_TIMEOUT_SECONDS=300 bash "${ROOT}/deploy/scripts/deploy.sh" "$REF" >/dev/null 2>&1
check "the stack deployed" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"

echo
echo "=== 6. a normal deploy does NOT run the canonical Seed ==="
# The minimal identity bootstrap creates only the canonical Roles and the Super
# Admin. If broad content exists after a plain deploy, something is seeding at
# startup — the exact failure a FULL_SEED env toggle would cause.
colleges_after_deploy="$(psql_admin "SELECT count(*) FROM colleges")"
pages_after_deploy="$(psql_admin "SELECT count(*) FROM pages")"
roles_after_deploy="$(psql_admin "SELECT count(*) FROM roles")"
check "no broad content after a normal deploy (colleges)" "$colleges_after_deploy" "0"
check "no broad content after a normal deploy (pages)" "$pages_after_deploy" "0"
check "the minimal identity bootstrap DID run (roles exist)" \
  "$([[ "${roles_after_deploy:-0}" -gt 0 ]] && echo yes || echo no)" "yes"

echo
echo "=== 7. a container restart does NOT run the canonical Seed ==="
compose restart app-prod >/dev/null 2>&1
for _ in $(seq 1 60); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" == "200" ]] && break
  sleep 2
done
check "still no broad content after a restart" "$(psql_admin "SELECT count(*) FROM colleges")" "0"

echo
echo "=== 8. the explicit one-shot Seed works ==="
seed_log="${ROOT}/seed.log"
if run_env bash "${ROOT}/deploy/scripts/seed.sh" full > "$seed_log" 2>&1; then
  printf '  ok   the explicit seed completed\n'; pass=$((pass + 1))
else
  printf '  FAIL the explicit seed failed\n'; fail=$((fail + 1)); tail -25 "$seed_log"
fi
colleges_after_seed="$(psql_admin "SELECT count(*) FROM colleges")"
check "canonical content now exists" \
  "$([[ "${colleges_after_seed:-0}" -gt 0 ]] && echo yes || echo no)" "yes"
contains "the seed verified its own result" "$(cat "$seed_log")" "roles present"

echo
echo "=== 9. the seed is serialized against other operations ==="
contains "the seed takes the shared operation lock" "$(cat "$seed_log")" "oplock"

echo
echo "=== 10. the host script refuses BOTH modes against production ==="
# Probed against AAU_ENV=production with no production env file present at all:
# the refusal is checked before the env file is read, so it cannot be reached
# around by an incomplete installation — and it proves the refusal is the
# environment, not a missing file.
if [[ -e "${ROOT}/deploy/.env.production" ]]; then
  printf '  FAIL a production env file exists; the probe below would be ambiguous\n'
  fail=$((fail + 1))
else
  printf '  ok   no production env file exists in this drill\n'
  pass=$((pass + 1))
fi

for mode in full reset-and-full; do
  if AAU_ENV_OVERRIDE=production run_env \
       bash "${ROOT}/deploy/scripts/seed.sh" "$mode" > "${ROOT}/prod-${mode}.log" 2>&1; then
    printf '  FAIL a production %s seed succeeded\n' "$mode"; fail=$((fail + 1))
  else
    contains "production ${mode} is refused as staging-only" \
      "$(cat "${ROOT}/prod-${mode}.log")" "STAGING-ONLY"
    # `full` is the mode an operator would reach for to initialize content, so
    # its refusal has to name what to use instead. `reset-and-full` keeps its
    # own, more specific diagnosis (it deletes before it writes).
    if [[ "$mode" == "full" ]]; then
      contains "and the refusal names where production content comes from" \
        "$(cat "${ROOT}/prod-${mode}.log")" "initialize-from-backup.sh"
    else
      contains "and reset-and-full keeps its own destructive-operation diagnosis" \
        "$(cat "${ROOT}/prod-${mode}.log")" "restore.sh"
    fi
  fi
done

echo
echo "=== 11. the root-owned entrypoint refuses production from its own path ==="
# The layer a remote key meets first. It selects the environment from its own
# installed path, so this is the refusal that cannot be reached around at all.
# It refuses an unrecognised installed path before anything else, so the
# production refusal is asserted against the shipped script text rather than by
# installing a real /srv/aau/production tree inside CI.
seed_entrypoint_text="$(cat "${REPO_ROOT}/deploy/scripts/seed-entrypoint.sh")"
seed_script_text="$(cat "${REPO_ROOT}/deploy/scripts/seed.sh")"
contains "the entrypoint requires the staging environment" \
  "$seed_entrypoint_text" '[[ "$AAU_ENV" == "staging" ]]'
contains "and says why production has no Seed" \
  "$seed_entrypoint_text" "initialize-from-backup.sh"
# A retired confirmation left lying around reads as a supported escape hatch.
check "no confirmation variable survives in the entrypoint" \
  "$(printf '%s' "$seed_entrypoint_text" | grep -c 'SEED_CONFIRM' || true)" "0"
check "no confirmation variable survives in the host script" \
  "$(printf '%s' "$seed_script_text" | grep -c 'SEED_CONFIRM' || true)" "0"

echo
echo "=== 12. reset-and-full ACTUALLY WORKS in staging ==="
# The property every refusal above is the mirror of. Steps 3 and 11 only prove
# the operation is IMPOSSIBLE in production; on their own they were equally
# satisfied by an implementation where it was impossible EVERYWHERE — which is
# exactly what shipped. The destructive-seed policy keyed on NODE_ENV, and the
# runner image sets NODE_ENV=production in staging too, so `reset-and-full`
# refused itself in the only environment it exists for. That defect passed the
# entire suite.
#
# So this step runs it for real: same image, same runner env (NODE_ENV=production),
# AAU_ENV=staging, against a live database, and asserts the reset happened.

# What "reset" actually means here, established by reading the implementation
# rather than assumed: `createLocalizedIfMissing(..., reset: true)` UPDATES the
# existing documents back to their fixture values IN PLACE. It deliberately
# does not delete and re-create them, so document ids and the relationships
# pointing at them survive. That is the stronger behaviour, and it is what the
# assertion has to match.
#
# Two earlier attempts here were test artifacts rather than findings, and are
# recorded so nobody re-introduces them: renaming a row's SLUG broke a required
# dependency ("Missing required colleges dependency"), and then orphaned the
# fixture's own snapshot ("all-locales snapshot is missing or ambiguous"). The
# seed resolves fixtures BY SLUG, so identity columns are not a safe place to
# plant a marker. A localised, fixture-owned, non-identifying field is.
news_count_before="$(psql_admin "SELECT count(*) FROM news")"
check "there is seeded news to reset" \
  "$([[ "${news_count_before:-0}" -gt 0 ]] && echo yes || echo no)" "yes"

psql_admin "UPDATE news_locales SET title = 'LOCAL EDIT THAT MUST BE RESET'
  WHERE id = (SELECT min(id) FROM news_locales)" >/dev/null
check "a local edit is present before the reset" \
  "$(psql_admin "SELECT count(*) FROM news_locales WHERE title = 'LOCAL EDIT THAT MUST BE RESET'")" "1"

staging_log="${ROOT}/staging-reset.log"
if AAU_ENV_OVERRIDE=staging run_env bash "${ROOT}/deploy/scripts/seed.sh" reset-and-full \
     > "$staging_log" 2>&1; then
  printf '  ok   staging reset-and-full completed\n'; pass=$((pass + 1))
else
  printf '  FAIL staging reset-and-full failed\n'; fail=$((fail + 1)); tail -30 "$staging_log"
fi

contains "the seed ran as the staging deployment" "$(cat "$staging_log")" "environment: staging"
contains "a pre-seed restore point was taken first" "$(cat "$staging_log")" "pre-seed backup"

# ONE maintenance window, not two. The app must stay down from the restore
# point through the reset: if it were restarted in between, it would serve
# content that is being deleted and re-created underneath it, and anything it
# wrote in that gap would be in neither the backup nor the reseeded state.
contains "the app stays down for the whole reset" "$(cat "$staging_log")" \
  "one maintenance window"
contains "the window is closed again afterwards" "$(cat "$staging_log")" \
  "closing the maintenance window"
check "the app is serving again after the reset" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"

check "the local edit was actually reset to the fixture value" \
  "$(psql_admin "SELECT count(*) FROM news_locales WHERE title = 'LOCAL EDIT THAT MUST BE RESET'")" "0"
check "canonical content is still present after the reset" \
  "$(psql_admin "SELECT count(*) FROM news")" "$news_count_before"

echo
echo "=== 12b. a reset-and-full whose PRE-SEED BACKUP fails (class A) RESTORES service ==="
# The two failure classes must be handled OPPOSITELY, and conflating them is the
# real defect this pair of steps guards:
#   class A  the PRE-SEED backup fails, BEFORE any destructive work. The database
#            is untouched, so the app must be put BACK — leaving staging dark
#            would be an outage with no upside.
#   class B  the destructive seed fails AFTER the reset began (step 13). The app
#            must stay DOWN, because staging may be half-reset.
# backup.sh quiesces by STOPPING app-prod first, so a naive class-A path leaves
# the app down exactly like class B. This forces a deterministic pre-seed-backup
# failure — an impossible free-space floor, which backup.sh checks AFTER it has
# already quiesced the app — and asserts the safe recovery: service back, nothing
# reset. If the preflight somehow does not fire, the backup and seed both succeed
# and the very first assertion below fails loudly, so this cannot pass falsely.
news_before_classA="$(psql_admin "SELECT count(*) FROM news")"
psql_admin "UPDATE news_locales SET title = 'CLASS A MUST NOT BE RESET'
  WHERE id = (SELECT min(id) FROM news_locales)" >/dev/null
classa_log="${ROOT}/staging-reset-classA.log"
if BACKUP_MIN_FREE_MB=99999999 AAU_ENV_OVERRIDE=staging run_env \
     bash "${ROOT}/deploy/scripts/seed.sh" reset-and-full > "$classa_log" 2>&1; then
  printf '  FAIL a reset-and-full survived a failed pre-seed backup\n'; fail=$((fail + 1))
else
  printf '  ok   the reset-and-full exited non-zero when the pre-seed backup failed\n'; pass=$((pass + 1))
fi
contains "the failure is reported as a pre-seed backup failure" "$(cat "$classa_log")" \
  "pre-seed backup failed"
# It must NOT be reported or handled as a destructive (class B) failure.
if grep -qF "LEFT STOPPED" "$classa_log"; then
  printf '  FAIL a pre-seed-backup failure was mishandled as a destructive failure\n'; fail=$((fail + 1))
else
  printf '  ok   it was NOT mishandled as a destructive (class B) failure\n'; pass=$((pass + 1))
fi
if grep -qF "PARTIALLY" "$classa_log"; then
  printf '  FAIL a class-A failure falsely warned of a partial reset\n'; fail=$((fail + 1))
else
  printf '  ok   no false partial-reset warning on a class-A failure\n'; pass=$((pass + 1))
fi
check "app-prod is serving again after the class-A failure" \
  "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health")" "200"
check "the database was NOT reset (the local edit survives)" \
  "$(psql_admin "SELECT count(*) FROM news_locales WHERE title = 'CLASS A MUST NOT BE RESET'")" "1"
check "no content was destroyed by the failed class-A attempt" \
  "$(psql_admin "SELECT count(*) FROM news")" "$news_before_classA"

echo
echo "=== 13. a reset-and-full that FAILS after destructive work keeps the app DOWN ==="
# The defect: seed.sh's EXIT trap used to restart app-prod unconditionally after
# a reset-and-full, INCLUDING when the destructive reset had failed partway --
# presenting a half-reset staging as a healthy site with no operator guidance.
#
# Each seed stage commits in its OWN transaction (verified in run-seed.ts), so a
# failure in a late stage does NOT roll back an earlier one: reset-and-full is
# genuinely not one global transaction. This forces exactly that: a BEFORE
# trigger (created by the admin superuser, so it bites even though the app role
# OWNS the tables and a REVOKE would not) makes every write to pages_locales
# fail. `news` is reset by the 10th stage and commits; `pages` is reset by the
# 14th and now throws -- so by the time the runner fails, the destructive reset
# has genuinely begun. No test backdoor in the app: the injection is pure SQL.
psql_admin "UPDATE news_locales SET title = 'EDIT THAT PROVES RESET RAN'
  WHERE id = (SELECT min(id) FROM news_locales)" >/dev/null
check "the marker is present before the failed reset" \
  "$(psql_admin "SELECT count(*) FROM news_locales WHERE title = 'EDIT THAT PROVES RESET RAN'")" "1"
psql_admin "CREATE OR REPLACE FUNCTION drill_block_pages() RETURNS trigger
  LANGUAGE plpgsql AS \$fn\$ BEGIN RAISE EXCEPTION 'drill: pages write blocked'; END \$fn\$;
  DROP TRIGGER IF EXISTS drill_block_pages ON pages_locales;
  CREATE TRIGGER drill_block_pages BEFORE INSERT OR UPDATE OR DELETE ON pages_locales
    FOR EACH ROW EXECUTE FUNCTION drill_block_pages();" >/dev/null

backups_before="$(find "${ROOT}/backups" -name metadata.json 2>/dev/null | wc -l | tr -d ' ')"
fail_log="${ROOT}/staging-reset-fail.log"
if AAU_ENV_OVERRIDE=staging run_env bash "${ROOT}/deploy/scripts/seed.sh" reset-and-full \
     > "$fail_log" 2>&1; then
  printf '  FAIL a reset-and-full with a broken late stage reported success\n'; fail=$((fail + 1))
else
  printf '  ok   the failed reset-and-full exited non-zero\n'; pass=$((pass + 1))
fi
contains "the failure is reported as a reset-and-full failure" "$(cat "$fail_log")" \
  "reset-and-full seed FAILED"
contains "the app is deliberately left stopped" "$(cat "$fail_log")" "LEFT STOPPED"
contains "the partial-reset risk is stated plainly" "$(cat "$fail_log")" "PARTIALLY"
contains "the exact recovery command is printed" "$(cat "$fail_log")" "restore.sh"
# The maintenance window must NOT be closed by a restart on the failure path.
if grep -qF "closing the maintenance window" "$fail_log"; then
  printf '  FAIL the app was restarted after a failed destructive reset\n'; fail=$((fail + 1))
else
  printf '  ok   the app was NOT restarted after the failed destructive reset\n'; pass=$((pass + 1))
fi
if grep -qF "seed completed successfully" "$fail_log"; then
  printf '  FAIL a partial success was reported\n'; fail=$((fail + 1))
else
  printf '  ok   no success was reported\n'; pass=$((pass + 1))
fi
check "app-prod is not running after the failed reset" \
  "$(docker ps --filter "name=${PROJECT}-app-prod" --filter "status=running" --format '{{.Names}}' | wc -l | tr -d ' ')" "0"
check "app-prod is not serving after the failed reset" \
  "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${APP_PORT}/api/health")" "000"
backups_after="$(find "${ROOT}/backups" -name metadata.json 2>/dev/null | wc -l | tr -d ' ')"
check "a pre-seed backup was created and still exists" \
  "$([[ "$backups_after" -gt "$backups_before" ]] && echo yes || echo no)" "yes"
# The recovery line names the exact restore point as its last token; take it
# verbatim rather than pattern-matching a timestamp format.
recovery_path="$(grep -F 'deploy/scripts/restore.sh' "$fail_log" | grep -F 'AAU_ENV=' | tail -1 | awk '{print $NF}')"
check "the exact recovery restore point is a real directory" \
  "$([[ -n "$recovery_path" && -f "${recovery_path}/metadata.json" ]] && echo yes || echo no)" "yes"
check "the destructive reset genuinely began (news was reset before the failure)" \
  "$(psql_admin "SELECT count(*) FROM news_locales WHERE title = 'EDIT THAT PROVES RESET RAN'")" "0"
# Remove the injected trigger so nothing else in the drill trips over it.
psql_admin "DROP TRIGGER IF EXISTS drill_block_pages ON pages_locales" >/dev/null

echo
# The runner really was in a production BUILD while doing this — otherwise the
# test would be proving something about a dev image the VPS never runs.
check "the staging runner image is still NODE_ENV=production" \
  "$(docker run --rm --entrypoint sh "$RUNNER_IMAGE" -c 'echo $NODE_ENV')" "production"

printf '\n[seed-one-shot-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
