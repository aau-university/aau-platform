-- Machine-readable CANONICAL-VERSION probe, emitted as `key=value` lines.
--
-- PR #25 gave five collections a draft/publish workflow and five globals an
-- audit history. Payload serves the Admin list view for a draft-enabled
-- collection through `queryDrafts`, which reads the version table — so a
-- migrated document with no `latest` version row is a document the Admin
-- cannot see, even though the main table holds it and every schema count
-- matches. The 2026-09-14 staging diagnosis measured exactly that: 57 documents
-- across the five collections, and 0 version rows.
--
-- The backfill runner creates those rows through Payload's own version
-- machinery. This asserts the OUTCOME, independently of the code that produced
-- it, against the live schema. Every count is "how many are WRONG", so the
-- contract expects 0.
--
-- `::text` on every enum column is deliberate and load-bearing: Payload gives
-- each collection its own PostgreSQL enum type, so a UNION of the raw
-- `_status` columns fails with "UNION could not convert type X to type Y".
--
-- Run with `psql -At -v ON_ERROR_STOP=1`.
WITH mains AS (
            SELECT 'colleges'             AS entity, id, _status::text AS status FROM colleges
  UNION ALL SELECT 'academic_departments',        id, _status::text FROM academic_departments
  UNION ALL SELECT 'academic_programs',           id, _status::text FROM academic_programs
  UNION ALL SELECT 'faculty_members',             id, _status::text FROM faculty_members
  UNION ALL SELECT 'study_plans',                 id, _status::text FROM study_plans
),
versions AS (
            SELECT 'colleges'             AS entity, id, parent_id, latest, autosave,
                   version__status::text AS status FROM _colleges_v
  UNION ALL SELECT 'academic_departments', id, parent_id, latest, autosave,
                   version__status::text FROM _academic_departments_v
  UNION ALL SELECT 'academic_programs',    id, parent_id, latest, autosave,
                   version__status::text FROM _academic_programs_v
  UNION ALL SELECT 'faculty_members',      id, parent_id, latest, autosave,
                   version__status::text FROM _faculty_members_v
  UNION ALL SELECT 'study_plans',          id, parent_id, latest, autosave,
                   version__status::text FROM _study_plans_v
),
latest_versions AS (
  SELECT * FROM versions WHERE latest IS TRUE
),
-- A global that has never been saved has no row to version, and inventing one
-- would be inventing content. So the condition is "has content but no history",
-- not "has no history".
global_versions AS (
            SELECT 'site_settings'    AS global_name,
                   (SELECT count(*) FROM site_settings)    AS main_rows,
                   (SELECT count(*) FROM _site_settings_v) AS version_rows
  UNION ALL SELECT 'about_page',
                   (SELECT count(*) FROM about_page),       (SELECT count(*) FROM _about_page_v)
  UNION ALL SELECT 'contact_settings',
                   (SELECT count(*) FROM contact_settings), (SELECT count(*) FROM _contact_settings_v)
  UNION ALL SELECT 'navbar_settings',
                   (SELECT count(*) FROM navbar_settings),  (SELECT count(*) FROM _navbar_settings_v)
  UNION ALL SELECT 'footer_settings',
                   (SELECT count(*) FROM footer_settings),  (SELECT count(*) FROM _footer_settings_v)
)

-- Every migrated document has EXACTLY one canonical latest version. One query
-- covers both "none" and "several": <> 1 is the whole condition.
SELECT 'documents_without_exactly_one_latest=' || (
  SELECT count(*) FROM mains m
  WHERE (SELECT count(*) FROM latest_versions v
         WHERE v.entity = m.entity AND v.parent_id = m.id) <> 1)

-- Stated separately because the two failures need different diagnoses: a
-- missing row is an incomplete backfill, a second row is a backfill that ran
-- twice without being idempotent.
UNION ALL SELECT 'documents_missing_latest=' || (
  SELECT count(*) FROM mains m
  WHERE NOT EXISTS (SELECT 1 FROM latest_versions v
                    WHERE v.entity = m.entity AND v.parent_id = m.id))
UNION ALL SELECT 'documents_with_duplicate_latest=' || (
  SELECT count(*) FROM (
    SELECT entity, parent_id FROM latest_versions
    GROUP BY entity, parent_id HAVING count(*) > 1) d)

-- A latest version whose parent is NULL or no longer exists. Payload counts
-- these in the Admin list view, so each one is a phantom row in the table.
UNION ALL SELECT 'orphan_latest_versions=' || (
  SELECT count(*) FROM latest_versions v
  WHERE v.parent_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM mains m WHERE m.entity = v.entity AND m.id = v.parent_id))

-- The canonical version must carry the document's OWN publication state. A
-- backfill that wrote every row as 'draft' would unpublish the whole site while
-- leaving all of the counts above at 0.
UNION ALL SELECT 'latest_version_status_mismatches=' || (
  SELECT count(*) FROM latest_versions v
  JOIN mains m ON m.entity = v.entity AND m.id = v.parent_id
  WHERE v.status IS DISTINCT FROM m.status)

-- The canonical initial version is a real saved version, not an autosave
-- draft: an autosave row is editor scratch state and Payload treats it
-- differently in the Versions view.
UNION ALL SELECT 'autosave_latest_versions=' || (
  SELECT count(*) FROM latest_versions WHERE autosave IS TRUE)

-- Totals, recorded rather than asserted against a constant, so the report says
-- what was actually covered.
UNION ALL SELECT 'documents_total=' || (SELECT count(*) FROM mains)
UNION ALL SELECT 'latest_versions_total=' || (SELECT count(*) FROM latest_versions)

-- Each of the five audited globals has at least one version to roll back to.
UNION ALL SELECT 'globals_without_version=' || (
  SELECT count(*) FROM global_versions WHERE main_rows > 0 AND version_rows < 1)
UNION ALL SELECT 'globals_with_content=' || (
  SELECT count(*) FROM global_versions WHERE main_rows > 0)
UNION ALL SELECT 'global_version_rows_total=' || (
  SELECT coalesce(sum(version_rows), 0) FROM global_versions);
