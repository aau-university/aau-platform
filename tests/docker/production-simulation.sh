#!/usr/bin/env bash
# Production simulation against the EXACT final runner image.
#
# This is the evidence for §21.1 / §21.2 / §21.4 of the Docker/VPS plan. It
# deliberately drives `deploy/docker-compose.vps.yml` — the real VPS runtime
# file — rather than a test-only copy, so what is proven here is the thing
# that ships. No repository source is mounted into any container.
#
# Phases:
#   1  fresh      empty DB -> runtime migrations -> identity bootstrap -> 200
#   2  restart    same image again -> nothing re-created, nothing rewritten
#   3  upgrade    DB at the previous migration state -> only pending applies,
#                 representative application data preserved
#   4  failure    deliberately broken migration ledger -> never becomes ready
#   5  persist    uploads and database survive container replacement
#
# Usage: tests/docker/production-simulation.sh [image-reference]

set -euo pipefail

readonly IMAGE="${1:-aau-runner:test}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
readonly PROJECT="aau-sim-$$"

readonly ADMIN_EMAIL="admin@aau.simulation.test"
readonly ADMIN_PASSWORD="Simulation-Bootstrap-2026!"
readonly EXPECTED_ROLES="admin content_manager coordinator doctor student super_admin"
readonly LATEST_MIGRATION="20260815_025241_one_study_plan_per_program"

WORKDIR="$(mktemp -d)"
UPLOADS_DIR="${WORKDIR}/uploads"
ENV_FILE="${WORKDIR}/.env.production"
# Distinct ports so the simulation never binds a real 3000 and can run beside
# the other drills.
SIM_APP_PORT="${SIM_APP_PORT:-13960}"
# One definition for the deliberately hostile dummy secrets. The standalone
# containers further down used to hardcode their own copy, which silently
# stopped matching the env file the moment the passwords became realistic —
# the failing-migration phase then failed on AUTHENTICATION instead of on the
# permission error it is supposed to exercise, and passed its readiness check
# for the wrong reason.
SIM_ADMIN_PASSWORD_VALUE='adm@n:p/ss?x=1&y#z%20 A1!'
SIM_APP_PASSWORD_VALUE='app@p:a/ss?q=2&r#s%20 B2!'
SIM_REDIS_PASSWORD_VALUE='red@s:p/ss?w=3#t C3!'
SIM_CANDIDATE_PORT="${SIM_CANDIDATE_PORT:-13961}"

failures=0
phase() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }
info() { printf '  ....  %s\n' "$*"; }

cleanup() {
  compose down --volumes --remove-orphans >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$WORKDIR" 2>/dev/null || sudo rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# APP_IMAGE is supplied here rather than from the env file: release identity
# deliberately has no configuration default, so compose — which parses the whole
# file for every subcommand — needs an explicit value.
compose() {
  env APP_IMAGE="${APP_IMAGE:-${IMAGE}}" \
      APP_HOST_PORT="${SIM_APP_PORT}" \
      CANDIDATE_HOST_PORT="${SIM_CANDIDATE_PORT}" \
      UPLOADS_HOST_PATH="$UPLOADS_DIR" \
    docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

psql_admin() {
  compose exec -T postgres-prod psql -U aau_admin -d aau_platform -Atc "$1"
}

# The application role is intentionally NOT a superuser, so ownership-sensitive
# checks run as the admin role while application behaviour runs as aau_app.
psql_app() {
  compose exec -T postgres-prod psql -U aau_app -d aau_platform -Atc "$1"
}

mkdir -p "${UPLOADS_DIR}/media" "${UPLOADS_DIR}/private"
# The runner image runs as the `nextjs` user (UID/GID 10001), which is NOT the
# CI runner's own uid (1001), so the bind-mounted host uploads dir must be usable
# by a different uid than the one that created it. `chmod 0777` on this throwaway
# fixture dir does that without privilege — the container (10001) can write it,
# and this drill keeps full host-side control (creating and removing fixtures is
# governed by directory write permission, not file ownership). Chowning to 10001
# instead would need sudo AND would lock this non-root drill out of its own dir.
chmod -R 0777 "$UPLOADS_DIR"

# ── Env file: the real contract, with deliberately hostile dummy secrets ──
# Every value is SINGLE-QUOTED, the only env-file form `docker compose` passes
# through byte for byte (measured in tests/deploy/env-contract-drill.sh). The
# passwords carry the interpolation, comment, URI-reserved and whitespace
# characters a genuinely strong password carries, so this simulation exercises
# the URI-encoding and redis.conf-quoting paths rather than a tame ASCII value.
#
# No APP_IMAGE and no DATABASE_URI: release identity lives in the release-state
# file, and the application assembles its own connection URI from the discrete
# APP_DB_* values.
cat > "$ENV_FILE" <<EOF
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_ADMIN_PASSWORD='${SIM_ADMIN_PASSWORD_VALUE}'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='${SIM_APP_PASSWORD_VALUE}'
REDIS_PASSWORD='${SIM_REDIS_PASSWORD_VALUE}'
PAYLOAD_SECRET='simulation-payload-secret-at-least-32-characters-long'
INITIAL_ADMIN_EMAIL='${ADMIN_EMAIL}'
INITIAL_ADMIN_PASSWORD='${ADMIN_PASSWORD}'
UPLOADS_HOST_PATH='${UPLOADS_DIR}'
EOF

# Wait for app-prod to reach a terminal health state. Returns 0 when healthy.
wait_for_health() {
  local timeout="${1:-300}"
  local deadline=$((SECONDS + timeout))
  local status
  while (( SECONDS < deadline )); do
    status="$(compose ps --format '{{.Health}}' app-prod 2>/dev/null | head -1 || true)"
    [[ "$status" == "healthy" ]] && return 0
    sleep 5
  done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 0 — compose validity, private networking, non-superuser role"

# Render the VPS compose file with the real variable set before starting
# anything: an unset required variable or a typo should fail here, loudly,
# rather than halfway through a cutover.
if compose config --quiet 2>/tmp/compose-config.err; then
  pass "deploy/docker-compose.vps.yml renders with the deployment env file"
else
  fail "compose file failed to render: $(cat /tmp/compose-config.err)"
fi

compose up --detach --wait postgres-prod redis-prod >/dev/null

# The data services must sit on a network with no gateway, so they cannot
# reach off-host at all — a stronger property than withholding a port publish.
backend_net="$(docker network ls --format '{{.Name}}' | grep "^${PROJECT}_backend$" || true)"
if [[ -n "$backend_net" ]] && \
   [[ "$(docker network inspect "$backend_net" --format '{{.Internal}}')" == "true" ]]; then
  pass "PostgreSQL/Redis run on an internal network with no gateway"
else
  fail "the backend network is not internal"
fi

# `docker port` lists only PUBLISHED host mappings. (`compose ps --format
# '{{.Ports}}'` would also show merely *exposed* container ports, which is not
# the property under test.)
for service in postgres-prod redis-prod; do
  published="$(docker port "$(compose ps -q "$service")" 2>/dev/null | tr -d '[:space:]')"
  if [[ -z "$published" ]]; then
    pass "${service} publishes no host port (private to the Compose network)"
  else
    fail "${service} publishes host ports: ${published}"
  fi
done

if [[ "$(psql_admin "SELECT rolsuper FROM pg_roles WHERE rolname = 'aau_app'")" == "f" ]]; then
  pass "application role aau_app is NOT a PostgreSQL superuser"
else
  fail "application role aau_app is a superuser"
fi

for attr in rolcreatedb rolcreaterole; do
  if [[ "$(psql_admin "SELECT ${attr} FROM pg_roles WHERE rolname = 'aau_app'")" == "f" ]]; then
    pass "application role has ${attr} = false"
  else
    fail "application role has ${attr} = true"
  fi
done

if [[ "$(psql_admin "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='aau_platform'")" == "aau_app" ]]; then
  pass "application role owns the application database (required for runtime DDL)"
else
  fail "application role does not own the application database"
fi

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 1 — fresh database: runtime migrations + identity bootstrap"

before_tables="$(psql_admin "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
[[ "$before_tables" == "0" ]] && pass "database starts empty" || fail "database was not empty (${before_tables} tables)"

compose up --detach app-prod >/dev/null
if wait_for_health 420; then
  pass "app-prod became healthy from an empty database"
else
  fail "app-prod never became healthy"
  compose logs --tail 80 --no-color app-prod || true
fi

applied="$(psql_app "SELECT string_agg(name, ' ' ORDER BY name) FROM payload_migrations")"
info "applied migrations: ${applied}"
if grep -q "$LATEST_MIGRATION" <<<"$applied"; then
  pass "all committed migrations were applied by the runner image itself"
else
  fail "latest migration missing from payload_migrations"
fi

roles="$(psql_app "SELECT string_agg(slug, ' ' ORDER BY slug) FROM roles")"
if [[ "$roles" == "$EXPECTED_ROLES" ]]; then
  pass "every canonical Role was created: ${roles}"
else
  fail "canonical Role set mismatch: got '${roles}', want '${EXPECTED_ROLES}'"
fi

# Both configured locales must be populated for newly created Roles.
locale_rows="$(psql_app "SELECT count(*) FROM roles_locales WHERE name IS NOT NULL AND _locale IN ('ar','en')")"
if [[ "${locale_rows:-0}" -ge 12 ]]; then
  pass "both localized values present for all 6 Roles (${locale_rows} rows)"
else
  fail "expected >=12 localized Role rows, got ${locale_rows}"
fi

user_count="$(psql_app "SELECT count(*) FROM users")"
admin_ok="$(psql_app "SELECT count(*) FROM users WHERE email='${ADMIN_EMAIL}' AND system_role='super_admin' AND is_active")"
[[ "$user_count" == "1" ]] && pass "exactly one user exists (the Super Admin)" || fail "expected 1 user, got ${user_count}"
[[ "$admin_ok" == "1" ]] && pass "configured Super Admin was created and is active" || fail "Super Admin not correctly created"

# No broad Seed content may appear automatically.
for table in colleges academic_programs pages news events media navigation_menus; do
  count="$(psql_app "SELECT count(*) FROM ${table}" 2>/dev/null || echo missing)"
  if [[ "$count" == "0" ]]; then
    pass "no automatic Seed content in ${table}"
  elif [[ "$count" == "missing" ]]; then
    fail "${table} does not exist — schema is incomplete"
  else
    fail "broad Seed content appeared in ${table} (${count} rows)"
  fi
done

if compose logs --no-color app-prod | grep -q 'Seed completed'; then
  fail "the broad Seed ran during startup"
else
  pass "the broad Seed never ran during startup"
fi

# The HOST side of the publish is now per-environment (3000 production, 13000
# staging, and a distinct port here), but the 127.0.0.1 prefix is not — it must
# never become interpolatable, or an env file could publish the app straight to
# the internet past the reverse proxy and CSF.
app_ports="$(docker port "$(compose ps -q app-prod)" 2>/dev/null | tr -d '[:space:]')"
if grep -q "127.0.0.1:${SIM_APP_PORT}" <<<"$app_ports" \
   && ! grep -Eq "0\.0\.0\.0:${SIM_APP_PORT}|\[::\]:${SIM_APP_PORT}" <<<"$app_ports"; then
  pass "the app port is bound to loopback only (${app_ports})"
else
  fail "app port binding is not loopback-only: ${app_ports}"
fi

health_body="$(compose exec -T app-prod node -e \
  "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>console.log(t))")"
if grep -q '"status":"ok"' <<<"$health_body"; then
  pass "/api/health returns 200 ok"
else
  fail "/api/health did not report ok: ${health_body}"
fi

# Next's image optimizer is the production code path that actually invokes
# sharp, and it is served by the runner image rather than by any test harness.
# A health check does not touch it: an image whose sharp cannot load its native
# library still answers /api/health perfectly well, which is exactly how a
# broken sharp upgrade reached "the container is up" once before.
#
# So drive a real optimization: a raster asset the config's localPatterns
# allow, at a width that forces a resize, asserting on the response status,
# the returned content type and a non-trivial body.
image_probe="$(compose exec -T app-prod node -e \
  "fetch('http://127.0.0.1:3000/_next/image?url=%2Fassets%2Funiversity-logo.png&w=256&q=75')
     .then(async r => {
       const b = Buffer.from(await r.arrayBuffer())
       console.log(r.status, r.headers.get('content-type'), b.length)
     })
     .catch(e => console.log('PROBE_ERROR', e.message))" 2>&1 || true)"
read -r image_status image_type image_bytes <<<"$image_probe"
if [[ "$image_status" == "200" && "$image_type" == image/* && "${image_bytes:-0}" -gt 512 ]]; then
  pass "/_next/image optimized a real asset through sharp (${image_type}, ${image_bytes} bytes)"
else
  fail "/_next/image did not return an optimized image: ${image_probe}"
fi

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 2 — restart idempotence"

roles_before="$(psql_app "SELECT string_agg(slug || ':' || updated_at, ',' ORDER BY slug) FROM roles")"
admin_before="$(psql_app "SELECT hash || '|' || salt || '|' || updated_at FROM users WHERE email='${ADMIN_EMAIL}'")"
migrations_before="$(psql_app "SELECT count(*) FROM payload_migrations")"

# Deliberately drift a canonical Role. An ordinary restart must NOT reconcile
# it back to the fixture — that is the create-missing-only contract.
psql_app "UPDATE roles SET can_access_refine = true WHERE slug = 'coordinator'" >/dev/null
drift_before="$(psql_app "SELECT can_access_refine FROM roles WHERE slug='coordinator'")"

compose up --detach --force-recreate app-prod >/dev/null
if wait_for_health 300; then
  pass "app-prod became healthy again on restart"
else
  fail "app-prod did not become healthy on restart"
  compose logs --tail 60 --no-color app-prod || true
fi

roles_after="$(psql_app "SELECT string_agg(slug || ':' || updated_at, ',' ORDER BY slug) FROM roles")"
admin_after="$(psql_app "SELECT hash || '|' || salt || '|' || updated_at FROM users WHERE email='${ADMIN_EMAIL}'")"
migrations_after="$(psql_app "SELECT count(*) FROM payload_migrations")"
drift_after="$(psql_app "SELECT can_access_refine FROM roles WHERE slug='coordinator'")"
role_count="$(psql_app "SELECT count(*) FROM roles")"

[[ "$roles_after" == "$roles_before" ]] && pass "no canonical Role was modified by restart" || fail "Role rows changed on restart"
[[ "$admin_after" == "$admin_before" ]] && pass "Super Admin password hash and row are untouched" || fail "Super Admin row was rewritten on restart"
[[ "$migrations_after" == "$migrations_before" ]] && pass "no migration re-ran (${migrations_after} recorded)" || fail "migration ledger changed on restart"
[[ "$drift_after" == "$drift_before" ]] && pass "deliberate Role drift was NOT reconciled by startup" || fail "startup overwrote a deliberately drifted Role"
[[ "$role_count" == "6" ]] && pass "no duplicate Roles were created" || fail "expected 6 Roles, got ${role_count}"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 3 — upgrade from the previous migration state"

compose stop app-prod >/dev/null

# Representative application data that must survive the upgrade.
psql_app "INSERT INTO categories (title, created_at, updated_at) VALUES ('upgrade-canary', now(), now()) ON CONFLICT DO NOTHING" >/dev/null 2>&1 \
  || psql_app "CREATE TABLE IF NOT EXISTS upgrade_canary (id serial primary key, marker text)" >/dev/null
psql_app "CREATE TABLE IF NOT EXISTS upgrade_canary (id serial primary key, marker text)" >/dev/null
psql_app "INSERT INTO upgrade_canary (marker) VALUES ('preserve-me')" >/dev/null
canary_before="$(psql_app "SELECT marker FROM upgrade_canary")"
admin_before_upgrade="$(psql_app "SELECT hash FROM users WHERE email='${ADMIN_EMAIL}'")"

# Roll the schema back to the previous migration state using that migration's
# own `down` SQL, then forget it in the ledger. This reproduces "an older
# compatible DB" without needing an older image.
psql_app "DROP INDEX \"study_plans_academic_program_idx\";
  CREATE INDEX \"academicProgram_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");
  CREATE INDEX \"version_academicProgram_idx\" ON \"_study_plans_v\" USING btree (\"version_academic_program_id\");
  CREATE INDEX \"study_plans_academic_program_idx\" ON \"study_plans\" USING btree (\"academic_program_id\");" >/dev/null
psql_app "DELETE FROM payload_migrations WHERE name = '${LATEST_MIGRATION}'" >/dev/null

pending_count="$(psql_app "SELECT count(*) FROM payload_migrations")"
info "ledger rolled back to ${pending_count} applied migration(s)"

is_unique_before="$(psql_app "SELECT indisunique FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='study_plans_academic_program_idx'")"
[[ "$is_unique_before" == "f" ]] && pass "schema is at the previous (non-unique index) state" || fail "could not stage the previous migration state"

compose up --detach --force-recreate app-prod >/dev/null
if wait_for_health 300; then
  pass "candidate runner became healthy against the older database"
else
  fail "candidate runner did not become healthy on upgrade"
  compose logs --tail 60 --no-color app-prod || true
fi

is_unique_after="$(psql_app "SELECT indisunique FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='study_plans_academic_program_idx'")"
migrations_upgraded="$(psql_app "SELECT count(*) FROM payload_migrations")"
canary_after="$(psql_app "SELECT marker FROM upgrade_canary")"
admin_after_upgrade="$(psql_app "SELECT hash FROM users WHERE email='${ADMIN_EMAIL}'")"

[[ "$is_unique_after" == "t" ]] && pass "the pending migration applied (unique index restored)" || fail "pending migration did not apply"
[[ "$migrations_upgraded" == "$migrations_before" ]] && pass "only the pending migration was applied" || fail "unexpected migration ledger state"
[[ "$canary_after" == "$canary_before" ]] && pass "existing application data preserved across the upgrade" || fail "application data lost during upgrade"
[[ "$admin_after_upgrade" == "$admin_before_upgrade" ]] && pass "Super Admin password preserved across the upgrade" || fail "Super Admin password changed during upgrade"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 4 — uploads and database persistence across container replacement"

compose exec -T --user 10001 app-prod sh -c \
  'mkdir -p /app/uploads/media && printf "persisted-media-fixture" > /app/uploads/media/persistence-canary.txt'
host_copy="$(cat "${UPLOADS_DIR}/media/persistence-canary.txt" 2>/dev/null || echo MISSING)"
[[ "$host_copy" == "persisted-media-fixture" ]] && pass "uploads are written to persistent host storage, not the container layer" || fail "upload did not reach host storage"

compose rm --stop --force app-prod >/dev/null
compose up --detach --force-recreate app-prod >/dev/null
wait_for_health 300 || fail "app-prod did not recover after container replacement"

survived="$(compose exec -T app-prod cat /app/uploads/media/persistence-canary.txt 2>/dev/null || echo MISSING)"
[[ "$survived" == "persisted-media-fixture" ]] && pass "uploads survived container replacement" || fail "uploads lost on container replacement"

users_survived="$(psql_app "SELECT count(*) FROM users")"
[[ "$users_survived" == "1" ]] && pass "PostgreSQL data survived container replacement" || fail "database data lost on container replacement"

# ─────────────────────────────────────────────────────────────────────────
phase "Phase 5 — migration failure keeps readiness unhealthy"

# A deterministic broken-migration scenario: a separate, empty database that
# the application role may connect to but has no CREATE privilege on. The very
# first DDL statement of the baseline migration therefore fails.
#
# (Deliberately NOT "delete the migration ledger": the baseline migration is
# idempotent, so re-running it against an existing schema SUCCEEDS. That would
# have made this test pass for the wrong reason.)
psql_admin "CREATE DATABASE migration_failure OWNER aau_admin" >/dev/null
compose exec -T postgres-prod psql -U aau_admin -d migration_failure -Atc \
  "REVOKE ALL ON SCHEMA public FROM PUBLIC;
   REVOKE ALL ON SCHEMA public FROM aau_app;
   GRANT CONNECT ON DATABASE migration_failure TO aau_app;" >/dev/null

network="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$(compose ps -q postgres-prod)")"
failing_container="${PROJECT}-migration-failure"
docker rm -f "$failing_container" >/dev/null 2>&1 || true

docker run -d --name "$failing_container" --network "$network" \
  -e NODE_ENV=production \
  -e DATABASE_HOST=postgres-prod \
  -e DATABASE_PORT=5432 \
  -e DATABASE_NAME=migration_failure \
  -e DATABASE_USER=aau_app \
  -e DATABASE_PASSWORD="$SIM_APP_PASSWORD_VALUE" \
  -e REDIS_HOST=redis-prod \
  -e REDIS_PORT=6379 \
  -e REDIS_USERNAME=default \
  -e REDIS_PASSWORD="$SIM_REDIS_PASSWORD_VALUE" \
  -e PAYLOAD_SECRET=simulation-payload-secret-at-least-32-characters-long \
  -e PAYLOAD_RUNTIME_MIGRATIONS=true \
  -e PAYLOAD_RUNTIME_BOOTSTRAP=true \
  -e PAYLOAD_SEED_ENABLED=false \
  -e INITIAL_ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e INITIAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e S3_ENABLED=false \
  "$IMAGE" >/dev/null

# Payload initializes lazily, so readiness is driven by probing /api/health —
# which is exactly what the Compose healthcheck and the deploy script do.
ready=false
for _ in $(seq 1 12); do
  if docker exec "$failing_container" node -e \
    "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then ready=true; break; fi
  sleep 5
done

if [[ "$ready" == "true" ]]; then
  fail "readiness reported healthy despite a failing migration"
else
  pass "readiness never became healthy after a failed migration"
fi

failure_logs="$(docker logs "$failing_container" 2>&1 || true)"
if grep -qiE 'error running migration|permission denied' <<<"$failure_logs"; then
  pass "the migration failure is clearly reported in the container logs"
else
  fail "no migration error surfaced in the logs"
  printf '%s\n' "$failure_logs" | tail -20
fi

# The adapter exits the process on a failed migration, so a real deployment
# crash-loops under `restart: unless-stopped` instead of serving traffic.
state="$(docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}}' "$failing_container" 2>/dev/null || echo unknown)"
info "failing container state: ${state}"
docker rm -f "$failing_container" >/dev/null 2>&1 || true

# ─────────────────────────────────────────────────────────────────────────
printf '\n'
if (( failures > 0 )); then
  printf '\033[1;31m%d assertion(s) failed.\033[0m\n' "$failures"
  exit 1
fi
printf '\033[1;32mAll production simulation assertions passed.\033[0m\n'
