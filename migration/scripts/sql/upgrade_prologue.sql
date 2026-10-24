-- Prologue for 01_upgrade_working_copy.sql — the EXECUTION MODEL, not a change
-- to the proven upgrade.
--
-- ── The defect this exists to prevent ─────────────────────────────────────
-- In PostgreSQL the owner of an object is whoever CREATEd it. The upgrade
-- creates 42 tables, 22 enum types, 157 indexes and their sequences, and it was
-- previously executed over the admin connection — so every one of those objects
-- came out owned by POSTGRES_ADMIN_USER (aau_admin) while the application
-- connects as APP_DB_USER (aau_app).
--
-- Objects restored by pg_restore were unaffected, because pg_restore is given
-- `--role aau_app` and issues its own SET ROLE. That is exactly the split the
-- live staging diagnosis measured: `_pages_v` and `_news_v` came from the Neon
-- archive and are owned by aau_app, while `_colleges_v` and every other version
-- table the upgrade created are owned by aau_admin with no ACL at all. The
-- Admin list view then dies in Payload's queryDrafts with SQLSTATE 42501,
-- `permission denied for table _colleges_v`.
--
-- ── Why SET ROLE and not a list of GRANTs ─────────────────────────────────
-- A GRANT list is a second, hand-maintained model of the schema: it has to
-- enumerate version tables, locale tables, relationship tables, array child
-- tables and sequences, and it is wrong the day the schema gains an object
-- nobody remembered to add. Creating the objects as their intended owner has no
-- list to forget, and it produces a database indistinguishable from one this
-- platform created itself — which is the actual requirement, because Payload
-- runs `prodMigrations` as the application role and needs ownership for DDL.
--
-- This prologue is a separate file so the proven upgrade stays byte-identical
-- (it is SHA-256 pinned by src/__tests__/migration/neon-migration-contract.test.ts).
SET ROLE :"app_user";

-- Prove the switch took effect rather than assuming it. A `SET ROLE` that did
-- not apply would recreate the original defect silently, and the failure would
-- only surface days later as a blank Admin page.
--
-- The expected name travels through a GUC rather than psql interpolation
-- because psql does not substitute variables inside dollar-quoted strings.
SELECT set_config('aau.expected_role', :'app_user', false);
DO $aau_assert_role$
BEGIN
  IF current_user <> current_setting('aau.expected_role') THEN
    RAISE EXCEPTION 'SET ROLE did not take effect: running as %, expected %',
      current_user, current_setting('aau.expected_role');
  END IF;
END
$aau_assert_role$;
