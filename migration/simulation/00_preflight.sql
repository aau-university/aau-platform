-- GENERATED FROM REAL SOURCE + GOLDEN SCHEMAS ON 2026-09-07.
-- READ-ONLY. Run against the restored SOURCE copy before 01_upgrade_working_copy.sql.
-- Expected values are based on the final source capture used for this simulation.

SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version;

SELECT
  (SELECT count(*) FROM payload_migrations) AS migration_ledger_rows,
  (SELECT count(*) FROM payload_jobs) AS payload_jobs_rows,
  (SELECT count(*) FROM payload_jobs_log) AS payload_jobs_log_rows,
  (SELECT count(*) FROM (SELECT academic_program_id FROM study_plans WHERE academic_program_id IS NOT NULL GROUP BY academic_program_id HAVING count(*) > 1) d) AS duplicate_study_plan_program_groups,
  (SELECT count(*) FROM colleges WHERE is_active IS NULL) AS colleges_null_is_active,
  (SELECT count(*) FROM academic_departments WHERE is_active IS NULL) AS departments_null_is_active,
  (SELECT count(*) FROM academic_programs WHERE is_active IS NULL) AS programs_null_is_active,
  (SELECT count(*) FROM faculty_members WHERE is_active IS NULL) AS faculty_null_is_active,
  (SELECT count(*) FROM study_plans WHERE is_active IS NULL) AS study_plans_null_is_active,
  (SELECT count(*) FROM offers WHERE (is_active IS TRUE AND _status <> 'published') OR (is_active IS FALSE AND _status <> 'draft')) AS offers_status_mismatches,
  (SELECT count(*) FROM _offers_v WHERE version_is_active IS NOT NULL AND ((version_is_active IS TRUE AND version__status <> 'published') OR (version_is_active IS FALSE AND version__status <> 'draft'))) AS offer_version_status_mismatches;

-- Expected source content counts.
SELECT 'media' AS entity, count(*) FROM media
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'roles', count(*) FROM roles
UNION ALL SELECT 'colleges', count(*) FROM colleges
UNION ALL SELECT 'academic_departments', count(*) FROM academic_departments
UNION ALL SELECT 'academic_programs', count(*) FROM academic_programs
UNION ALL SELECT 'faculty_members', count(*) FROM faculty_members
UNION ALL SELECT 'study_plans', count(*) FROM study_plans
ORDER BY 1;
