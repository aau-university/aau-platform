-- Machine-readable APPLICATION-OWNERSHIP probe, emitted as `key=value` lines.
--
-- The migrated database is about to become the live one, and the application
-- connects to it as APP_DB_USER — never as the admin role. So every object the
-- application must read, write or migrate has to be owned by, and reachable by,
-- that role. An object created by the wrong role is invisible in every schema
-- count: the table exists, the column count is identical, `02_verify.sql`
-- passes — and the Admin page is blank with SQLSTATE 42501.
--
-- That is not hypothetical. It is what the 2026-09-14 staging diagnosis found:
-- ten version tables owned by aau_admin with an empty ACL, while the tables
-- that came out of the Neon archive were owned by aau_app and worked.
--
-- Every count below is "how many objects are WRONG", so the contract expects 0
-- for all of them and a new kind of object cannot pass by being unlisted.
--
-- Run with `psql -At -v ON_ERROR_STOP=1 -v app_user=<role>`.

-- Tables (base tables, including every version/locale/relationship/array child
-- table) whose owner is not the application role.
SELECT 'tables_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND pg_get_userbyid(c.relowner) <> :'app_user')

-- Tables the application role cannot fully read and write. Ownership implies
-- these, so a difference between this and the count above means an explicit
-- REVOKE — checked separately rather than inferred.
UNION ALL SELECT 'tables_missing_app_dml=' || (
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND NOT (
      has_table_privilege(:'app_user', c.oid, 'SELECT') AND
      has_table_privilege(:'app_user', c.oid, 'INSERT') AND
      has_table_privilege(:'app_user', c.oid, 'UPDATE') AND
      has_table_privilege(:'app_user', c.oid, 'DELETE')))

-- Sequences. Every `serial` primary key on a version table has one, and an
-- INSERT into the table fails on the sequence alone if this is wrong.
UNION ALL SELECT 'sequences_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
    AND pg_get_userbyid(c.relowner) <> :'app_user')
UNION ALL SELECT 'sequences_missing_app_usage=' || (
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'S'
    AND NOT (
      has_sequence_privilege(:'app_user', c.oid, 'USAGE') AND
      has_sequence_privilege(:'app_user', c.oid, 'SELECT') AND
      has_sequence_privilege(:'app_user', c.oid, 'UPDATE')))

-- Views and materialized views, if the schema ever grows any.
UNION ALL SELECT 'views_not_owned_by_app=' || (
  SELECT count(*) FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    AND pg_get_userbyid(c.relowner) <> :'app_user')

-- Types. Enums matter most — Payload gives every draft-enabled collection its
-- own, and a future migration that adds a value to one needs to OWN it —
-- `ALTER TYPE ... ADD VALUE` is an owner-only operation. A type owned by the
-- admin role is therefore a migration that will fail at container start, long
-- after this import looked successful.
UNION ALL SELECT 'types_not_owned_by_app=' || (
  SELECT count(*) FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype IN ('e','c','d','r')
    AND pg_get_userbyid(t.typowner) <> :'app_user'
    -- Relation-backed composite row types are excluded: every table and view
    -- has one, it is owned with its relation, and counting it here would
    -- double-report the table counter above. The production object census in
    -- deploy/scripts/initialize-from-backup.sh draws the line the same way.
    AND NOT EXISTS (SELECT 1 FROM pg_class c
                     WHERE c.reltype = t.oid
                       AND c.relkind IN ('r','p','v','m','S','f')))

-- Functions and procedures. `pg_dump --schema=public` restores these too, and
-- an admin-owned one cannot be replaced or dropped by the application role's
-- own migrations for the same reason an admin-owned enum cannot be extended.
UNION ALL SELECT 'routines_not_owned_by_app=' || (
  SELECT count(*) FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND pg_get_userbyid(p.proowner) <> :'app_user')

-- The schema itself: owned by the application role, and usable and extendable
-- by it, because `prodMigrations` performs DDL as that role at every start.
UNION ALL SELECT 'public_schema_owner=' || (
  SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'public')
UNION ALL SELECT 'app_schema_usage=' ||
  has_schema_privilege(:'app_user', 'public', 'USAGE')::text
UNION ALL SELECT 'app_schema_create=' ||
  has_schema_privilege(:'app_user', 'public', 'CREATE')::text

-- The database. `deploy/postgres/initdb/10-application-role.sh` makes the
-- application role the database owner; a promoted database that differs from
-- one this platform provisioned itself is a difference waiting to surprise
-- someone at 3am.
UNION ALL SELECT 'database_owner=' || (
  SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = current_database())
UNION ALL SELECT 'app_database_connect=' ||
  has_database_privilege(:'app_user', current_database(), 'CONNECT')::text

-- PUBLIC must not be able to create in the schema. Part of the same contract
-- the initdb script establishes, and cheap to confirm here.
UNION ALL SELECT 'public_role_schema_create=' ||
  has_schema_privilege('public', 'public', 'CREATE')::text;
