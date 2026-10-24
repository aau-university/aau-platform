#!/usr/bin/env bash
# Regression test for the failure the first real Staging rehearsal hit.
#
# ── The defect ────────────────────────────────────────────────────────────
# neon-import.sh created the scratch database the ordinary way, so it already
# had a `public` schema. The Neon archive ALSO contains `CREATE SCHEMA public` —
# pg_dump emits that whenever the schema is owned by a non-bootstrap role, which
# it is on Neon — and `pg_restore --exit-on-error` therefore died on:
#
#     ERROR: schema "public" already exists
#
# Agent B stopped fail-closed, correctly, with staging untouched.
#
# ── Why this drill uses a real PostgreSQL ─────────────────────────────────
# Every part of this bug is server behaviour: whether pg_dump puts a CREATE
# SCHEMA in the archive, whether a fresh database has a public schema, and what
# --exit-on-error does when they collide. A source-text assertion would have
# happily passed while the rehearsal failed. So this builds a real cluster,
# takes a real custom-format dump with the SAME flags neon-export.sh uses, and
# restores it with the SAME flags neon-import.sh uses.
#
# It is mutation-checked: the OLD preparation must still reproduce the original
# error, or this drill is not testing what it claims to.

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

# ── Locate a real server ──────────────────────────────────────────────────
PGBIN=""
if command -v pg_config >/dev/null 2>&1 && [[ -x "$(pg_config --bindir 2>/dev/null)/initdb" ]]; then
  PGBIN="$(pg_config --bindir)"
else
  for dir in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -Vr); do
    [[ -x "${dir}/initdb" && -x "${dir}/postgres" ]] && { PGBIN="$dir"; break; }
  done
fi
# No local server? Re-enter inside the SAME digest-pinned PostgreSQL 18 image
# the VPS runs, which carries every binary this needs. The behaviour under test
# (pg_dump emitting CREATE SCHEMA public, a fresh database already having one,
# and --exit-on-error refusing the collision) is identical on 16 and 18, so
# either host proves the regression — but the pinned image is the closer match
# to production and the reason this never silently skips.
if [[ -z "$PGBIN" && "${PG_DRILL_IN_CONTAINER:-}" != "1" ]]; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    printf 'no local PostgreSQL server; re-running inside the pinned PostgreSQL 18 image\n'
    exec docker run --rm -e PG_DRILL_IN_CONTAINER=1 \
      -v "${REPO_ROOT}:/repo:ro" -w /repo \
      postgres:18.6-bookworm@sha256:7d2695c3aa88e792e8b3b233e7e4adb296a20412c6c0ca361e3edaaacfada108 \
      bash tests/migration/neon-scratch-restore-drill.sh
  fi
fi
if [[ -z "$PGBIN" ]]; then
  # Inside the postgres image the binaries are on PATH rather than under
  # /usr/lib/postgresql/<v>/bin.
  if command -v initdb >/dev/null 2>&1 && command -v postgres >/dev/null 2>&1; then
    PGBIN="$(dirname "$(command -v initdb)")"
  fi
fi
if [[ -z "$PGBIN" ]]; then
  printf 'ERROR: no PostgreSQL server binaries found (initdb/postgres), and no Docker\n' >&2
  printf 'to fall back to. This drill exercises real server behaviour and cannot be\n' >&2
  printf 'simulated, so it fails rather than silently passing.\n' >&2
  exit 1
fi
printf 'using %s (%s)\n' "$PGBIN" "$("${PGBIN}/postgres" --version)"

WORK="$(mktemp -d)"
PORT="${PG_DRILL_PORT:-55432}"

# postgres refuses to run as root, so when this drill runs as root (containers,
# some CI images) everything is done as the `postgres` account instead. On an
# ordinary unprivileged runner it runs directly.
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

as_pg "'${PGBIN}/initdb' -D '${WORK}/data' -U pgadmin --auth=trust" >/dev/null 2>&1 \
  || { printf 'ERROR: initdb failed\n' >&2; exit 1; }
# Loopback listening is disabled; the drill talks over a unix socket in its own
# temp directory, so it cannot collide with anything else on the machine.
as_pg "'${PGBIN}/pg_ctl' -D '${WORK}/data' -o '-k ${WORK} -p ${PORT} -c listen_addresses=' -l '${WORK}/log' start" >/dev/null 2>&1 \
  || { printf 'ERROR: could not start the test server\n' >&2; cat "${WORK}/log" >&2 || true; exit 1; }

psql_as() { as_pg "'${PGBIN}/psql' -h '${WORK}' -p ${PORT} -U pgadmin $1"; }
q() { psql_as "-d $1 -At -c \"$2\"" 2>/dev/null; }

readonly APP_ROLE=aau_app

printf '\n== 1. a Neon-shaped source produces an archive containing CREATE SCHEMA public ==\n'
psql_as "-d postgres -v ON_ERROR_STOP=1 -c 'CREATE ROLE ${APP_ROLE} LOGIN' -c 'CREATE DATABASE source_db OWNER ${APP_ROLE}'" >/dev/null 2>&1
# The schema owned by a non-bootstrap role is what makes pg_dump emit CREATE
# SCHEMA public — the same situation as the real Neon source.
psql_as "-d source_db -v ON_ERROR_STOP=1 -c 'ALTER SCHEMA public OWNER TO ${APP_ROLE}' \
  -c 'CREATE TABLE media (id integer PRIMARY KEY, url text)' \
  -c \"INSERT INTO media VALUES (3, '/api/media/file/x.png'), (4, '/api/media/file/y.png')\" \
  -c 'CREATE TABLE private_media (id integer PRIMARY KEY)' \
  -c 'INSERT INTO private_media VALUES (1)'" >/dev/null 2>&1

# EXACTLY the flags migration/scripts/neon-export.sh uses.
as_pg "'${PGBIN}/pg_dump' -h '${WORK}' -p ${PORT} -U pgadmin \
  --format=custom --compress=9 --schema=public --no-owner --no-privileges source_db" \
  > "${WORK}/neon.dump" 2>/dev/null
chmod 0644 "${WORK}/neon.dump"
if [[ -s "${WORK}/neon.dump" ]]; then ok 'a custom-format dump was produced'
else bad 'a custom-format dump was produced' 'the dump is empty'; fi

toc="$(as_pg "'${PGBIN}/pg_restore' --list '${WORK}/neon.dump'" 2>/dev/null)"
if [[ "$toc" == *"SCHEMA - public"* ]]; then
  ok 'the archive contains CREATE SCHEMA public (the condition that broke the rehearsal)'
else
  bad 'the archive contains CREATE SCHEMA public' \
      'it does not, so this drill would prove nothing about the real failure'
fi

printf '\n== 2. MUTATION: the OLD preparation still reproduces the rehearsal failure ==\n'
psql_as "-d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE scratch_old OWNER ${APP_ROLE}'" >/dev/null 2>&1
old_out="$(as_pg "'${PGBIN}/pg_restore' --no-owner --role ${APP_ROLE} -h '${WORK}' -p ${PORT} \
  -U pgadmin --dbname scratch_old --exit-on-error < '${WORK}/neon.dump'" 2>&1)"
old_status=$?
if (( old_status != 0 )) && [[ "$old_out" == *'schema "public" already exists'* ]]; then
  ok 'the old preparation fails with: schema "public" already exists'
else
  bad 'the old preparation fails with: schema "public" already exists' \
      "status=${old_status} output=$(printf '%s' "$old_out" | tr '\n' ' ' | cut -c1-200)"
fi

printf '\n== 3. the PREPARED scratch database restores cleanly, --exit-on-error intact ==\n'
# Exactly the sequence neon-import.sh performs.
psql_as "-d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE scratch_new OWNER ${APP_ROLE} TEMPLATE template0'" >/dev/null 2>&1
# `q` sends stderr to /dev/null and yields an empty string on any failure, so
# comparing two `q` results directly passes when BOTH probes failed — including
# when the CREATE DATABASE above failed and scratch_new does not exist. Every
# other check in this file compares against a literal, which fails closed;
# this one has to establish that it measured something first.
encoding_sql="select pg_encoding_to_char(encoding)||'|'||datcollate||'|'||datctype from pg_database where datname=current_database()"
source_encoding="$(q source_db "$encoding_sql")"
if [[ -z "${source_encoding//[[:space:]]/}" ]]; then
  bad 'the scratch database inherits the live encoding/collation' \
      'the source_db probe returned nothing — the comparison would be vacuous'
else
  check 'the scratch database inherits the live encoding/collation' \
    "$(q scratch_new "$encoding_sql")" "$source_encoding"
fi

psql_as "-d scratch_new -v ON_ERROR_STOP=1 -Atq -c 'DROP SCHEMA IF EXISTS public'" >/dev/null 2>&1
check 'the default public schema is gone before the restore' \
  "$(q scratch_new "select count(*) from pg_namespace where nspname='public'")" '0'

new_out="$(as_pg "'${PGBIN}/pg_restore' --no-owner --role ${APP_ROLE} -h '${WORK}' -p ${PORT} \
  -U pgadmin --dbname scratch_new --exit-on-error < '${WORK}/neon.dump'" 2>&1)"
new_status=$?
check 'pg_restore --exit-on-error succeeds into the prepared database' "$new_status" '0'
if [[ -z "$new_out" ]]; then ok 'the restore emitted no errors'
else bad 'the restore emitted no errors' "$(printf '%s' "$new_out" | tr '\n' ' ' | cut -c1-200)"; fi

check 'the public media rows arrived' "$(q scratch_new 'select count(*) from media')" '2'
check 'the private media rows arrived' "$(q scratch_new 'select count(*) from private_media')" '1'

printf '\n== 4. the AAU privilege contract, applied AFTER the restore ==\n'
# The archive recreated `public`, so anything applied to the original schema is
# gone; and the export carries --no-privileges, so the archive has no ACLs.
# This step is the only thing that establishes the contract.
psql_as "-d scratch_new -v ON_ERROR_STOP=1 -Atq -v app_user=${APP_ROLE} \
  -c 'ALTER SCHEMA public OWNER TO :\"app_user\"' \
  -c 'GRANT ALL PRIVILEGES ON DATABASE scratch_new TO :\"app_user\"' \
  -c 'REVOKE CREATE ON SCHEMA public FROM PUBLIC'" >/dev/null 2>&1

check 'the public schema is owned by the application role' \
  "$(q scratch_new "select pg_get_userbyid(nspowner) from pg_namespace where nspname='public'")" "$APP_ROLE"
check 'PUBLIC cannot create in the public schema' \
  "$(q scratch_new "select has_schema_privilege('public','public','CREATE')")" 'f'
check 'the application role can create in the public schema' \
  "$(q scratch_new "select has_schema_privilege('${APP_ROLE}','public','CREATE')")" 't'
check 'the application role can connect to the database' \
  "$(q scratch_new "select has_database_privilege('${APP_ROLE}',current_database(),'CONNECT')")" 't'
check 'the application role owns the restored tables' \
  "$(q scratch_new "select count(*) from pg_tables where schemaname='public' and tableowner<>'${APP_ROLE}'")" '0'

printf '\n== 5. neon-import.sh performs these steps, in this order ==\n'
# Comment lines are stripped: this file EXPLAINS why --clean and --if-exists are
# not used, and a naive substring search over the whole file would find those
# words in the explanation and report the opposite of the truth.
src="$(grep -vE '^[[:space:]]*#' "$IMPORT")"
pos() { printf '%s' "${src%%"$1"*}" | wc -c; }

for needle in \
  'CREATE DATABASE :"scratch" OWNER :"app_user" TEMPLATE template0;' \
  'DROP SCHEMA IF EXISTS public;' \
  'pg_restore --no-owner --role "$APP_DB_USER"' \
  'ALTER SCHEMA public OWNER TO :"app_user";'
do
  if [[ "$src" == *"$needle"* ]]; then ok "performs: ${needle}"
  else bad "performs: ${needle}" 'not found in neon-import.sh'; fi
done

create_at="$(pos 'TEMPLATE template0;')"
drop_at="$(pos 'DROP SCHEMA IF EXISTS public;')"
restore_at="$(pos 'pg_restore --no-owner --role "$APP_DB_USER"')"
priv_at="$(pos 'ALTER SCHEMA public OWNER TO :"app_user";')"
if (( create_at < drop_at && drop_at < restore_at && restore_at < priv_at )); then
  ok 'order is: create(template0) -> drop public -> pg_restore -> privilege contract'
else
  bad 'order is: create(template0) -> drop public -> pg_restore -> privilege contract' \
      "create=${create_at} drop=${drop_at} restore=${restore_at} priv=${priv_at}"
fi

printf '\n== 6. the restore was not weakened to get past the error ==\n'
if [[ "$src" == *'--exit-on-error'* ]]; then ok 'pg_restore keeps --exit-on-error'
else bad 'pg_restore keeps --exit-on-error' 'it was removed'; fi
for forbidden in '--clean' '--if-exists' 'pg_restore --no-owner --role "$APP_DB_USER" || true'; do
  if [[ "$src" == *"$forbidden"* ]]; then
    bad "the restore does not use ${forbidden}" 'it is present — the failure signal would be suppressed'
  else
    ok "the restore does not use ${forbidden}"
  fi
done

printf '\n%d passed, %d failed\n' "$pass" "$fail_count"
(( fail_count == 0 ))
