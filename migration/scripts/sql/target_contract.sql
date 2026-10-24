-- Machine-readable POST-migration probe, emitted as `key=value` lines.
--
-- 02_verify.sql (proven, unmodified) is the human-readable verification; this
-- asserts the same facts mechanically. Run with `psql -At -v ON_ERROR_STOP=1`.
SELECT 'tables=' || (SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE')
UNION ALL SELECT 'columns=' || (SELECT count(*) FROM information_schema.columns WHERE table_schema='public')
UNION ALL SELECT 'enum_types=' || (SELECT count(DISTINCT t.typname) FROM pg_type t
  JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
  WHERE n.nspname='public')
UNION ALL SELECT 'constraints=' || (SELECT count(*) FROM pg_constraint co
  JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public')
UNION ALL SELECT 'indexes=' || (SELECT count(*) FROM pg_indexes WHERE schemaname='public')
UNION ALL SELECT 'sequences=' || (SELECT count(*) FROM pg_sequences WHERE schemaname='public')
UNION ALL SELECT 'migration_ledger=' || (
  SELECT coalesce(string_agg(name || ':' || batch, ',' ORDER BY id), '')
  FROM payload_migrations)
UNION ALL SELECT 'invalid_public_urls=' || (
  SELECT count(*) FROM media WHERE url IS NULL OR url !~ '^/api/media/file/')
UNION ALL SELECT 'invalid_public_thumbnails=' || (
  SELECT count(*) FROM media
  WHERE thumbnail_u_r_l IS NOT NULL AND thumbnail_u_r_l !~ '^/api/media/file/')
-- No public media field may still carry an absolute R2 URL. `url` alone is not
-- enough: the size variants are separate columns and stage 4 rewrites each one.
UNION ALL SELECT 'residual_r2_urls=' || (
  SELECT count(*) FROM media
  WHERE coalesce(url,'') LIKE 'http%'
     OR coalesce(thumbnail_u_r_l,'') LIKE 'http%'
     OR coalesce(sizes_thumbnail_url,'') LIKE 'http%'
     OR coalesce(sizes_square_url,'') LIKE 'http%'
     OR coalesce(sizes_small_url,'') LIKE 'http%'
     OR coalesce(sizes_medium_url,'') LIKE 'http%'
     OR coalesce(sizes_large_url,'') LIKE 'http%'
     OR coalesce(sizes_xlarge_url,'') LIKE 'http%'
     OR coalesce(sizes_og_url,'') LIKE 'http%')
UNION ALL SELECT 'duplicate_study_plan_groups=' || (
  SELECT count(*) FROM (
    SELECT academic_program_id FROM study_plans
    WHERE academic_program_id IS NOT NULL
    GROUP BY academic_program_id HAVING count(*) > 1) d)
UNION ALL SELECT 'media_rows=' || (SELECT count(*) FROM media)
UNION ALL SELECT 'private_media_rows=' || (SELECT count(*) FROM private_media)
UNION ALL SELECT 'users_rows=' || (SELECT count(*) FROM users)
UNION ALL SELECT 'roles_rows=' || (SELECT count(*) FROM roles)
UNION ALL SELECT 'colleges_rows=' || (SELECT count(*) FROM colleges)
UNION ALL SELECT 'academic_departments_rows=' || (SELECT count(*) FROM academic_departments)
UNION ALL SELECT 'academic_programs_rows=' || (SELECT count(*) FROM academic_programs)
UNION ALL SELECT 'faculty_members_rows=' || (SELECT count(*) FROM faculty_members)
UNION ALL SELECT 'study_plans_rows=' || (SELECT count(*) FROM study_plans);
