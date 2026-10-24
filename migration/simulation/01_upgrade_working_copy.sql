-- AAU Neon -> final VPS schema upgrade
-- GENERATED from:
--   source: actual Neon production schema
--   target: clean PostgreSQL 18 schema created from final repo migrations at 474728e9
--
-- IMPORTANT:
--   * Run ONLY on a restored/isolated copy of the source database.
--   * Never run this directly on Neon production.
--   * Run 00_preflight.sql first.
--   * This deliberately preserves real document IDs/FKs/rows.
--   * Physical column order may differ from a fresh DB; logical schema is name-based and is verified separately.

\set ON_ERROR_STOP on

-- Hard safety assertions.
DO $$
BEGIN
  IF (SELECT count(*) FROM payload_migrations) <> 0 THEN
    RAISE EXCEPTION 'Expected empty payload_migrations ledger before adoption';
  END IF;
  IF EXISTS (SELECT 1 FROM payload_jobs) OR EXISTS (SELECT 1 FROM payload_jobs_log) THEN
    RAISE EXCEPTION 'payload_jobs / payload_jobs_log are not empty; refusing to drop them';
  END IF;
  IF EXISTS (
    SELECT 1 FROM study_plans WHERE academic_program_id IS NOT NULL
    GROUP BY academic_program_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate study plans per academic program; unique index would fail';
  END IF;
  IF EXISTS (SELECT 1 FROM colleges WHERE is_active IS NULL)
     OR EXISTS (SELECT 1 FROM academic_departments WHERE is_active IS NULL)
     OR EXISTS (SELECT 1 FROM academic_programs WHERE is_active IS NULL)
     OR EXISTS (SELECT 1 FROM faculty_members WHERE is_active IS NULL)
     OR EXISTS (SELECT 1 FROM study_plans WHERE is_active IS NULL) THEN
    RAISE EXCEPTION 'NULL legacy publication flag found';
  END IF;
  IF EXISTS (SELECT 1 FROM offers WHERE (is_active IS TRUE AND _status <> 'published') OR (is_active IS FALSE AND _status <> 'draft')) THEN
    RAISE EXCEPTION 'offers is_active/_status mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM _offers_v WHERE version_is_active IS NOT NULL AND ((version_is_active IS TRUE AND version__status <> 'published') OR (version_is_active IS FALSE AND version__status <> 'draft'))) THEN
    RAISE EXCEPTION '_offers_v legacy/status mismatch';
  END IF;
END $$;

-- Stage 1: enums, tables, columns, nullability, semantic data transforms.
BEGIN;
CREATE TYPE public."enum__academic_departments_v_published_locale" AS ENUM ('ar', 'en');
CREATE TYPE public."enum__academic_departments_v_version_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum__academic_programs_v_published_locale" AS ENUM ('ar', 'en');
CREATE TYPE public."enum__academic_programs_v_version_degree_type" AS ENUM ('diploma', 'bachelor', 'master', 'phd');
CREATE TYPE public."enum__academic_programs_v_version_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum__colleges_v_published_locale" AS ENUM ('ar', 'en');
CREATE TYPE public."enum__colleges_v_version_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum__faculty_members_v_published_locale" AS ENUM ('ar', 'en');
CREATE TYPE public."enum__faculty_members_v_version_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum__footer_settings_v_version_footer_background_type" AS ENUM ('none', 'image', 'video');
CREATE TYPE public."enum__footer_settings_v_version_footer_items_link_type" AS ENUM ('reference', 'custom');
CREATE TYPE public."enum__navbar_settings_v_version_call_to_action_appearance" AS ENUM ('default', 'secondary', 'ghost');
CREATE TYPE public."enum__navbar_settings_v_version_call_to_action_type" AS ENUM ('reference', 'custom');
CREATE TYPE public."enum__navbar_settings_v_version_top_bar_items_link_type" AS ENUM ('reference', 'custom');
CREATE TYPE public."enum__study_plans_v_published_locale" AS ENUM ('ar', 'en');
CREATE TYPE public."enum__study_plans_v_version_courses_semester" AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8');
CREATE TYPE public."enum__study_plans_v_version_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum_academic_departments_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum_academic_programs_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum_colleges_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum_faculty_members_status" AS ENUM ('draft', 'published');
CREATE TYPE public."enum_study_plans_status" AS ENUM ('draft', 'published');
CREATE TABLE public."_about_page_v" (
  "id" serial NOT NULL,
  "version_intro_image_id" integer,
  "version_president_image_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."_about_page_v_locales" (
  "version_header_badge" character varying,
  "version_header_title" character varying,
  "version_header_description" character varying,
  "version_intro_body" jsonb,
  "version_vision_title" character varying,
  "version_vision_description" jsonb,
  "version_mission_title" character varying,
  "version_mission_description" jsonb,
  "version_goals_title" character varying,
  "version_goals_description" jsonb,
  "version_values_title" character varying,
  "version_values_description" jsonb,
  "version_president_section_title" character varying,
  "version_president_message_intro" jsonb,
  "version_president_message_body" jsonb,
  "version_president_message_closing" jsonb,
  "version_president_name" character varying,
  "version_president_role" character varying,
  "version_team_section_section_title" character varying,
  "version_team_section_section_description" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_about_page_v_rels" (
  "id" serial NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "team_members_id" integer
);
CREATE TABLE public."_about_page_v_version_team_members" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "member_image_id" integer,
  "display_order" numeric DEFAULT 0,
  "_uuid" character varying
);
CREATE TABLE public."_about_page_v_version_team_members_locales" (
  "group_name" character varying,
  "full_name" character varying,
  "job_title" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_academic_departments_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version_slug" character varying,
  "version_college_id" integer,
  "version_head_of_department_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" enum__academic_departments_v_version_status DEFAULT 'draft'::enum__academic_departments_v_version_status,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" enum__academic_departments_v_published_locale,
  "latest" boolean,
  "autosave" boolean
);
CREATE TABLE public."_academic_departments_v_locales" (
  "version_name" character varying,
  "version_description" jsonb,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_academic_programs_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version_slug" character varying,
  "version_college_id" integer,
  "version_department_id" integer,
  "version_degree_type" enum__academic_programs_v_version_degree_type,
  "version_study_years" character varying,
  "version_admission_rate" numeric,
  "version_image_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" enum__academic_programs_v_version_status DEFAULT 'draft'::enum__academic_programs_v_version_status,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" enum__academic_programs_v_published_locale,
  "latest" boolean,
  "autosave" boolean
);
CREATE TABLE public."_academic_programs_v_locales" (
  "version_name" character varying,
  "version_description" jsonb,
  "version_objectives" jsonb,
  "version_career_prospects" jsonb,
  "version_application_steps" jsonb,
  "version_why_program" jsonb,
  "version_high_school_type" character varying,
  "version_duration" character varying,
  "version_meta_title" character varying,
  "version_meta_description" character varying,
  "version_meta_image_id" integer,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_colleges_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version_slug" character varying,
  "version_icon" character varying,
  "version_dean_image_id" integer,
  "version_image_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" enum__colleges_v_version_status DEFAULT 'draft'::enum__colleges_v_version_status,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" enum__colleges_v_published_locale,
  "latest" boolean,
  "autosave" boolean
);
CREATE TABLE public."_colleges_v_locales" (
  "version_name" character varying,
  "version_description" jsonb,
  "version_admission_requirements" jsonb,
  "version_vision" jsonb,
  "version_mission" jsonb,
  "version_goals" jsonb,
  "version_values" jsonb,
  "version_strategy" jsonb,
  "version_quality" jsonb,
  "version_dean_name" character varying,
  "version_meta_title" character varying,
  "version_meta_description" character varying,
  "version_meta_image_id" integer,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_contact_settings_v" (
  "id" serial NOT NULL,
  "version_contact_info_phone" character varying,
  "version_contact_info_email" character varying,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."_contact_settings_v_locales" (
  "version_page_badge" character varying,
  "version_page_title" character varying,
  "version_page_description" character varying,
  "version_form_labels_name_label" character varying,
  "version_form_labels_name_placeholder" character varying,
  "version_form_labels_email_label" character varying,
  "version_form_labels_email_placeholder" character varying,
  "version_form_labels_subject_label" character varying,
  "version_form_labels_subject_placeholder" character varying,
  "version_form_labels_message_label" character varying,
  "version_form_labels_message_placeholder" character varying,
  "version_form_labels_submit_text" character varying,
  "version_contact_info_address" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version_slug" character varying,
  "version_college_id" integer,
  "version_department_id" integer,
  "version_email" character varying,
  "version_phone" character varying,
  "version_photo_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" enum__faculty_members_v_version_status DEFAULT 'draft'::enum__faculty_members_v_version_status,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" enum__faculty_members_v_published_locale,
  "latest" boolean,
  "autosave" boolean
);
CREATE TABLE public."_faculty_members_v_locales" (
  "version_full_name" character varying,
  "version_academic_title" character varying,
  "version_biography" jsonb,
  "version_office_hours" character varying,
  "version_research_interests" character varying,
  "version_meta_title" character varying,
  "version_meta_description" character varying,
  "version_meta_image_id" integer,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v_rels" (
  "id" serial NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "academic_programs_id" integer
);
CREATE TABLE public."_faculty_members_v_version_courses" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "code" character varying,
  "semester" character varying,
  "_uuid" character varying
);
CREATE TABLE public."_faculty_members_v_version_courses_locales" (
  "name" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v_version_education" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "year" character varying,
  "_uuid" character varying
);
CREATE TABLE public."_faculty_members_v_version_education_locales" (
  "degree" character varying,
  "institution" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v_version_experience" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "_uuid" character varying
);
CREATE TABLE public."_faculty_members_v_version_experience_locales" (
  "position" character varying,
  "organization" character varying,
  "period" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v_version_publications" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "journal" character varying,
  "year" character varying,
  "link" character varying,
  "_uuid" character varying
);
CREATE TABLE public."_faculty_members_v_version_publications_locales" (
  "title" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_faculty_members_v_version_skills" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "_uuid" character varying
);
CREATE TABLE public."_faculty_members_v_version_skills_locales" (
  "name" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_footer_settings_v" (
  "id" serial NOT NULL,
  "version_footer_background_type" enum__footer_settings_v_version_footer_background_type DEFAULT 'none'::enum__footer_settings_v_version_footer_background_type,
  "version_footer_background_image_id" integer,
  "version_footer_background_video_id" integer,
  "version_footer_background_overlay_opacity" numeric DEFAULT 0.65,
  "version_hide_footer_signup" boolean DEFAULT false,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."_footer_settings_v_locales" (
  "version_address" character varying,
  "version_footer_powered" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_footer_settings_v_rels" (
  "id" serial NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "pages_id" integer
);
CREATE TABLE public."_footer_settings_v_version_footer_items" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "link_type" enum__footer_settings_v_version_footer_items_link_type DEFAULT 'reference'::enum__footer_settings_v_version_footer_items_link_type,
  "link_new_tab" boolean,
  "link_url" character varying,
  "group" character varying,
  "_uuid" character varying
);
CREATE TABLE public."_footer_settings_v_version_footer_items_locales" (
  "label" character varying NOT NULL,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_navbar_settings_v" (
  "id" serial NOT NULL,
  "version_hide_login" boolean DEFAULT false,
  "version_show_language_picker" boolean DEFAULT true,
  "version_call_to_action_type" enum__navbar_settings_v_version_call_to_action_type DEFAULT 'reference'::enum__navbar_settings_v_version_call_to_action_type,
  "version_call_to_action_new_tab" boolean,
  "version_call_to_action_url" character varying,
  "version_call_to_action_appearance" enum__navbar_settings_v_version_call_to_action_appearance DEFAULT 'default'::enum__navbar_settings_v_version_call_to_action_appearance,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."_navbar_settings_v_rels" (
  "id" serial NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "pages_id" integer
);
CREATE TABLE public."_navbar_settings_v_version_top_bar_items" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "link_type" enum__navbar_settings_v_version_top_bar_items_link_type DEFAULT 'reference'::enum__navbar_settings_v_version_top_bar_items_link_type,
  "link_new_tab" boolean,
  "link_url" character varying,
  "open_in_new_tab" boolean DEFAULT false,
  "_uuid" character varying
);
CREATE TABLE public."_navbar_settings_v_version_top_bar_items_locales" (
  "label" character varying NOT NULL,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_site_settings_v" (
  "id" serial NOT NULL,
  "version_logo_id" integer,
  "version_favicon_id" integer,
  "version_contact_email" character varying,
  "version_contact_phone" character varying,
  "version_map_location" character varying,
  "version_copyright" character varying,
  "version_footer_logo_id" integer,
  "version_google_analytics_id" character varying,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."_site_settings_v_locales" (
  "version_site_name" character varying,
  "version_tagline" character varying,
  "version_description" character varying,
  "version_address" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_site_settings_v_version_social_links" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "platform" character varying NOT NULL,
  "url" character varying NOT NULL,
  "_uuid" character varying
);
CREATE TABLE public."_study_plans_v" (
  "id" serial NOT NULL,
  "parent_id" integer,
  "version_slug" character varying,
  "version_academic_program_id" integer,
  "version_college_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" enum__study_plans_v_version_status DEFAULT 'draft'::enum__study_plans_v_version_status,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" enum__study_plans_v_published_locale,
  "latest" boolean,
  "autosave" boolean
);
CREATE TABLE public."_study_plans_v_locales" (
  "version_name" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE public."_study_plans_v_version_courses" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial NOT NULL,
  "code" character varying,
  "credits" numeric,
  "year" numeric,
  "semester" enum__study_plans_v_version_courses_semester,
  "_uuid" character varying
);
CREATE TABLE public."_study_plans_v_version_courses_locales" (
  "name" character varying,
  "id" serial NOT NULL,
  "_locale" _locales NOT NULL,
  "_parent_id" integer NOT NULL
);
ALTER TABLE public."_blog_posts_v_version_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."_news_v_version_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."_pages_v_version_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."academic_departments" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE public."academic_departments" ALTER COLUMN "college_id" DROP NOT NULL;
ALTER TABLE public."academic_departments" ADD COLUMN "_status" enum_academic_departments_status DEFAULT 'draft'::enum_academic_departments_status;
ALTER TABLE public."academic_departments_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."academic_programs" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE public."academic_programs" ALTER COLUMN "college_id" DROP NOT NULL;
ALTER TABLE public."academic_programs" ADD COLUMN "_status" enum_academic_programs_status DEFAULT 'draft'::enum_academic_programs_status;
ALTER TABLE public."academic_programs_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."blog_posts_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."colleges" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE public."colleges" ADD COLUMN "_status" enum_colleges_status DEFAULT 'draft'::enum_colleges_status;
ALTER TABLE public."colleges_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."faculty_members" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE public."faculty_members" ALTER COLUMN "college_id" DROP NOT NULL;
ALTER TABLE public."faculty_members" ADD COLUMN "_status" enum_faculty_members_status DEFAULT 'draft'::enum_faculty_members_status;
ALTER TABLE public."faculty_members_courses_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."faculty_members_education_locales" ALTER COLUMN "degree" DROP NOT NULL;
ALTER TABLE public."faculty_members_experience_locales" ALTER COLUMN "position" DROP NOT NULL;
ALTER TABLE public."faculty_members_locales" ALTER COLUMN "full_name" DROP NOT NULL;
ALTER TABLE public."faculty_members_publications_locales" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE public."faculty_members_skills_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."news_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."pages_populated_authors" ADD COLUMN "user_id" character varying;
ALTER TABLE public."redirects" ADD COLUMN "managed" boolean DEFAULT false;
ALTER TABLE public."redirects" ADD COLUMN "managed_target_collection" character varying;
ALTER TABLE public."redirects" ADD COLUMN "managed_target_document_id" character varying;
ALTER TABLE public."redirects" ADD COLUMN "managed_target_route_key" character varying;
ALTER TABLE public."redirects" ADD COLUMN "disabled" boolean DEFAULT false;
ALTER TABLE public."redirects_rels" ADD COLUMN "news_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "events_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "blog_posts_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "colleges_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "faculty_members_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "centers_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "offers_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "campus_life_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "projects_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "research_publications_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "academic_programs_id" integer;
ALTER TABLE public."redirects_rels" ADD COLUMN "study_plans_id" integer;
ALTER TABLE public."study_plans" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE public."study_plans" ALTER COLUMN "academic_program_id" DROP NOT NULL;
ALTER TABLE public."study_plans" ADD COLUMN "_status" enum_study_plans_status DEFAULT 'draft'::enum_study_plans_status;
ALTER TABLE public."study_plans_courses_locales" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE public."study_plans_locales" ALTER COLUMN "name" DROP NOT NULL;
UPDATE public."academic_departments" SET "_status" = CASE WHEN "is_active" IS TRUE THEN 'published'::"enum_academic_departments_status" ELSE 'draft'::"enum_academic_departments_status" END;
UPDATE public."academic_programs" SET "_status" = CASE WHEN "is_active" IS TRUE THEN 'published'::"enum_academic_programs_status" ELSE 'draft'::"enum_academic_programs_status" END;
UPDATE public."colleges" SET "_status" = CASE WHEN "is_active" IS TRUE THEN 'published'::"enum_colleges_status" ELSE 'draft'::"enum_colleges_status" END;
UPDATE public."faculty_members" SET "_status" = CASE WHEN "is_active" IS TRUE THEN 'published'::"enum_faculty_members_status" ELSE 'draft'::"enum_faculty_members_status" END;
UPDATE public."study_plans" SET "_status" = CASE WHEN "is_active" IS TRUE THEN 'published'::"enum_study_plans_status" ELSE 'draft'::"enum_study_plans_status" END;
ALTER TABLE public."academic_departments" DROP COLUMN "is_active";
ALTER TABLE public."academic_programs" DROP COLUMN "is_active";
ALTER TABLE public."colleges" DROP COLUMN "is_active";
ALTER TABLE public."faculty_members" DROP COLUMN "is_active";
ALTER TABLE public."study_plans" DROP COLUMN "is_active";
ALTER TABLE public."offers" DROP COLUMN "is_active";
ALTER TABLE public."_offers_v" DROP COLUMN "version_is_active";
DROP TABLE public.payload_jobs_log;
DROP TABLE public.payload_jobs;
DROP TYPE public."enum_payload_jobs_log_state";
DROP TYPE public."enum_payload_jobs_log_task_slug";
DROP TYPE public."enum_payload_jobs_task_slug";
COMMIT;

-- Stage 2: PK/FK/unique/check constraints that are missing from the source.
BEGIN;
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_id_not_null" NOT NULL id;
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_version_intro_image_id_media_id_fk" FOREIGN KEY (version_intro_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_about_page_v" ADD CONSTRAINT "_about_page_v_version_president_image_id_media_id_fk" FOREIGN KEY (version_president_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _about_page_v(id) ON DELETE CASCADE;
ALTER TABLE public."_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_id_not_null" NOT NULL id;
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_parent_fk" FOREIGN KEY (parent_id) REFERENCES _about_page_v(id) ON DELETE CASCADE;
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_parent_id_not_null" NOT NULL parent_id;
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_path_not_null" NOT NULL path;
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_pkey" PRIMARY KEY (id);
ALTER TABLE public."_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_team_members_fk" FOREIGN KEY (team_members_id) REFERENCES team_members(id) ON DELETE CASCADE;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members__order_not_null" NOT NULL _order;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_id_not_null" NOT NULL id;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_member_image_id_media_id_fk" FOREIGN KEY (member_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _about_page_v(id) ON DELETE CASCADE;
ALTER TABLE public."_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_pkey" PRIMARY KEY (id);
ALTER TABLE public."_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _about_page_v_version_team_members(id) ON DELETE CASCADE;
ALTER TABLE public."_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_id_not_null" NOT NULL id;
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_parent_id_academic_departments_id_fk" FOREIGN KEY (parent_id) REFERENCES academic_departments(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_version_college_id_colleges_id_fk" FOREIGN KEY (version_college_id) REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_version_head_of_department_id_faculty_m" FOREIGN KEY (version_head_of_department_id) REFERENCES faculty_members(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _academic_departments_v(id) ON DELETE CASCADE;
ALTER TABLE public."_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_id_not_null" NOT NULL id;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_parent_id_academic_programs_id_fk" FOREIGN KEY (parent_id) REFERENCES academic_programs(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_college_id_colleges_id_fk" FOREIGN KEY (version_college_id) REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_department_id_academic_departments" FOREIGN KEY (version_department_id) REFERENCES academic_departments(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_image_id_media_id_fk" FOREIGN KEY (version_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _academic_programs_v(id) ON DELETE CASCADE;
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY (version_meta_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_id_not_null" NOT NULL id;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_parent_id_colleges_id_fk" FOREIGN KEY (parent_id) REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_version_dean_image_id_media_id_fk" FOREIGN KEY (version_dean_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_colleges_v" ADD CONSTRAINT "_colleges_v_version_image_id_media_id_fk" FOREIGN KEY (version_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _colleges_v(id) ON DELETE CASCADE;
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY (version_meta_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_contact_settings_v" ADD CONSTRAINT "_contact_settings_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_contact_settings_v" ADD CONSTRAINT "_contact_settings_v_id_not_null" NOT NULL id;
ALTER TABLE public."_contact_settings_v" ADD CONSTRAINT "_contact_settings_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_contact_settings_v" ADD CONSTRAINT "_contact_settings_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _contact_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_parent_id_faculty_members_id_fk" FOREIGN KEY (parent_id) REFERENCES faculty_members(id) ON DELETE SET NULL;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_college_id_colleges_id_fk" FOREIGN KEY (version_college_id) REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_department_id_academic_departments_i" FOREIGN KEY (version_department_id) REFERENCES academic_departments(id) ON DELETE SET NULL;
ALTER TABLE public."_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_photo_id_media_id_fk" FOREIGN KEY (version_photo_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY (version_meta_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_academic_programs_fk" FOREIGN KEY (academic_programs_id) REFERENCES academic_programs(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_parent_fk" FOREIGN KEY (parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_parent_id_not_null" NOT NULL parent_id;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_path_not_null" NOT NULL path;
ALTER TABLE public."_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses__order_not_null" NOT NULL _order;
ALTER TABLE public."_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v_version_courses(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education__order_not_null" NOT NULL _order;
ALTER TABLE public."_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locale__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v_version_education(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience__order_not_null" NOT NULL _order;
ALTER TABLE public."_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_local__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v_version_experience(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications__order_not_null" NOT NULL _order;
ALTER TABLE public."_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_loc__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_locale__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v_version_publications(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills__order_not_null" NOT NULL _order;
ALTER TABLE public."_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills_pkey" PRIMARY KEY (id);
ALTER TABLE public."_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _faculty_members_v_version_skills(id) ON DELETE CASCADE;
ALTER TABLE public."_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_id_not_null" NOT NULL id;
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_version_footer_background_image_id_media_id_" FOREIGN KEY (version_footer_background_image_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_version_footer_background_video_id_media_id_" FOREIGN KEY (version_footer_background_video_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _footer_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_id_not_null" NOT NULL id;
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_pages_fk" FOREIGN KEY (pages_id) REFERENCES pages(id) ON DELETE CASCADE;
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_parent_fk" FOREIGN KEY (parent_id) REFERENCES _footer_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_parent_id_not_null" NOT NULL parent_id;
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_path_not_null" NOT NULL path;
ALTER TABLE public."_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_pkey" PRIMARY KEY (id);
ALTER TABLE public."_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items__order_not_null" NOT NULL _order;
ALTER TABLE public."_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items_id_not_null" NOT NULL id;
ALTER TABLE public."_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _footer_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_loc__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locale__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locales_label_not_null" NOT NULL label;
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _footer_settings_v_version_footer_items(id) ON DELETE CASCADE;
ALTER TABLE public."_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_navbar_settings_v" ADD CONSTRAINT "_navbar_settings_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_navbar_settings_v" ADD CONSTRAINT "_navbar_settings_v_id_not_null" NOT NULL id;
ALTER TABLE public."_navbar_settings_v" ADD CONSTRAINT "_navbar_settings_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_navbar_settings_v" ADD CONSTRAINT "_navbar_settings_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_id_not_null" NOT NULL id;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_pages_fk" FOREIGN KEY (pages_id) REFERENCES pages(id) ON DELETE CASCADE;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_parent_fk" FOREIGN KEY (parent_id) REFERENCES _navbar_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_parent_id_not_null" NOT NULL parent_id;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_path_not_null" NOT NULL path;
ALTER TABLE public."_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_pkey" PRIMARY KEY (id);
ALTER TABLE public."_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items__order_not_null" NOT NULL _order;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_id_not_null" NOT NULL id;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _navbar_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_lo__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_local__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_locales_label_not_null" NOT NULL label;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_locales_parent_i_fk" FOREIGN KEY (_parent_id) REFERENCES _navbar_settings_v_version_top_bar_items(id) ON DELETE CASCADE;
ALTER TABLE public."_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_id_not_null" NOT NULL id;
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_favicon_id_media_id_fk" FOREIGN KEY (version_favicon_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_footer_logo_id_media_id_fk" FOREIGN KEY (version_footer_logo_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY (version_logo_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _site_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links__order_not_null" NOT NULL _order;
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_id_not_null" NOT NULL id;
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _site_settings_v(id) ON DELETE CASCADE;
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_pkey" PRIMARY KEY (id);
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_platform_not_null" NOT NULL platform;
ALTER TABLE public."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_url_not_null" NOT NULL url;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_created_at_not_null" NOT NULL created_at;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_id_not_null" NOT NULL id;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_parent_id_study_plans_id_fk" FOREIGN KEY (parent_id) REFERENCES study_plans(id) ON DELETE SET NULL;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_pkey" PRIMARY KEY (id);
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_updated_at_not_null" NOT NULL updated_at;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_version_academic_program_id_academic_programs_id" FOREIGN KEY (version_academic_program_id) REFERENCES academic_programs(id) ON DELETE SET NULL;
ALTER TABLE public."_study_plans_v" ADD CONSTRAINT "_study_plans_v_version_college_id_colleges_id_fk" FOREIGN KEY (version_college_id) REFERENCES colleges(id) ON DELETE SET NULL;
ALTER TABLE public."_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _study_plans_v(id) ON DELETE CASCADE;
ALTER TABLE public."_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses__order_not_null" NOT NULL _order;
ALTER TABLE public."_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses_id_not_null" NOT NULL id;
ALTER TABLE public."_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _study_plans_v(id) ON DELETE CASCADE;
ALTER TABLE public."_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses_pkey" PRIMARY KEY (id);
ALTER TABLE public."_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales__locale_not_null" NOT NULL _locale;
ALTER TABLE public."_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales__parent_id_not_null" NOT NULL _parent_id;
ALTER TABLE public."_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales_id_not_null" NOT NULL id;
ALTER TABLE public."_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales_parent_id_fk" FOREIGN KEY (_parent_id) REFERENCES _study_plans_v_version_courses(id) ON DELETE CASCADE;
ALTER TABLE public."_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales_pkey" PRIMARY KEY (id);
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_academic_programs_fk" FOREIGN KEY (academic_programs_id) REFERENCES academic_programs(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_blog_posts_fk" FOREIGN KEY (blog_posts_id) REFERENCES blog_posts(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_campus_life_fk" FOREIGN KEY (campus_life_id) REFERENCES campus_life(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_centers_fk" FOREIGN KEY (centers_id) REFERENCES centers(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_colleges_fk" FOREIGN KEY (colleges_id) REFERENCES colleges(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_events_fk" FOREIGN KEY (events_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_faculty_members_fk" FOREIGN KEY (faculty_members_id) REFERENCES faculty_members(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_news_fk" FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_offers_fk" FOREIGN KEY (offers_id) REFERENCES offers(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_projects_fk" FOREIGN KEY (projects_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_research_publications_fk" FOREIGN KEY (research_publications_id) REFERENCES research_publications(id) ON DELETE CASCADE;
ALTER TABLE public."redirects_rels" ADD CONSTRAINT "redirects_rels_study_plans_fk" FOREIGN KEY (study_plans_id) REFERENCES study_plans(id) ON DELETE CASCADE;
COMMIT;

-- Stage 3: make standalone indexes match the final schema.
BEGIN;
DROP INDEX IF EXISTS public."version_college_idx";
DROP INDEX IF EXISTS public."about_page_intro_intro_image_idx";
DROP INDEX IF EXISTS public."about_page_president_president_image_idx";
DROP INDEX IF EXISTS public."about_page_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."about_page_rels_order_idx";
DROP INDEX IF EXISTS public."about_page_rels_parent_idx";
DROP INDEX IF EXISTS public."about_page_rels_path_idx";
DROP INDEX IF EXISTS public."about_page_rels_team_members_id_idx";
DROP INDEX IF EXISTS public."about_page_team_members_member_image_idx";
DROP INDEX IF EXISTS public."about_page_team_members_order_idx";
DROP INDEX IF EXISTS public."about_page_team_members_parent_id_idx";
DROP INDEX IF EXISTS public."about_page_team_members_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."contact_settings_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."footer_settings_footer_background_image_idx";
DROP INDEX IF EXISTS public."footer_settings_footer_background_video_idx";
DROP INDEX IF EXISTS public."footer_settings_footer_items_order_idx";
DROP INDEX IF EXISTS public."footer_settings_footer_items_parent_id_idx";
DROP INDEX IF EXISTS public."footer_settings_footer_items_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."footer_settings_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."footer_settings_rels_order_idx";
DROP INDEX IF EXISTS public."footer_settings_rels_pages_id_idx";
DROP INDEX IF EXISTS public."footer_settings_rels_parent_idx";
DROP INDEX IF EXISTS public."footer_settings_rels_path_idx";
DROP INDEX IF EXISTS public."navbar_settings_rels_order_idx";
DROP INDEX IF EXISTS public."navbar_settings_rels_pages_id_idx";
DROP INDEX IF EXISTS public."navbar_settings_rels_parent_idx";
DROP INDEX IF EXISTS public."navbar_settings_rels_path_idx";
DROP INDEX IF EXISTS public."navbar_settings_top_bar_items_order_idx";
DROP INDEX IF EXISTS public."navbar_settings_top_bar_items_parent_id_idx";
DROP INDEX IF EXISTS public."navbar_settings_top_bar_items_locales_locale_parent_id_uniqu";
DROP INDEX IF EXISTS public."payload_jobs_completed_at_idx";
DROP INDEX IF EXISTS public."payload_jobs_created_at_idx";
DROP INDEX IF EXISTS public."payload_jobs_has_error_idx";
DROP INDEX IF EXISTS public."payload_jobs_processing_idx";
DROP INDEX IF EXISTS public."payload_jobs_queue_idx";
DROP INDEX IF EXISTS public."payload_jobs_task_slug_idx";
DROP INDEX IF EXISTS public."payload_jobs_total_tried_idx";
DROP INDEX IF EXISTS public."payload_jobs_updated_at_idx";
DROP INDEX IF EXISTS public."payload_jobs_wait_until_idx";
DROP INDEX IF EXISTS public."payload_jobs_log_order_idx";
DROP INDEX IF EXISTS public."payload_jobs_log_parent_id_idx";
DROP INDEX IF EXISTS public."payload_kv_key_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_created_at_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_global_slug_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_updated_at_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_academic_departments_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_academic_programs_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_admission_requirements_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_announcements_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_blog_posts_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_campus_life_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_categories_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_centers_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_colleges_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_contact_messages_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_email_requests_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_events_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_faculty_members_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_faqs_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_form_submissions_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_forms_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_join_requests_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_media_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_navigation_menus_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_news_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_offers_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_order_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_pages_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_parent_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_partners_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_path_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_private_media_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_projects_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_redirects_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_research_publications_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_roles_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_sliders_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_student_affairs_documents__idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_study_plans_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_team_members_id_idx";
DROP INDEX IF EXISTS public."payload_locked_documents_rels_users_id_idx";
DROP INDEX IF EXISTS public."payload_migrations_created_at_idx";
DROP INDEX IF EXISTS public."payload_migrations_updated_at_idx";
DROP INDEX IF EXISTS public."payload_preferences_created_at_idx";
DROP INDEX IF EXISTS public."payload_preferences_key_idx";
DROP INDEX IF EXISTS public."payload_preferences_updated_at_idx";
DROP INDEX IF EXISTS public."payload_preferences_rels_order_idx";
DROP INDEX IF EXISTS public."payload_preferences_rels_parent_idx";
DROP INDEX IF EXISTS public."payload_preferences_rels_path_idx";
DROP INDEX IF EXISTS public."payload_preferences_rels_users_id_idx";
DROP INDEX IF EXISTS public."site_settings_favicon_idx";
DROP INDEX IF EXISTS public."site_settings_footer_logo_idx";
DROP INDEX IF EXISTS public."site_settings_logo_idx";
DROP INDEX IF EXISTS public."site_settings_locales_locale_parent_id_unique";
DROP INDEX IF EXISTS public."site_settings_social_links_order_idx";
DROP INDEX IF EXISTS public."site_settings_social_links_parent_id_idx";
DROP INDEX IF EXISTS public."academicProgram_idx";
DROP INDEX IF EXISTS public."study_plans_academic_program_idx";
CREATE UNIQUE INDEX IF NOT EXISTS _about_page_v_pkey ON public._about_page_v USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _about_page_v_locales_pkey ON public._about_page_v_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _about_page_v_rels_pkey ON public._about_page_v_rels USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _about_page_v_version_team_members_pkey ON public._about_page_v_version_team_members USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _about_page_v_version_team_members_locales_pkey ON public._about_page_v_version_team_members_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _academic_departments_v_autosave_idx ON public._academic_departments_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _academic_departments_v_created_at_idx ON public._academic_departments_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _academic_departments_v_latest_idx ON public._academic_departments_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _academic_departments_v_parent_idx ON public._academic_departments_v USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_departments_v_pkey ON public._academic_departments_v USING btree (id);
CREATE INDEX IF NOT EXISTS _academic_departments_v_published_locale_idx ON public._academic_departments_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _academic_departments_v_snapshot_idx ON public._academic_departments_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _academic_departments_v_updated_at_idx ON public._academic_departments_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version__status_idx ON public._academic_departments_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version_college_idx ON public._academic_departments_v USING btree (version_college_id);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version_created_at_idx ON public._academic_departments_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version_head_of_departme_idx ON public._academic_departments_v USING btree (version_head_of_department_id);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version_slug_idx ON public._academic_departments_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _academic_departments_v_version_version_updated_at_idx ON public._academic_departments_v USING btree (version_updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_departments_v_locales_locale_parent_id_unique ON public._academic_departments_v_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_departments_v_locales_pkey ON public._academic_departments_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_autosave_idx ON public._academic_programs_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _academic_programs_v_created_at_idx ON public._academic_programs_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _academic_programs_v_latest_idx ON public._academic_programs_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _academic_programs_v_parent_idx ON public._academic_programs_v USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_programs_v_pkey ON public._academic_programs_v USING btree (id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_published_locale_idx ON public._academic_programs_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _academic_programs_v_snapshot_idx ON public._academic_programs_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _academic_programs_v_updated_at_idx ON public._academic_programs_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version__status_idx ON public._academic_programs_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_college_idx ON public._academic_programs_v USING btree (version_college_id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_created_at_idx ON public._academic_programs_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_department_idx ON public._academic_programs_v USING btree (version_department_id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_image_idx ON public._academic_programs_v USING btree (version_image_id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_slug_idx ON public._academic_programs_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_version_updated_at_idx ON public._academic_programs_v USING btree (version_updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_programs_v_locales_locale_parent_id_unique ON public._academic_programs_v_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _academic_programs_v_locales_pkey ON public._academic_programs_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _academic_programs_v_version_meta_version_meta_image_idx ON public._academic_programs_v_locales USING btree (version_meta_image_id, _locale);
CREATE INDEX IF NOT EXISTS version_college_1_idx ON public._announcements_v USING btree (version_college_id);
CREATE INDEX IF NOT EXISTS _colleges_v_autosave_idx ON public._colleges_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _colleges_v_created_at_idx ON public._colleges_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _colleges_v_latest_idx ON public._colleges_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _colleges_v_parent_idx ON public._colleges_v USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _colleges_v_pkey ON public._colleges_v USING btree (id);
CREATE INDEX IF NOT EXISTS _colleges_v_published_locale_idx ON public._colleges_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _colleges_v_snapshot_idx ON public._colleges_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _colleges_v_updated_at_idx ON public._colleges_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version__status_idx ON public._colleges_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version_created_at_idx ON public._colleges_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version_dean_image_idx ON public._colleges_v USING btree (version_dean_image_id);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version_image_idx ON public._colleges_v USING btree (version_image_id);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version_slug_idx ON public._colleges_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _colleges_v_version_version_updated_at_idx ON public._colleges_v USING btree (version_updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS _colleges_v_locales_locale_parent_id_unique ON public._colleges_v_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _colleges_v_locales_pkey ON public._colleges_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _colleges_v_version_meta_version_meta_image_idx ON public._colleges_v_locales USING btree (version_meta_image_id, _locale);
CREATE UNIQUE INDEX IF NOT EXISTS _contact_settings_v_pkey ON public._contact_settings_v USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _contact_settings_v_locales_pkey ON public._contact_settings_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_autosave_idx ON public._faculty_members_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _faculty_members_v_created_at_idx ON public._faculty_members_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _faculty_members_v_latest_idx ON public._faculty_members_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _faculty_members_v_parent_idx ON public._faculty_members_v USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_pkey ON public._faculty_members_v USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_published_locale_idx ON public._faculty_members_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _faculty_members_v_snapshot_idx ON public._faculty_members_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _faculty_members_v_updated_at_idx ON public._faculty_members_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version__status_idx ON public._faculty_members_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_college_idx ON public._faculty_members_v USING btree (version_college_id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_created_at_idx ON public._faculty_members_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_department_idx ON public._faculty_members_v USING btree (version_department_id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_photo_idx ON public._faculty_members_v USING btree (version_photo_id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_slug_idx ON public._faculty_members_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_version_updated_at_idx ON public._faculty_members_v USING btree (version_updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_locales_locale_parent_id_unique ON public._faculty_members_v_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_locales_pkey ON public._faculty_members_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_meta_version_meta_image_idx ON public._faculty_members_v_locales USING btree (version_meta_image_id, _locale);
CREATE INDEX IF NOT EXISTS _faculty_members_v_rels_academic_programs_id_idx ON public._faculty_members_v_rels USING btree (academic_programs_id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_rels_order_idx ON public._faculty_members_v_rels USING btree ("order");
CREATE INDEX IF NOT EXISTS _faculty_members_v_rels_parent_idx ON public._faculty_members_v_rels USING btree (parent_id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_rels_path_idx ON public._faculty_members_v_rels USING btree (path);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_rels_pkey ON public._faculty_members_v_rels USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_courses_order_idx ON public._faculty_members_v_version_courses USING btree (_order);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_courses_parent_id_idx ON public._faculty_members_v_version_courses USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_courses_pkey ON public._faculty_members_v_version_courses USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_courses_locales_locale_parent_id_ ON public._faculty_members_v_version_courses_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_courses_locales_pkey ON public._faculty_members_v_version_courses_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_education_order_idx ON public._faculty_members_v_version_education USING btree (_order);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_education_parent_id_idx ON public._faculty_members_v_version_education USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_education_pkey ON public._faculty_members_v_version_education USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_education_locales_locale_parent_i ON public._faculty_members_v_version_education_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_education_locales_pkey ON public._faculty_members_v_version_education_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_experience_order_idx ON public._faculty_members_v_version_experience USING btree (_order);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_experience_parent_id_idx ON public._faculty_members_v_version_experience USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_experience_pkey ON public._faculty_members_v_version_experience USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_experience_locales_locale_parent_ ON public._faculty_members_v_version_experience_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_experience_locales_pkey ON public._faculty_members_v_version_experience_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_publications_order_idx ON public._faculty_members_v_version_publications USING btree (_order);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_publications_parent_id_idx ON public._faculty_members_v_version_publications USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_publications_pkey ON public._faculty_members_v_version_publications USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_publications_locales_locale_paren ON public._faculty_members_v_version_publications_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_publications_locales_pkey ON public._faculty_members_v_version_publications_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_skills_order_idx ON public._faculty_members_v_version_skills USING btree (_order);
CREATE INDEX IF NOT EXISTS _faculty_members_v_version_skills_parent_id_idx ON public._faculty_members_v_version_skills USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_skills_pkey ON public._faculty_members_v_version_skills USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_skills_locales_locale_parent_id_u ON public._faculty_members_v_version_skills_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _faculty_members_v_version_skills_locales_pkey ON public._faculty_members_v_version_skills_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _footer_settings_v_pkey ON public._footer_settings_v USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _footer_settings_v_locales_pkey ON public._footer_settings_v_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _footer_settings_v_rels_pkey ON public._footer_settings_v_rels USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _footer_settings_v_version_footer_items_pkey ON public._footer_settings_v_version_footer_items USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _footer_settings_v_version_footer_items_locales_pkey ON public._footer_settings_v_version_footer_items_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _navbar_settings_v_pkey ON public._navbar_settings_v USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _navbar_settings_v_rels_pkey ON public._navbar_settings_v_rels USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _navbar_settings_v_version_top_bar_items_pkey ON public._navbar_settings_v_version_top_bar_items USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _navbar_settings_v_version_top_bar_items_locales_pkey ON public._navbar_settings_v_version_top_bar_items_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _site_settings_v_pkey ON public._site_settings_v USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _site_settings_v_locales_pkey ON public._site_settings_v_locales USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _site_settings_v_version_social_links_pkey ON public._site_settings_v_version_social_links USING btree (id);
CREATE INDEX IF NOT EXISTS _study_plans_v_autosave_idx ON public._study_plans_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _study_plans_v_created_at_idx ON public._study_plans_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _study_plans_v_latest_idx ON public._study_plans_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _study_plans_v_parent_idx ON public._study_plans_v USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_pkey ON public._study_plans_v USING btree (id);
CREATE INDEX IF NOT EXISTS _study_plans_v_published_locale_idx ON public._study_plans_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _study_plans_v_snapshot_idx ON public._study_plans_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _study_plans_v_updated_at_idx ON public._study_plans_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version__status_idx ON public._study_plans_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version_academic_program_idx ON public._study_plans_v USING btree (version_academic_program_id);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version_college_idx ON public._study_plans_v USING btree (version_college_id);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version_created_at_idx ON public._study_plans_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version_slug_idx ON public._study_plans_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_version_updated_at_idx ON public._study_plans_v USING btree (version_updated_at);
CREATE INDEX IF NOT EXISTS version_college_idx ON public._study_plans_v USING btree (version_college_id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_locales_locale_parent_id_unique ON public._study_plans_v_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_locales_pkey ON public._study_plans_v_locales USING btree (id);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_courses_order_idx ON public._study_plans_v_version_courses USING btree (_order);
CREATE INDEX IF NOT EXISTS _study_plans_v_version_courses_parent_id_idx ON public._study_plans_v_version_courses USING btree (_parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_version_courses_pkey ON public._study_plans_v_version_courses USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_version_courses_locales_locale_parent_id_uniq ON public._study_plans_v_version_courses_locales USING btree (_locale, _parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS _study_plans_v_version_courses_locales_pkey ON public._study_plans_v_version_courses_locales USING btree (id);
CREATE INDEX IF NOT EXISTS academic_departments__status_idx ON public.academic_departments USING btree (_status);
CREATE INDEX IF NOT EXISTS academic_programs__status_idx ON public.academic_programs USING btree (_status);
CREATE INDEX IF NOT EXISTS colleges__status_idx ON public.colleges USING btree (_status);
CREATE INDEX IF NOT EXISTS faculty_members__status_idx ON public.faculty_members USING btree (_status);
CREATE INDEX IF NOT EXISTS redirects_rels_blog_posts_id_idx ON public.redirects_rels USING btree (blog_posts_id);
CREATE INDEX IF NOT EXISTS redirects_rels_campus_life_id_idx ON public.redirects_rels USING btree (campus_life_id);
CREATE INDEX IF NOT EXISTS redirects_rels_centers_id_idx ON public.redirects_rels USING btree (centers_id);
CREATE INDEX IF NOT EXISTS redirects_rels_colleges_id_idx ON public.redirects_rels USING btree (colleges_id);
CREATE INDEX IF NOT EXISTS redirects_rels_events_id_idx ON public.redirects_rels USING btree (events_id);
CREATE INDEX IF NOT EXISTS redirects_rels_faculty_members_id_idx ON public.redirects_rels USING btree (faculty_members_id);
CREATE INDEX IF NOT EXISTS redirects_rels_news_id_idx ON public.redirects_rels USING btree (news_id);
CREATE INDEX IF NOT EXISTS redirects_rels_offers_id_idx ON public.redirects_rels USING btree (offers_id);
CREATE INDEX IF NOT EXISTS redirects_rels_projects_id_idx ON public.redirects_rels USING btree (projects_id);
CREATE INDEX IF NOT EXISTS redirects_rels_research_publications_id_idx ON public.redirects_rels USING btree (research_publications_id);
CREATE INDEX IF NOT EXISTS study_plans__status_idx ON public.study_plans USING btree (_status);
CREATE UNIQUE INDEX IF NOT EXISTS study_plans_academic_program_idx ON public.study_plans USING btree (academic_program_id);
COMMIT;

-- Stage 4: normalize PUBLIC Media metadata for local VPS uploads and adopt the
-- exact migration ledger only AFTER structural/data stages have succeeded.
-- Private Media binaries and metadata are intentionally out of migration scope.
BEGIN;
UPDATE public.media SET
  url = regexp_replace(url, '^https://[^/]+/media/', '/api/media/file/'),
  thumbnail_u_r_l = CASE WHEN thumbnail_u_r_l IS NULL THEN NULL ELSE regexp_replace(thumbnail_u_r_l, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_thumbnail_url = CASE WHEN sizes_thumbnail_url IS NULL THEN NULL ELSE regexp_replace(sizes_thumbnail_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_square_url = CASE WHEN sizes_square_url IS NULL THEN NULL ELSE regexp_replace(sizes_square_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_small_url = CASE WHEN sizes_small_url IS NULL THEN NULL ELSE regexp_replace(sizes_small_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_medium_url = CASE WHEN sizes_medium_url IS NULL THEN NULL ELSE regexp_replace(sizes_medium_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_large_url = CASE WHEN sizes_large_url IS NULL THEN NULL ELSE regexp_replace(sizes_large_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_xlarge_url = CASE WHEN sizes_xlarge_url IS NULL THEN NULL ELSE regexp_replace(sizes_xlarge_url, '^https://[^/]+/media/', '/api/media/file/') END,
  sizes_og_url = CASE WHEN sizes_og_url IS NULL THEN NULL ELSE regexp_replace(sizes_og_url, '^https://[^/]+/media/', '/api/media/file/') END;

INSERT INTO public.payload_migrations (name,batch) VALUES
  ('20260809_020424_baseline',1),
  ('20260815_025241_one_study_plan_per_program',1);
COMMIT;
