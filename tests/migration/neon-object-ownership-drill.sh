#!/usr/bin/env bash
# Regression test for the defect the 2026-09-14 live Staging diagnosis found.
#
# ── The defect ────────────────────────────────────────────────────────────
# neon-import.sh executed migration/simulation/01_upgrade_working_copy.sql over
# the ADMIN connection. In PostgreSQL the owner of an object is whoever created
# it, so all 42 tables, 22 enum types and their sequences came out owned by
# aau_admin — while the application connects as aau_app.
#
# The tables restored from the Neon archive were unaffected, because pg_restore
# is given `--role aau_app`. That is exactly the split measured on live staging:
#
#     _pages_v, _news_v          owned by aau_app   -> the Admin works
#     _colleges_v and nine more  owned by aau_admin -> permission denied (42501)
#
# Nothing in the schema counts changes: same tables, same columns, same indexes.
# 02_verify.sql passed. The Admin list view died inside Payload's queryDrafts.
#
# ── Why this drill uses a real PostgreSQL ─────────────────────────────────
# Every part of it is server behaviour — who owns an object created under
# `SET ROLE`, what an empty relacl means for a non-owner, and which SQLSTATE
# comes back. A source-text assertion would have passed throughout the outage.
#
# It is mutation-checked: running the upgrade the OLD way must still reproduce
# `permission denied`, or this drill is not testing what it claims to.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly IMPORT="${REPO_ROOT}/migration/scripts/neon-import.sh"
readonly PROLOGUE="${REPO_ROOT}/migration/scripts/sql/upgrade_prologue.sql"
readonly OWNERSHIP_SQL="${REPO_ROOT}/migration/scripts/sql/ownership_contract.sql"

pass=0
fail_count=0
ok()  { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  FAIL %s\n       %s\n' "$1" "$2"; fail_count=$((fail_count + 1)); }
check() {
  if [[ "$2" == "$3" ]]; then ok "$1"
  else bad "$1" "expected: $3
       actual:   $2"; fi
}

# ── Locate a real server (same strategy as the scratch-restore drill) ─────
PGBIN=""
if command -v pg_config >/dev/null 2>&1 && [[ -x "$(pg_config --bindir 2>/dev/null)/initdb" ]]; then
  PGBIN="$(pg_config --bindir)"
else
  for dir in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -Vr); do
    [[ -x "${dir}/initdb" && -x "${dir}/postgres" ]] && { PGBIN="$dir"; break; }
  done
fi
if [[ -z "$PGBIN" && "${PG_DRILL_IN_CONTAINER:-}" != "1" ]]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    printf 'no local PostgreSQL server; re-running inside the pinned PostgreSQL 18 image\n'
    exec docker run --rm -e PG_DRILL_IN_CONTAINER=1 \
      -v "${REPO_ROOT}:/repo:ro" -w /repo \
      postgres:18.6-bookworm@sha256:7d2695c3aa88e792e8b3b233e7e4adb296a20412c6c0ca361e3edaaacfada108 \
      bash tests/migration/neon-object-ownership-drill.sh
  fi
fi
if [[ -z "$PGBIN" ]] && command -v initdb >/dev/null 2>&1 && command -v postgres >/dev/null 2>&1; then
  PGBIN="$(dirname "$(command -v initdb)")"
fi
if [[ -z "$PGBIN" ]]; then
  printf 'ERROR: no PostgreSQL server binaries found (initdb/postgres), and no Docker\n' >&2
  printf 'to fall back to. This drill exercises real server behaviour and cannot be\n' >&2
  printf 'simulated, so it fails rather than silently passing.\n' >&2
  exit 1
fi
printf 'using %s (%s)\n' "$PGBIN" "$("${PGBIN}/postgres" --version)"

WORK="$(mktemp -d)"
PORT="${PG_DRILL_PORT:-55433}"

RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then
  if getent passwd postgres >/dev/null; then
    RUNAS=postgres
    chown -R postgres:postgres "$WORK"
  else
    printf 'ERROR: running as root and there is no postgres account to drop to.\n' >&2
    exit 1
  fi
fi
as_pg() { if [[ -n "$RUNAS" ]]; then su "$RUNAS" -c "$1"; else bash -c "$1"; fi; }

stop_server() {
  as_pg "'${PGBIN}/pg_ctl' -D '${WORK}/data' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap stop_server EXIT

# The admin role is named after the real one so the drill output reads like the
# diagnosis it reproduces.
readonly ADMIN_ROLE=aau_admin
readonly APP_ROLE=aau_app

as_pg "'${PGBIN}/initdb' -D '${WORK}/data' -U ${ADMIN_ROLE} --auth=trust" >/dev/null 2>&1 \
  || { printf 'ERROR: initdb failed\n' >&2; exit 1; }
as_pg "'${PGBIN}/pg_ctl' -D '${WORK}/data' -o '-k ${WORK} -p ${PORT} -c listen_addresses=' -l '${WORK}/log' start" >/dev/null 2>&1 \
  || { printf 'ERROR: could not start the test server\n' >&2; cat "${WORK}/log" >&2 || true; exit 1; }

psql_as() { as_pg "'${PGBIN}/psql' -h '${WORK}' -p ${PORT} -U ${ADMIN_ROLE} $1"; }
q() { psql_as "-d $1 -At -c \"$2\"" 2>/dev/null; }

# ── A miniature of what 01_upgrade_working_copy.sql creates ───────────────
# The proven upgrade is 1099 lines; what matters for ownership is the SHAPE of
# what it creates, and it is exactly these four kinds of object: an enum type, a
# table with a `serial` primary key (which brings a sequence), a locale child
# table and an index. Reproducing the shape rather than copying the file keeps
# this drill independent of the file's contents — which are SHA-256 pinned
# elsewhere and must not be edited to make a test pass.
cat > "${WORK}/mini_upgrade.sql" <<'EOSQL'
\set ON_ERROR_STOP on
BEGIN;
CREATE TYPE public."enum__colleges_v_version_status" AS ENUM ('draft', 'published');
CREATE TABLE public."_colleges_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version__status" enum__colleges_v_version_status DEFAULT 'draft'::enum__colleges_v_version_status,
  "latest" boolean
);
CREATE TABLE public."_colleges_v_locales" (
  "id" serial NOT NULL,
  "version_name" character varying,
  "_locale" character varying NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE INDEX "_colleges_v_latest_idx" ON public."_colleges_v" ("latest");
COMMIT;
EOSQL
chmod 0644 "${WORK}/mini_upgrade.sql"

# The starting point both halves share: a database provisioned the way
# deploy/postgres/initdb/10-application-role.sh provisions one, holding a table
# that came from the archive (so it is owned by the application role, like
# _pages_v on real staging).
setup_database() {
  local db="$1"
  psql_as "-d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE ${db} OWNER ${APP_ROLE} TEMPLATE template0'" >/dev/null 2>&1
  psql_as "-d ${db} -v ON_ERROR_STOP=1 \
    -c 'ALTER SCHEMA public OWNER TO ${APP_ROLE}' \
    -c 'GRANT ALL PRIVILEGES ON DATABASE ${db} TO ${APP_ROLE}' \
    -c 'REVOKE CREATE ON SCHEMA public FROM PUBLIC' \
    -c 'SET ROLE ${APP_ROLE}; CREATE TABLE public.\"_pages_v\" (id serial, latest boolean)'" >/dev/null 2>&1
}

psql_as "-d postgres -v ON_ERROR_STOP=1 -c 'CREATE ROLE ${APP_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'" >/dev/null 2>&1

printf '\n== 1. MUTATION: the OLD execution model still reproduces the outage ==\n'
setup_database old_db
as_pg "'${PGBIN}/psql' -h '${WORK}' -p ${PORT} -U ${ADMIN_ROLE} -d old_db -v ON_ERROR_STOP=1 \
  -f '${WORK}/mini_upgrade.sql'" >/dev/null 2>&1
old_upgrade_status=$?
check 'the old way applies the upgrade without error' "$old_upgrade_status" '0'

check 'the archive-restored table is owned by the application role' \
  "$(q old_db "select tableowner from pg_tables where tablename='_pages_v'")" "$APP_ROLE"
check 'the UPGRADE-created version table is owned by the admin role' \
  "$(q old_db "select tableowner from pg_tables where tablename='_colleges_v'")" "$ADMIN_ROLE"
check 'the application role has no privilege on it' \
  "$(q old_db "select has_table_privilege('${APP_ROLE}','_colleges_v','SELECT')")" 'f'

# The live symptom, reproduced end to end: the same session can read the table
# that came from the archive and cannot read the one the upgrade created.
denied="$(psql_as "-d old_db -At -v ON_ERROR_STOP=1 \
  -c 'SET ROLE ${APP_ROLE}' -c 'SELECT count(*) FROM _colleges_v WHERE latest IS TRUE'" 2>&1)"
if [[ "$denied" == *'permission denied for table _colleges_v'* ]]; then
  ok 'as the application role: permission denied for table _colleges_v (the live error)'
else
  bad 'as the application role: permission denied for table _colleges_v' \
      "got: $(printf '%s' "$denied" | tr '\n' ' ' | cut -c1-200)"
fi
# `-c 'SET ROLE ...'` prints its own `SET` command tag, so the value under test
# is the LAST line rather than the whole output.
last_line() { printf '%s\n' "$1" | tail -n1 | tr -d '[:space:]'; }
allowed="$(psql_as "-d old_db -At -v ON_ERROR_STOP=1 \
  -c 'SET ROLE ${APP_ROLE}' -c 'SELECT count(*) FROM _pages_v WHERE latest IS TRUE'" 2>&1)"
check 'as the application role: the archive-restored table still reads (the live control)' \
  "$(last_line "$allowed")" '0'

printf '\n== 2. the ownership contract FAILS on that database ==\n'
# The gate has to be able to see the defect, not just agree with a correct run.
old_probe="$(psql_as "-d old_db -At -v ON_ERROR_STOP=1 -v app_user=${APP_ROLE} -f '${OWNERSHIP_SQL}'" 2>/dev/null)"
probe_value() { printf '%s\n' "$1" | sed -n "s/^${2}=//p" | tail -n1; }
if [[ "$(probe_value "$old_probe" tables_not_owned_by_app)" -ge 1 ]]; then
  ok "the probe reports $(probe_value "$old_probe" tables_not_owned_by_app) table(s) not owned by the application role"
else
  bad 'the probe reports tables not owned by the application role' \
      "it reported $(probe_value "$old_probe" tables_not_owned_by_app) — the gate would not have caught the outage"
fi
if [[ "$(probe_value "$old_probe" tables_missing_app_dml)" -ge 1 ]]; then
  ok "the probe reports $(probe_value "$old_probe" tables_missing_app_dml) table(s) the application role cannot use"
else
  bad 'the probe reports tables the application role cannot use' \
      "it reported $(probe_value "$old_probe" tables_missing_app_dml)"
fi
if [[ "$(probe_value "$old_probe" sequences_not_owned_by_app)" -ge 1 ]]; then
  ok "the probe reports $(probe_value "$old_probe" sequences_not_owned_by_app) sequence(s) not owned by the application role"
else
  bad 'the probe reports sequences not owned by the application role' \
      "it reported $(probe_value "$old_probe" sequences_not_owned_by_app)"
fi
check 'the probe reports the admin-owned enum type' \
  "$(probe_value "$old_probe" types_not_owned_by_app)" '1'

printf '\n== 3. the FIXED execution model: the prologue, then the same upgrade ==\n'
setup_database new_db
# Exactly what neon-import.sh does: the committed prologue is concatenated in
# front of the proven upgrade and both are fed to one psql session.
cat "${PROLOGUE}" "${WORK}/mini_upgrade.sql" > "${WORK}/combined.sql"
chmod 0644 "${WORK}/combined.sql"
new_out="$(as_pg "'${PGBIN}/psql' -h '${WORK}' -p ${PORT} -U ${ADMIN_ROLE} -d new_db \
  -v ON_ERROR_STOP=1 -v app_user=${APP_ROLE} -f '${WORK}/combined.sql'" 2>&1)"
new_status=$?
check 'the prologue + upgrade applies without error' "$new_status" '0'
if (( new_status != 0 )); then
  printf '       output: %s\n' "$(printf '%s' "$new_out" | tr '\n' ' ' | cut -c1-400)"
fi

check 'the version table is now owned by the application role' \
  "$(q new_db "select tableowner from pg_tables where tablename='_colleges_v'")" "$APP_ROLE"
check 'the locale child table is owned by the application role' \
  "$(q new_db "select tableowner from pg_tables where tablename='_colleges_v_locales'")" "$APP_ROLE"
check 'every sequence is owned by the application role' \
  "$(q new_db "select count(*) from pg_sequences where schemaname='public' and sequenceowner<>'${APP_ROLE}'")" '0'
check 'the enum type is owned by the application role' \
  "$(q new_db "select count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype='e' and pg_get_userbyid(t.typowner)<>'${APP_ROLE}'")" '0'
check 'the index belongs to an application-owned table' \
  "$(q new_db "select count(*) from pg_indexes i join pg_tables t on t.tablename=i.tablename where i.schemaname='public' and i.indexname='_colleges_v_latest_idx' and t.tableowner<>'${APP_ROLE}'")" '0'

# The symptom is gone, proved the same way it was proved present.
fixed="$(psql_as "-d new_db -At -v ON_ERROR_STOP=1 \
  -c 'SET ROLE ${APP_ROLE}' -c 'SELECT count(*) FROM _colleges_v WHERE latest IS TRUE'" 2>&1)"
check 'as the application role: the version table now reads' "$(last_line "$fixed")" '0'

# Reading is not enough — Payload writes version rows, and a write needs the
# sequence too.
# The status has to be captured explicitly: this file has no `set -e`, and a
# glob of `*1*` is satisfied by psql error text such as "LINE 1:", so a failed
# INSERT could report a successful one. Compare the FINAL line — the count —
# against exactly 1, and require psql to have succeeded.
wrote_status=0
wrote="$(psql_as "-d new_db -At -v ON_ERROR_STOP=1 \
  -c 'SET ROLE ${APP_ROLE}' \
  -c \"INSERT INTO _colleges_v (parent_id, version__status, latest) VALUES (1,'published',true)\" \
  -c 'SELECT count(*) FROM _colleges_v'" 2>&1)" || wrote_status=$?
wrote_count="$(printf '%s' "$wrote" | tail -n 1 | tr -d '[:space:]')"
if (( wrote_status == 0 )) && [[ "$wrote_count" == '1' ]]; then
  ok 'as the application role: a version row can be INSERTed (sequence included)'
else
  bad 'as the application role: a version row can be INSERTed' \
      "got: $(printf '%s' "$wrote" | tr '\n' ' ' | cut -c1-200)"
fi

printf '\n== 4. the ownership contract PASSES on the fixed database ==\n'
new_probe="$(psql_as "-d new_db -At -v ON_ERROR_STOP=1 -v app_user=${APP_ROLE} -f '${OWNERSHIP_SQL}'" 2>/dev/null)"
for key in tables_not_owned_by_app tables_missing_app_dml sequences_not_owned_by_app \
           sequences_missing_app_usage views_not_owned_by_app types_not_owned_by_app; do
  check "${key} = 0" "$(probe_value "$new_probe" "$key")" '0'
done
check 'public_schema_owner'        "$(probe_value "$new_probe" public_schema_owner)" "$APP_ROLE"
check 'database_owner'             "$(probe_value "$new_probe" database_owner)" "$APP_ROLE"
check 'app_schema_usage'           "$(probe_value "$new_probe" app_schema_usage)" 'true'
check 'app_schema_create'          "$(probe_value "$new_probe" app_schema_create)" 'true'
check 'app_database_connect'       "$(probe_value "$new_probe" app_database_connect)" 'true'
check 'public_role_schema_create'  "$(probe_value "$new_probe" public_role_schema_create)" 'false'

printf '\n== 5. the prologue fails closed ==\n'
# A prologue that cannot switch role must stop the run, not continue as admin
# and silently recreate the defect.
setup_database closed_db
closed_out="$(as_pg "'${PGBIN}/psql' -h '${WORK}' -p ${PORT} -U ${ADMIN_ROLE} -d closed_db \
  -v ON_ERROR_STOP=1 -v app_user=role_that_does_not_exist -f '${WORK}/combined.sql'" 2>&1)"
closed_status=$?
if (( closed_status != 0 )); then
  ok 'an unusable application role aborts the run instead of falling back to admin'
else
  bad 'an unusable application role aborts the run' \
      "psql exited 0: $(printf '%s' "$closed_out" | tr '\n' ' ' | cut -c1-200)"
fi
check 'nothing was created by the aborted run' \
  "$(q closed_db "select count(*) from pg_tables where schemaname='public' and tablename='_colleges_v'")" '0'

printf '\n== 6. neon-import.sh wires it this way ==\n'
# Comment lines are stripped: this repository explains its reasoning in comments,
# and a naive substring search over the whole file finds the explanation rather
# than the code.
src="$(grep -vE '^[[:space:]]*#' "$IMPORT")"
pos() { printf '%s' "${src%%"$1"*}" | wc -c; }

for needle in \
  'cat "${HERE}/sql/upgrade_prologue.sql"' \
  'cat "${MIGRATION_ROOT}/simulation/01_upgrade_working_copy.sql"' \
  '-v app_user="$APP_DB_USER" -f -' \
  'sql/ownership_contract.sql' \
  'sql/versions_contract.sql' \
  '/app/version-backfill-runner.mjs --mode backfill-initial-versions'
do
  if [[ "$src" == *"$needle"* ]]; then ok "wires: ${needle}"
  else bad "wires: ${needle}" 'not found in neon-import.sh'; fi
done

prologue_at="$(pos 'cat "${HERE}/sql/upgrade_prologue.sql"')"
upgrade_at="$(pos 'cat "${MIGRATION_ROOT}/simulation/01_upgrade_working_copy.sql"')"
owner_at="$(pos 'sql/ownership_contract.sql')"
backfill_at="$(pos '/app/version-backfill-runner.mjs --mode backfill-initial-versions')"
versions_at="$(pos 'sql/versions_contract.sql')"
if (( prologue_at < upgrade_at && upgrade_at < owner_at && owner_at < backfill_at && backfill_at < versions_at )); then
  ok 'order is: prologue -> upgrade -> ownership gate -> backfill -> versions gate'
else
  bad 'order is: prologue -> upgrade -> ownership gate -> backfill -> versions gate' \
      "prologue=${prologue_at} upgrade=${upgrade_at} ownership=${owner_at} backfill=${backfill_at} versions=${versions_at}"
fi

# The backfill must be aimed at the scratch database and must not be allowed to
# migrate or bootstrap as a side effect.
for needle in \
  '-e DATABASE_NAME="$SCRATCH_DB"' \
  '-e PAYLOAD_RUNTIME_MIGRATIONS=false' \
  '-e PAYLOAD_RUNTIME_BOOTSTRAP=false'
do
  if [[ "$src" == *"$needle"* ]]; then ok "backfill invocation sets: ${needle}"
  else bad "backfill invocation sets: ${needle}" 'not found in neon-import.sh'; fi
done

# The proven upgrade must not have been edited to carry the SET ROLE itself.
if grep -qiE 'set[[:space:]]+role' "${REPO_ROOT}/migration/simulation/01_upgrade_working_copy.sql"; then
  bad 'the proven upgrade is unmodified' 'it now contains a SET ROLE — the prologue exists so it does not have to'
else
  ok 'the proven upgrade is unmodified (the role switch lives in the prologue)'
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail_count"
(( fail_count == 0 ))
