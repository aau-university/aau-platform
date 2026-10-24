-- Machine-readable source contract probe. READ-ONLY.
--
-- 00_preflight.sql (proven, unmodified) is the human-readable report; this is
-- the same source facts emitted as `key=value` lines so a script can fail
-- closed on them. Run with `psql -At -v ON_ERROR_STOP=1 -v r2_host=<host>`.
--
-- Every value is a count, so a probe that cannot run produces NO line at all
-- rather than a zero — and contract_expect treats a missing line as a failure.
SELECT 'payload_migrations_rows=' || (SELECT count(*) FROM payload_migrations)
UNION ALL SELECT 'payload_jobs_rows=' || (SELECT count(*) FROM payload_jobs)
UNION ALL SELECT 'payload_jobs_log_rows=' || (SELECT count(*) FROM payload_jobs_log)
UNION ALL SELECT 'duplicate_study_plan_groups=' || (
  SELECT count(*) FROM (
    SELECT academic_program_id FROM study_plans
    WHERE academic_program_id IS NOT NULL
    GROUP BY academic_program_id HAVING count(*) > 1
  ) d)
UNION ALL SELECT 'null_publication_flags=' || (
    (SELECT count(*) FROM colleges WHERE is_active IS NULL)
  + (SELECT count(*) FROM academic_departments WHERE is_active IS NULL)
  + (SELECT count(*) FROM academic_programs WHERE is_active IS NULL)
  + (SELECT count(*) FROM faculty_members WHERE is_active IS NULL)
  + (SELECT count(*) FROM study_plans WHERE is_active IS NULL))
UNION ALL SELECT 'offer_status_mismatches=' || (
  SELECT count(*) FROM offers
  WHERE (is_active IS TRUE AND _status <> 'published')
     OR (is_active IS FALSE AND _status <> 'draft'))
UNION ALL SELECT 'offer_version_status_mismatches=' || (
  SELECT count(*) FROM _offers_v
  WHERE version_is_active IS NOT NULL
    AND ((version_is_active IS TRUE AND version__status <> 'published')
      OR (version_is_active IS FALSE AND version__status <> 'draft')))
UNION ALL SELECT 'media_rows=' || (SELECT count(*) FROM media)
-- Public media must ALL live on the one frozen R2 origin. A row pointing
-- anywhere else would survive stage 4's rewrite as an external URL and the
-- migration would look successful while that image 404s off-site.
UNION ALL SELECT 'media_foreign_url_rows=' || (
  SELECT count(*) FROM media
  WHERE url IS NULL OR url NOT LIKE 'https://' || :'r2_host' || '/media/%')
-- Recorded, not asserted: compared before/after the upgrade instead.
UNION ALL SELECT 'private_media_rows=' || (SELECT count(*) FROM private_media)
UNION ALL SELECT 'users_rows=' || (SELECT count(*) FROM users)
UNION ALL SELECT 'roles_rows=' || (SELECT count(*) FROM roles)
UNION ALL SELECT 'colleges_rows=' || (SELECT count(*) FROM colleges)
UNION ALL SELECT 'academic_departments_rows=' || (SELECT count(*) FROM academic_departments)
UNION ALL SELECT 'academic_programs_rows=' || (SELECT count(*) FROM academic_programs)
UNION ALL SELECT 'faculty_members_rows=' || (SELECT count(*) FROM faculty_members)
UNION ALL SELECT 'study_plans_rows=' || (SELECT count(*) FROM study_plans);
