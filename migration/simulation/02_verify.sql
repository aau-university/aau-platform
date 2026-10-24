-- Verification for the migrated working copy.
-- Expected target facts from the Golden Reference created from final migrations.

SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public') AS columns,
  (SELECT count(DISTINCT t.typname) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public') AS enum_types,
  (SELECT count(*) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') AS constraints,
  (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
  (SELECT count(*) FROM pg_sequences WHERE schemaname='public') AS sequences;

-- Expected target: 346 tables, 2584 columns, 113 enum types,
-- 1981 constraints, 1285 indexes, 280 sequences.

SELECT name,batch FROM payload_migrations ORDER BY id;
-- Expected:
-- 20260809_020424_baseline | 1
-- 20260815_025241_one_study_plan_per_program | 1

SELECT
  count(*) FILTER (WHERE url !~ '^/api/media/file/') AS invalid_public_urls,
  count(*) FILTER (WHERE thumbnail_u_r_l IS NOT NULL AND thumbnail_u_r_l !~ '^/api/media/file/') AS invalid_public_thumbnails
FROM media;

SELECT academic_program_id,count(*)
FROM study_plans
WHERE academic_program_id IS NOT NULL
GROUP BY academic_program_id
HAVING count(*) > 1;

-- Publication mapping check.
SELECT 'academic_departments' entity,_status::text,count(*) FROM academic_departments GROUP BY _status
UNION ALL SELECT 'academic_programs',_status::text,count(*) FROM academic_programs GROUP BY _status
UNION ALL SELECT 'colleges',_status::text,count(*) FROM colleges GROUP BY _status
UNION ALL SELECT 'faculty_members',_status::text,count(*) FROM faculty_members GROUP BY _status
UNION ALL SELECT 'study_plans',_status::text,count(*) FROM study_plans GROUP BY _status
ORDER BY 1,2;
