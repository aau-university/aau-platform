import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_users_system_role" AS ENUM('super_admin', 'admin', 'content_manager', 'coordinator', 'student', 'doctor');
  CREATE TYPE "public"."enum_pages_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_hero_links_link_appearance" AS ENUM('default', 'secondary', 'ghost', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_stats_items_key" AS ENUM('students', 'faculty', 'programs', 'colleges');
  CREATE TYPE "public"."enum_pages_blocks_stats_items_icon" AS ENUM('students', 'faculty', 'programs', 'colleges');
  CREATE TYPE "public"."enum_pages_blocks_colleges_grid_variant" AS ENUM('featured', 'compact');
  CREATE TYPE "public"."enum_pages_blocks_news_grid_variant" AS ENUM('latest', 'featured');
  CREATE TYPE "public"."enum_pages_blocks_events_grid_variant" AS ENUM('upcoming', 'featured');
  CREATE TYPE "public"."enum_pages_blocks_blog_grid_variant" AS ENUM('latest', 'editorial');
  CREATE TYPE "public"."enum_pages_blocks_campus_life_grid_kind_filter" AS ENUM('life', 'activity');
  CREATE TYPE "public"."enum_pages_blocks_projects_grid_status_filter" AS ENUM('current', 'completed', 'planned');
  CREATE TYPE "public"."enum_pages_blocks_programs_grid_degree_filter" AS ENUM('diploma', 'bachelor', 'master', 'phd');
  CREATE TYPE "public"."enum_pages_blocks_links_links_icon" AS ENUM('Link2', 'GraduationCap', 'Mail', 'Calendar', 'FileText', 'BookOpen', 'ClipboardList', 'User', 'Globe');
  CREATE TYPE "public"."enum_pages_hero_type" AS ENUM('highImpact', 'mediumImpact', 'lowImpact', 'postHero');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_appearance" AS ENUM('default', 'secondary', 'ghost', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_stats_items_key" AS ENUM('students', 'faculty', 'programs', 'colleges');
  CREATE TYPE "public"."enum__pages_v_blocks_stats_items_icon" AS ENUM('students', 'faculty', 'programs', 'colleges');
  CREATE TYPE "public"."enum__pages_v_blocks_colleges_grid_variant" AS ENUM('featured', 'compact');
  CREATE TYPE "public"."enum__pages_v_blocks_news_grid_variant" AS ENUM('latest', 'featured');
  CREATE TYPE "public"."enum__pages_v_blocks_events_grid_variant" AS ENUM('upcoming', 'featured');
  CREATE TYPE "public"."enum__pages_v_blocks_blog_grid_variant" AS ENUM('latest', 'editorial');
  CREATE TYPE "public"."enum__pages_v_blocks_campus_life_grid_kind_filter" AS ENUM('life', 'activity');
  CREATE TYPE "public"."enum__pages_v_blocks_projects_grid_status_filter" AS ENUM('current', 'completed', 'planned');
  CREATE TYPE "public"."enum__pages_v_blocks_programs_grid_degree_filter" AS ENUM('diploma', 'bachelor', 'master', 'phd');
  CREATE TYPE "public"."enum__pages_v_blocks_links_links_icon" AS ENUM('Link2', 'GraduationCap', 'Mail', 'Calendar', 'FileText', 'BookOpen', 'ClipboardList', 'User', 'Globe');
  CREATE TYPE "public"."enum__pages_v_version_hero_type" AS ENUM('highImpact', 'mediumImpact', 'lowImpact', 'postHero');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_colleges_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__colleges_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__colleges_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_academic_departments_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__academic_departments_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__academic_departments_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_academic_programs_degree_type" AS ENUM('diploma', 'bachelor', 'master', 'phd');
  CREATE TYPE "public"."enum_academic_programs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__academic_programs_v_version_degree_type" AS ENUM('diploma', 'bachelor', 'master', 'phd');
  CREATE TYPE "public"."enum__academic_programs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__academic_programs_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_faculty_members_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faculty_members_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faculty_members_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'read', 'replied', 'archived');
  CREATE TYPE "public"."enum_join_requests_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_join_requests_status" AS ENUM('pending', 'reviewing', 'accepted', 'rejected');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_faqs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faqs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faqs_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_email_requests_request_type" AS ENUM('academic_certificate', 'transcript', 'enrollment_verification', 'grade_objection', 'other');
  CREATE TYPE "public"."enum_email_requests_status" AS ENUM('new', 'in_review', 'resolved', 'spam');
  CREATE TYPE "public"."enum_categories_kind" AS ENUM('blog', 'faq', 'offer', 'news', 'event', 'project');
  CREATE TYPE "public"."enum_study_plans_courses_semester" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8');
  CREATE TYPE "public"."enum_study_plans_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__study_plans_v_version_courses_semester" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8');
  CREATE TYPE "public"."enum__study_plans_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__study_plans_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_centers_kind" AS ENUM('center', 'service', 'universityCenter');
  CREATE TYPE "public"."enum_centers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__centers_v_version_kind" AS ENUM('center', 'service', 'universityCenter');
  CREATE TYPE "public"."enum__centers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__centers_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_projects_project_status" AS ENUM('current', 'completed', 'planned');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_project_status" AS ENUM('current', 'completed', 'planned');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_research_publications_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__research_publications_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__research_publications_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_campus_life_kind" AS ENUM('life', 'activity');
  CREATE TYPE "public"."enum_campus_life_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__campus_life_v_version_kind" AS ENUM('life', 'activity');
  CREATE TYPE "public"."enum__campus_life_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__campus_life_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_offers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__offers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__offers_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_partners_type" AS ENUM('local', 'international');
  CREATE TYPE "public"."enum_sliders_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_student_affairs_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__student_affairs_documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__student_affairs_documents_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_announcements_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__announcements_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__announcements_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_admission_requirements_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__admission_requirements_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__admission_requirements_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_forms_blocks_upload_upload_collection" AS ENUM('media');
  CREATE TYPE "public"."enum_forms_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_navbar_settings_top_bar_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_navbar_settings_call_to_action_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_navbar_settings_call_to_action_appearance" AS ENUM('default', 'secondary', 'ghost');
  CREATE TYPE "public"."enum__navbar_settings_v_version_top_bar_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__navbar_settings_v_version_call_to_action_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__navbar_settings_v_version_call_to_action_appearance" AS ENUM('default', 'secondary', 'ghost');
  CREATE TYPE "public"."enum_footer_settings_footer_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_footer_settings_footer_background_type" AS ENUM('none', 'image', 'video');
  CREATE TYPE "public"."enum__footer_settings_v_version_footer_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__footer_settings_v_version_footer_background_type" AS ENUM('none', 'image', 'video');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"role_id" integer NOT NULL,
  	"system_role" "enum_users_system_role" DEFAULT 'student',
  	"role_slug" varchar,
  	"role_level" numeric,
  	"role_permissions" jsonb,
  	"role_is_active" boolean,
  	"role_can_access_payload_admin" boolean,
  	"college_scope_id" integer,
  	"avatar_id" integer,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "roles_permissions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );
  
  CREATE TABLE "roles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"level" numeric NOT NULL,
  	"is_system_role" boolean DEFAULT false,
  	"can_access_payload_admin" boolean DEFAULT false,
  	"can_access_refine" boolean DEFAULT false,
  	"can_access_student_portal" boolean DEFAULT false,
  	"can_access_doctor_portal" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "roles_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"prefix" varchar DEFAULT 'media',
  	"blurhash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_square_url" varchar,
  	"sizes_square_width" numeric,
  	"sizes_square_height" numeric,
  	"sizes_square_mime_type" varchar,
  	"sizes_square_filesize" numeric,
  	"sizes_square_filename" varchar,
  	"sizes_small_url" varchar,
  	"sizes_small_width" numeric,
  	"sizes_small_height" numeric,
  	"sizes_small_mime_type" varchar,
  	"sizes_small_filesize" numeric,
  	"sizes_small_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_xlarge_url" varchar,
  	"sizes_xlarge_width" numeric,
  	"sizes_xlarge_height" numeric,
  	"sizes_xlarge_mime_type" varchar,
  	"sizes_xlarge_filesize" numeric,
  	"sizes_xlarge_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "pages_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_appearance" "enum_pages_hero_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_cta_href" varchar DEFAULT '/admission',
  	"secondary_cta_href" varchar DEFAULT '/colleges',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"badge" varchar,
  	"title_primary" varchar,
  	"title_secondary" varchar,
  	"tagline" varchar,
  	"description" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_pages_blocks_stats_items_key",
  	"icon" "enum_pages_blocks_stats_items_icon",
  	"number" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_colleges_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum_pages_blocks_colleges_grid_variant" DEFAULT 'featured',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_colleges_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_news_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum_pages_blocks_news_grid_variant" DEFAULT 'latest',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_news_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_events_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum_pages_blocks_events_grid_variant" DEFAULT 'upcoming',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_events_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_blog_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum_pages_blocks_blog_grid_variant" DEFAULT 'latest',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_blog_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"show_categories" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 12,
  	"group_filter" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_team_members_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_partners_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"website" varchar
  );
  
  CREATE TABLE "pages_blocks_partners_partners_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_partners_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_admission_c_t_a" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"button_href" varchar DEFAULT '/admission',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_admission_c_t_a_locales" (
  	"badge" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact_info_locales" (
  	"badge" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"button_href" varchar DEFAULT '/',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_locales" (
  	"heading" varchar,
  	"description" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_announcements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_announcements_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_campus_life_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"kind_filter" "enum_pages_blocks_campus_life_grid_kind_filter",
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_campus_life_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_centers_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_centers_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_offers_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_offers_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_projects_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 3,
  	"status_filter" "enum_pages_blocks_projects_grid_status_filter",
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_projects_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_research_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_research_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_study_plans_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_study_plans_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"video_file_id" integer,
  	"poster_image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_video_locales" (
  	"overlay_title" varchar,
  	"overlay_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faculty_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 12,
  	"disable_inner_container" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faculty_members_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_programs_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"college_filter_id" integer,
  	"degree_filter" "enum_pages_blocks_programs_grid_degree_filter",
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_programs_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 5,
  	"autoplay" boolean DEFAULT true,
  	"interval" numeric DEFAULT 5000,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_slider_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_links_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_links_links_icon" DEFAULT 'GraduationCap',
  	"href" varchar,
  	"coming_soon" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_links_links_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_links_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"author_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"display_order" numeric,
  	"hero_type" "enum_pages_hero_type" DEFAULT 'lowImpact',
  	"hero_media_id" integer,
  	"hero_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"hero_rich_text" jsonb,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"colleges_id" integer,
  	"team_members_id" integer,
  	"categories_id" integer,
  	"faculty_members_id" integer
  );
  
  CREATE TABLE "_pages_v_version_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_version_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_appearance" "enum__pages_v_version_hero_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_cta_href" varchar DEFAULT '/admission',
  	"secondary_cta_href" varchar DEFAULT '/colleges',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"badge" varchar,
  	"title_primary" varchar,
  	"title_secondary" varchar,
  	"tagline" varchar,
  	"description" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "enum__pages_v_blocks_stats_items_key",
  	"icon" "enum__pages_v_blocks_stats_items_icon",
  	"number" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_colleges_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum__pages_v_blocks_colleges_grid_variant" DEFAULT 'featured',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_colleges_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_news_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum__pages_v_blocks_news_grid_variant" DEFAULT 'latest',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_news_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_events_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum__pages_v_blocks_events_grid_variant" DEFAULT 'upcoming',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_events_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_blog_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"variant" "enum__pages_v_blocks_blog_grid_variant" DEFAULT 'latest',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_blog_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"show_categories" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 12,
  	"group_filter" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_members_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_partners_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"website" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_partners_partners_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_partners_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_admission_c_t_a" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"button_href" varchar DEFAULT '/admission',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_admission_c_t_a_locales" (
  	"badge" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_info_locales" (
  	"badge" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"button_href" varchar DEFAULT '/',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_locales" (
  	"heading" varchar,
  	"description" varchar,
  	"button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_announcements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_announcements_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_campus_life_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"kind_filter" "enum__pages_v_blocks_campus_life_grid_kind_filter",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_campus_life_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_centers_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_centers_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_offers_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_offers_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_projects_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 3,
  	"status_filter" "enum__pages_v_blocks_projects_grid_status_filter",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_projects_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_research_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_research_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_study_plans_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 4,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_study_plans_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_file_id" integer,
  	"poster_image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video_locales" (
  	"overlay_title" varchar,
  	"overlay_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faculty_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 12,
  	"disable_inner_container" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faculty_members_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_programs_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 6,
  	"college_filter_id" integer,
  	"degree_filter" "enum__pages_v_blocks_programs_grid_degree_filter",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_programs_grid_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_items" numeric DEFAULT 5,
  	"autoplay" boolean DEFAULT true,
  	"interval" numeric DEFAULT 5000,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_slider_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_links_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_links_links_icon" DEFAULT 'GraduationCap',
  	"href" varchar,
  	"coming_soon" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_links_links_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_links_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_author_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_display_order" numeric,
  	"version_hero_type" "enum__pages_v_version_hero_type" DEFAULT 'lowImpact',
  	"version_hero_media_id" integer,
  	"version_hero_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_hero_rich_text" jsonb,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"colleges_id" integer,
  	"team_members_id" integer,
  	"categories_id" integer,
  	"faculty_members_id" integer
  );
  
  CREATE TABLE "navigation_menus_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false,
  	"order" numeric DEFAULT 0
  );
  
  CREATE TABLE "navigation_menus_items_children_locales" (
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_menus_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"group" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"show_in_more" boolean DEFAULT false
  );
  
  CREATE TABLE "navigation_menus_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_menus" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"is_published" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "news_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "news_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"college_id" integer,
  	"author_id" integer,
  	"category_id" integer,
  	"image_id" integer,
  	"featured_image_id" integer,
  	"display_order" numeric,
  	"views" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "news_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_news_v_version_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_news_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_news_v_version_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_college_id" integer,
  	"version_author_id" integer,
  	"version_category_id" integer,
  	"version_image_id" integer,
  	"version_featured_image_id" integer,
  	"version_display_order" numeric,
  	"version_views" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__news_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_news_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "colleges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"icon" varchar,
  	"dean_image_id" integer,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_colleges_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "colleges_locales" (
  	"name" varchar,
  	"description" jsonb,
  	"admission_requirements" jsonb,
  	"vision" jsonb,
  	"mission" jsonb,
  	"goals" jsonb,
  	"values" jsonb,
  	"strategy" jsonb,
  	"quality" jsonb,
  	"dean_name" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_colleges_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_icon" varchar,
  	"version_dean_image_id" integer,
  	"version_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__colleges_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__colleges_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_colleges_v_locales" (
  	"version_name" varchar,
  	"version_description" jsonb,
  	"version_admission_requirements" jsonb,
  	"version_vision" jsonb,
  	"version_mission" jsonb,
  	"version_goals" jsonb,
  	"version_values" jsonb,
  	"version_strategy" jsonb,
  	"version_quality" jsonb,
  	"version_dean_name" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "academic_departments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"college_id" integer,
  	"head_of_department_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_academic_departments_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "academic_departments_locales" (
  	"name" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_academic_departments_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_college_id" integer,
  	"version_head_of_department_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__academic_departments_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__academic_departments_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_academic_departments_v_locales" (
  	"version_name" varchar,
  	"version_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "academic_programs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"college_id" integer,
  	"department_id" integer,
  	"degree_type" "enum_academic_programs_degree_type",
  	"study_years" varchar,
  	"admission_rate" numeric,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_academic_programs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "academic_programs_locales" (
  	"name" varchar,
  	"description" jsonb,
  	"objectives" jsonb,
  	"career_prospects" jsonb,
  	"application_steps" jsonb,
  	"why_program" jsonb,
  	"high_school_type" varchar,
  	"duration" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_academic_programs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_college_id" integer,
  	"version_department_id" integer,
  	"version_degree_type" "enum__academic_programs_v_version_degree_type",
  	"version_study_years" varchar,
  	"version_admission_rate" numeric,
  	"version_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__academic_programs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__academic_programs_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_academic_programs_v_locales" (
  	"version_name" varchar,
  	"version_description" jsonb,
  	"version_objectives" jsonb,
  	"version_career_prospects" jsonb,
  	"version_application_steps" jsonb,
  	"version_why_program" jsonb,
  	"version_high_school_type" varchar,
  	"version_duration" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faculty_members_education" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" varchar
  );
  
  CREATE TABLE "faculty_members_education_locales" (
  	"degree" varchar,
  	"institution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "faculty_members_experience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "faculty_members_experience_locales" (
  	"position" varchar,
  	"organization" varchar,
  	"period" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "faculty_members_publications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"journal" varchar,
  	"year" varchar,
  	"link" varchar
  );
  
  CREATE TABLE "faculty_members_publications_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "faculty_members_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"semester" varchar
  );
  
  CREATE TABLE "faculty_members_courses_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "faculty_members_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "faculty_members_skills_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "faculty_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"college_id" integer,
  	"department_id" integer,
  	"email" varchar,
  	"phone" varchar,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_faculty_members_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "faculty_members_locales" (
  	"full_name" varchar,
  	"academic_title" varchar,
  	"biography" jsonb,
  	"office_hours" varchar,
  	"research_interests" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faculty_members_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"academic_programs_id" integer
  );
  
  CREATE TABLE "_faculty_members_v_version_education" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"year" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faculty_members_v_version_education_locales" (
  	"degree" varchar,
  	"institution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v_version_experience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faculty_members_v_version_experience_locales" (
  	"position" varchar,
  	"organization" varchar,
  	"period" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v_version_publications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"journal" varchar,
  	"year" varchar,
  	"link" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faculty_members_v_version_publications_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v_version_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"semester" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faculty_members_v_version_courses_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v_version_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_faculty_members_v_version_skills_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_college_id" integer,
  	"version_department_id" integer,
  	"version_email" varchar,
  	"version_phone" varchar,
  	"version_photo_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__faculty_members_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__faculty_members_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_faculty_members_v_locales" (
  	"version_full_name" varchar,
  	"version_academic_title" varchar,
  	"version_biography" jsonb,
  	"version_office_hours" varchar,
  	"version_research_interests" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faculty_members_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"academic_programs_id" integer
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"status" "enum_contact_messages_status" DEFAULT 'new',
  	"notes" varchar,
  	"_hp" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "join_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"submission_key" varchar,
  	"full_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"national_id" varchar,
  	"date_of_birth" timestamp(3) with time zone,
  	"gender" "enum_join_requests_gender",
  	"nationality" varchar,
  	"city" varchar,
  	"high_school_type" varchar,
  	"high_school_gpa" numeric,
  	"desired_college_id" integer,
  	"desired_program_id" integer,
  	"high_school_document_id" integer,
  	"id_document_id" integer,
  	"personal_photo_id" integer,
  	"status" "enum_join_requests_status" DEFAULT 'pending',
  	"notes" varchar,
  	"_hp" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"event_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"registration_url" varchar,
  	"college_id" integer,
  	"category_id" integer,
  	"image_id" integer,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"location" varchar,
  	"organizer" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_event_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_registration_url" varchar,
  	"version_college_id" integer,
  	"version_category_id" integer,
  	"version_image_id" integer,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__events_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_events_v_locales" (
  	"version_title" varchar,
  	"version_description" jsonb,
  	"version_location" varchar,
  	"version_organizer" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "blog_posts_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "blog_posts_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "blog_posts_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"author_id" integer,
  	"author_avatar_id" integer,
  	"category_id" integer,
  	"image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"read_time" numeric,
  	"views" numeric DEFAULT 0,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_blog_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "blog_posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_blog_posts_v_version_populated_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" varchar,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_blog_posts_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_blog_posts_v_version_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_blog_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_author_id" integer,
  	"version_author_avatar_id" integer,
  	"version_category_id" integer,
  	"version_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_read_time" numeric,
  	"version_views" numeric DEFAULT 0,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__blog_posts_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_blog_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_faqs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "faqs_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__faqs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__faqs_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_faqs_v_locales" (
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "email_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar NOT NULL,
  	"student_id" varchar,
  	"college_id" integer,
  	"program_id" integer,
  	"phone" varchar,
  	"alternate_email" varchar,
  	"request_type" "enum_email_requests_request_type" NOT NULL,
  	"status" "enum_email_requests_status" DEFAULT 'new',
  	"notes" varchar,
  	"source_ip" varchar,
  	"user_agent" varchar,
  	"_hp" varchar,
  	"reviewed_at" timestamp(3) with time zone,
  	"reviewed_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"image_id" integer,
  	"email" varchar,
  	"phone" varchar,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_members_locales" (
  	"name" varchar NOT NULL,
  	"job_title" varchar,
  	"group" varchar,
  	"bio" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_categories_kind" NOT NULL,
  	"parent_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "study_plans_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"credits" numeric,
  	"year" numeric,
  	"semester" "enum_study_plans_courses_semester"
  );
  
  CREATE TABLE "study_plans_courses_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "study_plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"academic_program_id" integer,
  	"college_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_study_plans_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "study_plans_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_study_plans_v_version_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"credits" numeric,
  	"year" numeric,
  	"semester" "enum__study_plans_v_version_courses_semester",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_study_plans_v_version_courses_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_study_plans_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_academic_program_id" integer,
  	"version_college_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__study_plans_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__study_plans_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_study_plans_v_locales" (
  	"version_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "private_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"prefix" varchar DEFAULT 'private-media',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar
  );
  
  CREATE TABLE "private_media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "centers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"kind" "enum_centers_kind" DEFAULT 'center',
  	"phone" varchar,
  	"email" varchar,
  	"image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_centers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "centers_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"services" jsonb,
  	"programs" jsonb,
  	"location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_centers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_kind" "enum__centers_v_version_kind" DEFAULT 'center',
  	"version_phone" varchar,
  	"version_email" varchar,
  	"version_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__centers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__centers_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_centers_v_locales" (
  	"version_title" varchar,
  	"version_description" jsonb,
  	"version_services" jsonb,
  	"version_programs" jsonb,
  	"version_location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "projects_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"image_id" integer,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"year" numeric,
  	"progress" numeric,
  	"project_status" "enum_projects_project_status",
  	"published_at" timestamp(3) with time zone,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_projects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "projects_locales" (
  	"title" varchar,
  	"description" varchar,
  	"details" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_projects_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_image_id" integer,
  	"version_start_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_year" numeric,
  	"version_progress" numeric,
  	"version_project_status" "enum__projects_v_version_project_status",
  	"version_published_at" timestamp(3) with time zone,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__projects_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_projects_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_details" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "research_publications_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "research_publications_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "research_publications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"publish_date" timestamp(3) with time zone,
  	"image_id" integer,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_research_publications_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "research_publications_locales" (
  	"title" varchar,
  	"author" varchar,
  	"summary" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_research_publications_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_research_publications_v_version_tags_locales" (
  	"tag" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_research_publications_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_publish_date" timestamp(3) with time zone,
  	"version_image_id" integer,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__research_publications_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__research_publications_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_research_publications_v_locales" (
  	"version_title" varchar,
  	"version_author" varchar,
  	"version_summary" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "campus_life_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "campus_life_highlights_locales" (
  	"highlight" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "campus_life_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" numeric
  );
  
  CREATE TABLE "campus_life_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "campus_life" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"kind" "enum_campus_life_kind" DEFAULT 'life',
  	"image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_campus_life_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "campus_life_locales" (
  	"title" varchar,
  	"content" jsonb,
  	"sidebar_title" varchar,
  	"highlights_title" varchar,
  	"sidebar_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_campus_life_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_campus_life_v_version_highlights_locales" (
  	"highlight" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_campus_life_v_version_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_campus_life_v_version_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_campus_life_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_kind" "enum__campus_life_v_version_kind" DEFAULT 'life',
  	"version_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__campus_life_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__campus_life_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_campus_life_v_locales" (
  	"version_title" varchar,
  	"version_content" jsonb,
  	"version_sidebar_title" varchar,
  	"version_highlights_title" varchar,
  	"version_sidebar_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "offers_interest_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "offers_interest_highlights_locales" (
  	"highlight" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "offers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"valid_until" timestamp(3) with time zone,
  	"apply_link" varchar,
  	"image_id" integer,
  	"college_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_offers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "offers_locales" (
  	"title" varchar,
  	"description" varchar,
  	"details" jsonb,
  	"target_audience" varchar,
  	"benefits" jsonb,
  	"duration" varchar,
  	"location" varchar,
  	"requirements" varchar,
  	"interest_title" varchar,
  	"interest_subtitle" varchar,
  	"interest_open_title" varchar,
  	"interest_open_subtitle" varchar,
  	"interest_highlights_title" varchar,
  	"interest_notice" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_offers_v_version_interest_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_offers_v_version_interest_highlights_locales" (
  	"highlight" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_offers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_valid_until" timestamp(3) with time zone,
  	"version_apply_link" varchar,
  	"version_image_id" integer,
  	"version_college_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__offers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__offers_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_offers_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_details" jsonb,
  	"version_target_audience" varchar,
  	"version_benefits" jsonb,
  	"version_duration" varchar,
  	"version_location" varchar,
  	"version_requirements" varchar,
  	"version_interest_title" varchar,
  	"version_interest_subtitle" varchar,
  	"version_interest_open_title" varchar,
  	"version_interest_open_subtitle" varchar,
  	"version_interest_highlights_title" varchar,
  	"version_interest_notice" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" integer,
  	"type" "enum_partners_type",
  	"website" varchar,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partners_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sliders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"link_type" "enum_sliders_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sliders_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sliders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  CREATE TABLE "student_affairs_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"file_coming_soon" boolean DEFAULT false,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_student_affairs_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "student_affairs_documents_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_student_affairs_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_file_id" integer,
  	"version_file_coming_soon" boolean DEFAULT false,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__student_affairs_documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__student_affairs_documents_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_student_affairs_documents_v_locales" (
  	"version_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"image_id" integer,
  	"publish_date" timestamp(3) with time zone,
  	"college_id" integer,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_announcements_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "announcements_locales" (
  	"title" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_announcements_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_image_id" integer,
  	"version_publish_date" timestamp(3) with time zone,
  	"version_college_id" integer,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__announcements_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__announcements_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_announcements_v_locales" (
  	"version_title" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "admission_requirements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"display_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_admission_requirements_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "admission_requirements_locales" (
  	"title" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_admission_requirements_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_image_id" integer,
  	"version_display_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__admission_requirements_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__admission_requirements_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_admission_requirements_v_locales" (
  	"version_title" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "forms_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_checkbox_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_email_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_message_locales" (
  	"message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_number" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"default_value" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_number_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_select_options_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"placeholder" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_select_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_text_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_textarea_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_upload_mime_types" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mime_type" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_upload" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"upload_collection" "enum_forms_blocks_upload_upload_collection" NOT NULL,
  	"width" numeric,
  	"max_file_size" numeric,
  	"required" boolean,
  	"multiple" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_upload_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar
  );
  
  CREATE TABLE "forms_emails_locales" (
  	"subject" varchar DEFAULT 'You''ve received a new message.' NOT NULL,
  	"message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"confirmation_type" "enum_forms_confirmation_type" DEFAULT 'message',
  	"redirect_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_locales" (
  	"submit_button_label" varchar,
  	"confirmation_message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "form_submissions_submission_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "form_submissions_submission_uploads" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"managed" boolean DEFAULT false,
  	"managed_target_collection" varchar,
  	"managed_target_document_id" varchar,
  	"managed_target_route_key" varchar,
  	"disabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"news_id" integer,
  	"events_id" integer,
  	"blog_posts_id" integer,
  	"colleges_id" integer,
  	"faculty_members_id" integer,
  	"centers_id" integer,
  	"offers_id" integer,
  	"campus_life_id" integer,
  	"projects_id" integer,
  	"research_publications_id" integer,
  	"academic_programs_id" integer,
  	"study_plans_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"roles_id" integer,
  	"media_id" integer,
  	"pages_id" integer,
  	"navigation_menus_id" integer,
  	"news_id" integer,
  	"colleges_id" integer,
  	"academic_departments_id" integer,
  	"academic_programs_id" integer,
  	"faculty_members_id" integer,
  	"contact_messages_id" integer,
  	"join_requests_id" integer,
  	"events_id" integer,
  	"blog_posts_id" integer,
  	"faqs_id" integer,
  	"email_requests_id" integer,
  	"team_members_id" integer,
  	"categories_id" integer,
  	"study_plans_id" integer,
  	"private_media_id" integer,
  	"centers_id" integer,
  	"projects_id" integer,
  	"research_publications_id" integer,
  	"campus_life_id" integer,
  	"offers_id" integer,
  	"partners_id" integer,
  	"sliders_id" integer,
  	"student_affairs_documents_id" integer,
  	"announcements_id" integer,
  	"admission_requirements_id" integer,
  	"forms_id" integer,
  	"form_submissions_id" integer,
  	"redirects_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"favicon_id" integer,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"map_location" varchar,
  	"copyright" varchar,
  	"footer_logo_id" integer,
  	"google_analytics_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"site_name" varchar,
  	"tagline" varchar,
  	"description" varchar,
  	"address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_logo_id" integer,
  	"version_favicon_id" integer,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_map_location" varchar,
  	"version_copyright" varchar,
  	"version_footer_logo_id" integer,
  	"version_google_analytics_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_locales" (
  	"version_site_name" varchar,
  	"version_tagline" varchar,
  	"version_description" varchar,
  	"version_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "about_page_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"member_image_id" integer,
  	"display_order" numeric DEFAULT 0
  );
  
  CREATE TABLE "about_page_team_members_locales" (
  	"group_name" varchar,
  	"full_name" varchar,
  	"job_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro_image_id" integer,
  	"president_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page_locales" (
  	"header_badge" varchar,
  	"header_title" varchar,
  	"header_description" varchar,
  	"intro_body" jsonb,
  	"vision_title" varchar,
  	"vision_description" jsonb,
  	"mission_title" varchar,
  	"mission_description" jsonb,
  	"goals_title" varchar,
  	"goals_description" jsonb,
  	"values_title" varchar,
  	"values_description" jsonb,
  	"president_section_title" varchar,
  	"president_message_intro" jsonb,
  	"president_message_body" jsonb,
  	"president_message_closing" jsonb,
  	"president_name" varchar,
  	"president_role" varchar,
  	"team_section_section_title" varchar,
  	"team_section_section_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "about_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"team_members_id" integer
  );
  
  CREATE TABLE "_about_page_v_version_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_image_id" integer,
  	"display_order" numeric DEFAULT 0,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_page_v_version_team_members_locales" (
  	"group_name" varchar,
  	"full_name" varchar,
  	"job_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_intro_image_id" integer,
  	"version_president_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_about_page_v_locales" (
  	"version_header_badge" varchar,
  	"version_header_title" varchar,
  	"version_header_description" varchar,
  	"version_intro_body" jsonb,
  	"version_vision_title" varchar,
  	"version_vision_description" jsonb,
  	"version_mission_title" varchar,
  	"version_mission_description" jsonb,
  	"version_goals_title" varchar,
  	"version_goals_description" jsonb,
  	"version_values_title" varchar,
  	"version_values_description" jsonb,
  	"version_president_section_title" varchar,
  	"version_president_message_intro" jsonb,
  	"version_president_message_body" jsonb,
  	"version_president_message_closing" jsonb,
  	"version_president_name" varchar,
  	"version_president_role" varchar,
  	"version_team_section_section_title" varchar,
  	"version_team_section_section_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"team_members_id" integer
  );
  
  CREATE TABLE "contact_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_info_phone" varchar,
  	"contact_info_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_settings_locales" (
  	"page_badge" varchar,
  	"page_title" varchar,
  	"page_description" varchar,
  	"form_labels_name_label" varchar,
  	"form_labels_name_placeholder" varchar,
  	"form_labels_email_label" varchar,
  	"form_labels_email_placeholder" varchar,
  	"form_labels_subject_label" varchar,
  	"form_labels_subject_placeholder" varchar,
  	"form_labels_message_label" varchar,
  	"form_labels_message_placeholder" varchar,
  	"form_labels_submit_text" varchar,
  	"contact_info_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_contact_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_contact_info_phone" varchar,
  	"version_contact_info_email" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_contact_settings_v_locales" (
  	"version_page_badge" varchar,
  	"version_page_title" varchar,
  	"version_page_description" varchar,
  	"version_form_labels_name_label" varchar,
  	"version_form_labels_name_placeholder" varchar,
  	"version_form_labels_email_label" varchar,
  	"version_form_labels_email_placeholder" varchar,
  	"version_form_labels_subject_label" varchar,
  	"version_form_labels_subject_placeholder" varchar,
  	"version_form_labels_message_label" varchar,
  	"version_form_labels_message_placeholder" varchar,
  	"version_form_labels_submit_text" varchar,
  	"version_contact_info_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "smart_chat_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"is_enabled" boolean DEFAULT false,
  	"bot_name" varchar,
  	"welcome_message" varchar,
  	"api_endpoint" varchar,
  	"model" varchar,
  	"max_tokens" numeric,
  	"temperature" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navbar_settings_top_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navbar_settings_top_bar_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "navbar_settings_top_bar_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navbar_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hide_login" boolean DEFAULT false,
  	"show_language_picker" boolean DEFAULT true,
  	"call_to_action_type" "enum_navbar_settings_call_to_action_type" DEFAULT 'reference',
  	"call_to_action_new_tab" boolean,
  	"call_to_action_url" varchar,
  	"call_to_action_appearance" "enum_navbar_settings_call_to_action_appearance" DEFAULT 'default',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navbar_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  CREATE TABLE "_navbar_settings_v_version_top_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__navbar_settings_v_version_top_bar_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navbar_settings_v_version_top_bar_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navbar_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hide_login" boolean DEFAULT false,
  	"version_show_language_picker" boolean DEFAULT true,
  	"version_call_to_action_type" "enum__navbar_settings_v_version_call_to_action_type" DEFAULT 'reference',
  	"version_call_to_action_new_tab" boolean,
  	"version_call_to_action_url" varchar,
  	"version_call_to_action_appearance" "enum__navbar_settings_v_version_call_to_action_appearance" DEFAULT 'default',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_navbar_settings_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  CREATE TABLE "footer_settings_footer_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_settings_footer_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"group" varchar
  );
  
  CREATE TABLE "footer_settings_footer_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "footer_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"footer_background_type" "enum_footer_settings_footer_background_type" DEFAULT 'none',
  	"footer_background_image_id" integer,
  	"footer_background_video_id" integer,
  	"footer_background_overlay_opacity" numeric DEFAULT 0.65,
  	"hide_footer_signup" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_settings_locales" (
  	"address" varchar,
  	"footer_powered" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "footer_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  CREATE TABLE "_footer_settings_v_version_footer_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__footer_settings_v_version_footer_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"group" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_settings_v_version_footer_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_footer_background_type" "enum__footer_settings_v_version_footer_background_type" DEFAULT 'none',
  	"version_footer_background_image_id" integer,
  	"version_footer_background_video_id" integer,
  	"version_footer_background_overlay_opacity" numeric DEFAULT 0.65,
  	"version_hide_footer_signup" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_footer_settings_v_locales" (
  	"version_address" varchar,
  	"version_footer_powered" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_settings_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  CREATE TABLE "analytics_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"google_analytics_id" varchar,
  	"google_analytics_anonymize_ip" boolean DEFAULT true,
  	"enable_view_tracking" boolean DEFAULT true,
  	"robots_txt" varchar,
  	"head_html" varchar,
  	"enable_google_indexing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "dashboard_metrics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"total_students" numeric DEFAULT 0,
  	"total_programs" numeric DEFAULT 0,
  	"total_courses" numeric DEFAULT 0,
  	"total_faculty" numeric DEFAULT 0,
  	"total_colleges" numeric DEFAULT 0,
  	"total_news" numeric DEFAULT 0,
  	"total_events" numeric DEFAULT 0,
  	"last_updated" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_college_scope_id_colleges_id_fk" FOREIGN KEY ("college_scope_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roles_locales" ADD CONSTRAINT "roles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_populated_authors" ADD CONSTRAINT "pages_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_hero_links" ADD CONSTRAINT "pages_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_items" ADD CONSTRAINT "pages_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_items_locales" ADD CONSTRAINT "pages_blocks_stats_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_colleges_grid" ADD CONSTRAINT "pages_blocks_colleges_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_colleges_grid_locales" ADD CONSTRAINT "pages_blocks_colleges_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_colleges_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_news_grid" ADD CONSTRAINT "pages_blocks_news_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_news_grid_locales" ADD CONSTRAINT "pages_blocks_news_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_news_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_events_grid" ADD CONSTRAINT "pages_blocks_events_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_events_grid_locales" ADD CONSTRAINT "pages_blocks_events_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_events_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_blog_grid" ADD CONSTRAINT "pages_blocks_blog_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_blog_grid_locales" ADD CONSTRAINT "pages_blocks_blog_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_blog_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_members" ADD CONSTRAINT "pages_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_members_locales" ADD CONSTRAINT "pages_blocks_team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners_partners" ADD CONSTRAINT "pages_blocks_partners_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners_partners" ADD CONSTRAINT "pages_blocks_partners_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners_partners_locales" ADD CONSTRAINT "pages_blocks_partners_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_partners_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners" ADD CONSTRAINT "pages_blocks_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partners_locales" ADD CONSTRAINT "pages_blocks_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_admission_c_t_a" ADD CONSTRAINT "pages_blocks_admission_c_t_a_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_admission_c_t_a_locales" ADD CONSTRAINT "pages_blocks_admission_c_t_a_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_admission_c_t_a"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_info" ADD CONSTRAINT "pages_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_info_locales" ADD CONSTRAINT "pages_blocks_contact_info_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_info"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_locales" ADD CONSTRAINT "pages_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_announcements" ADD CONSTRAINT "pages_blocks_announcements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_announcements_locales" ADD CONSTRAINT "pages_blocks_announcements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_campus_life_grid" ADD CONSTRAINT "pages_blocks_campus_life_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_campus_life_grid_locales" ADD CONSTRAINT "pages_blocks_campus_life_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_campus_life_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_centers_grid" ADD CONSTRAINT "pages_blocks_centers_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_centers_grid_locales" ADD CONSTRAINT "pages_blocks_centers_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_centers_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offers_grid" ADD CONSTRAINT "pages_blocks_offers_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offers_grid_locales" ADD CONSTRAINT "pages_blocks_offers_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_offers_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_projects_grid" ADD CONSTRAINT "pages_blocks_projects_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_projects_grid_locales" ADD CONSTRAINT "pages_blocks_projects_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_projects_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_research_grid" ADD CONSTRAINT "pages_blocks_research_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_research_grid_locales" ADD CONSTRAINT "pages_blocks_research_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_research_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_study_plans_grid" ADD CONSTRAINT "pages_blocks_study_plans_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_study_plans_grid_locales" ADD CONSTRAINT "pages_blocks_study_plans_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_study_plans_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_poster_image_id_media_id_fk" FOREIGN KEY ("poster_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_locales" ADD CONSTRAINT "pages_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faculty_members" ADD CONSTRAINT "pages_blocks_faculty_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faculty_members_locales" ADD CONSTRAINT "pages_blocks_faculty_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_programs_grid" ADD CONSTRAINT "pages_blocks_programs_grid_college_filter_id_colleges_id_fk" FOREIGN KEY ("college_filter_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_programs_grid" ADD CONSTRAINT "pages_blocks_programs_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_programs_grid_locales" ADD CONSTRAINT "pages_blocks_programs_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_programs_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_slider" ADD CONSTRAINT "pages_blocks_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_slider_locales" ADD CONSTRAINT "pages_blocks_slider_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_slider"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_links_links" ADD CONSTRAINT "pages_blocks_links_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_links_links_locales" ADD CONSTRAINT "pages_blocks_links_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_links_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_links" ADD CONSTRAINT "pages_blocks_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_links_locales" ADD CONSTRAINT "pages_blocks_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_colleges_fk" FOREIGN KEY ("colleges_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_faculty_members_fk" FOREIGN KEY ("faculty_members_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_populated_authors" ADD CONSTRAINT "_pages_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_hero_links" ADD CONSTRAINT "_pages_v_version_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_items" ADD CONSTRAINT "_pages_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_items_locales" ADD CONSTRAINT "_pages_v_blocks_stats_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_colleges_grid" ADD CONSTRAINT "_pages_v_blocks_colleges_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_colleges_grid_locales" ADD CONSTRAINT "_pages_v_blocks_colleges_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_colleges_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_news_grid" ADD CONSTRAINT "_pages_v_blocks_news_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_news_grid_locales" ADD CONSTRAINT "_pages_v_blocks_news_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_news_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_events_grid" ADD CONSTRAINT "_pages_v_blocks_events_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_events_grid_locales" ADD CONSTRAINT "_pages_v_blocks_events_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_events_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_blog_grid" ADD CONSTRAINT "_pages_v_blocks_blog_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_blog_grid_locales" ADD CONSTRAINT "_pages_v_blocks_blog_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_blog_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members" ADD CONSTRAINT "_pages_v_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members_locales" ADD CONSTRAINT "_pages_v_blocks_team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners_partners" ADD CONSTRAINT "_pages_v_blocks_partners_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners_partners" ADD CONSTRAINT "_pages_v_blocks_partners_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners_partners_locales" ADD CONSTRAINT "_pages_v_blocks_partners_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_partners_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners" ADD CONSTRAINT "_pages_v_blocks_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partners_locales" ADD CONSTRAINT "_pages_v_blocks_partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_admission_c_t_a" ADD CONSTRAINT "_pages_v_blocks_admission_c_t_a_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_admission_c_t_a_locales" ADD CONSTRAINT "_pages_v_blocks_admission_c_t_a_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_admission_c_t_a"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_info" ADD CONSTRAINT "_pages_v_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_info_locales" ADD CONSTRAINT "_pages_v_blocks_contact_info_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_info"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_locales" ADD CONSTRAINT "_pages_v_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_announcements" ADD CONSTRAINT "_pages_v_blocks_announcements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_announcements_locales" ADD CONSTRAINT "_pages_v_blocks_announcements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_campus_life_grid" ADD CONSTRAINT "_pages_v_blocks_campus_life_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_campus_life_grid_locales" ADD CONSTRAINT "_pages_v_blocks_campus_life_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_campus_life_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_centers_grid" ADD CONSTRAINT "_pages_v_blocks_centers_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_centers_grid_locales" ADD CONSTRAINT "_pages_v_blocks_centers_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_centers_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offers_grid" ADD CONSTRAINT "_pages_v_blocks_offers_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offers_grid_locales" ADD CONSTRAINT "_pages_v_blocks_offers_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_offers_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_projects_grid" ADD CONSTRAINT "_pages_v_blocks_projects_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_projects_grid_locales" ADD CONSTRAINT "_pages_v_blocks_projects_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_projects_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_research_grid" ADD CONSTRAINT "_pages_v_blocks_research_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_research_grid_locales" ADD CONSTRAINT "_pages_v_blocks_research_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_research_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_study_plans_grid" ADD CONSTRAINT "_pages_v_blocks_study_plans_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_study_plans_grid_locales" ADD CONSTRAINT "_pages_v_blocks_study_plans_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_study_plans_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_poster_image_id_media_id_fk" FOREIGN KEY ("poster_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_locales" ADD CONSTRAINT "_pages_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faculty_members" ADD CONSTRAINT "_pages_v_blocks_faculty_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faculty_members_locales" ADD CONSTRAINT "_pages_v_blocks_faculty_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_programs_grid" ADD CONSTRAINT "_pages_v_blocks_programs_grid_college_filter_id_colleges_id_fk" FOREIGN KEY ("college_filter_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_programs_grid" ADD CONSTRAINT "_pages_v_blocks_programs_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_programs_grid_locales" ADD CONSTRAINT "_pages_v_blocks_programs_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_programs_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_slider" ADD CONSTRAINT "_pages_v_blocks_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_slider_locales" ADD CONSTRAINT "_pages_v_blocks_slider_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_slider"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_links_links" ADD CONSTRAINT "_pages_v_blocks_links_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_links_links_locales" ADD CONSTRAINT "_pages_v_blocks_links_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_links_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_links" ADD CONSTRAINT "_pages_v_blocks_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_links_locales" ADD CONSTRAINT "_pages_v_blocks_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_colleges_fk" FOREIGN KEY ("colleges_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_faculty_members_fk" FOREIGN KEY ("faculty_members_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_menus_items_children" ADD CONSTRAINT "navigation_menus_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_menus_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_menus_items_children_locales" ADD CONSTRAINT "navigation_menus_items_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_menus_items_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_menus_items" ADD CONSTRAINT "navigation_menus_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_menus_items_locales" ADD CONSTRAINT "navigation_menus_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_menus_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_populated_authors" ADD CONSTRAINT "news_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_tags_locales" ADD CONSTRAINT "news_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_version_populated_authors" ADD CONSTRAINT "_news_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_version_tags" ADD CONSTRAINT "_news_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_version_tags_locales" ADD CONSTRAINT "_news_v_version_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v_version_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "colleges" ADD CONSTRAINT "colleges_dean_image_id_media_id_fk" FOREIGN KEY ("dean_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "colleges" ADD CONSTRAINT "colleges_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "colleges_locales" ADD CONSTRAINT "colleges_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "colleges_locales" ADD CONSTRAINT "colleges_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_colleges_v" ADD CONSTRAINT "_colleges_v_parent_id_colleges_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colleges_v" ADD CONSTRAINT "_colleges_v_version_dean_image_id_media_id_fk" FOREIGN KEY ("version_dean_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colleges_v" ADD CONSTRAINT "_colleges_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colleges_v_locales" ADD CONSTRAINT "_colleges_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_colleges_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "academic_departments" ADD CONSTRAINT "academic_departments_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_departments" ADD CONSTRAINT "academic_departments_head_of_department_id_faculty_members_id_fk" FOREIGN KEY ("head_of_department_id") REFERENCES "public"."faculty_members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_departments_locales" ADD CONSTRAINT "academic_departments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."academic_departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_parent_id_academic_departments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."academic_departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_departments_v" ADD CONSTRAINT "_academic_departments_v_version_head_of_department_id_faculty_members_id_fk" FOREIGN KEY ("version_head_of_department_id") REFERENCES "public"."faculty_members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_departments_v_locales" ADD CONSTRAINT "_academic_departments_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_academic_departments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "academic_programs" ADD CONSTRAINT "academic_programs_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_programs" ADD CONSTRAINT "academic_programs_department_id_academic_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."academic_departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_programs" ADD CONSTRAINT "academic_programs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_programs_locales" ADD CONSTRAINT "academic_programs_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "academic_programs_locales" ADD CONSTRAINT "academic_programs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."academic_programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_parent_id_academic_programs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."academic_programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_department_id_academic_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."academic_departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_programs_v" ADD CONSTRAINT "_academic_programs_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_academic_programs_v_locales" ADD CONSTRAINT "_academic_programs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_academic_programs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_education" ADD CONSTRAINT "faculty_members_education_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_education_locales" ADD CONSTRAINT "faculty_members_education_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members_education"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_experience" ADD CONSTRAINT "faculty_members_experience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_experience_locales" ADD CONSTRAINT "faculty_members_experience_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members_experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_publications" ADD CONSTRAINT "faculty_members_publications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_publications_locales" ADD CONSTRAINT "faculty_members_publications_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_courses" ADD CONSTRAINT "faculty_members_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_courses_locales" ADD CONSTRAINT "faculty_members_courses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members_courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_skills" ADD CONSTRAINT "faculty_members_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_skills_locales" ADD CONSTRAINT "faculty_members_skills_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members_skills"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members" ADD CONSTRAINT "faculty_members_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faculty_members" ADD CONSTRAINT "faculty_members_department_id_academic_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."academic_departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faculty_members" ADD CONSTRAINT "faculty_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faculty_members_locales" ADD CONSTRAINT "faculty_members_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faculty_members_locales" ADD CONSTRAINT "faculty_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_rels" ADD CONSTRAINT "faculty_members_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faculty_members_rels" ADD CONSTRAINT "faculty_members_rels_academic_programs_fk" FOREIGN KEY ("academic_programs_id") REFERENCES "public"."academic_programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_education" ADD CONSTRAINT "_faculty_members_v_version_education_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_education_locales" ADD CONSTRAINT "_faculty_members_v_version_education_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v_version_education"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_experience" ADD CONSTRAINT "_faculty_members_v_version_experience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_experience_locales" ADD CONSTRAINT "_faculty_members_v_version_experience_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v_version_experience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_publications" ADD CONSTRAINT "_faculty_members_v_version_publications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_publications_locales" ADD CONSTRAINT "_faculty_members_v_version_publications_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v_version_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_courses" ADD CONSTRAINT "_faculty_members_v_version_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_courses_locales" ADD CONSTRAINT "_faculty_members_v_version_courses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v_version_courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_skills" ADD CONSTRAINT "_faculty_members_v_version_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_version_skills_locales" ADD CONSTRAINT "_faculty_members_v_version_skills_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v_version_skills"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_parent_id_faculty_members_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faculty_members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_department_id_academic_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."academic_departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faculty_members_v" ADD CONSTRAINT "_faculty_members_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_locales" ADD CONSTRAINT "_faculty_members_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_faculty_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faculty_members_v_rels" ADD CONSTRAINT "_faculty_members_v_rels_academic_programs_fk" FOREIGN KEY ("academic_programs_id") REFERENCES "public"."academic_programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_desired_college_id_colleges_id_fk" FOREIGN KEY ("desired_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_desired_program_id_academic_programs_id_fk" FOREIGN KEY ("desired_program_id") REFERENCES "public"."academic_programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_high_school_document_id_private_media_id_fk" FOREIGN KEY ("high_school_document_id") REFERENCES "public"."private_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_id_document_id_private_media_id_fk" FOREIGN KEY ("id_document_id") REFERENCES "public"."private_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_personal_photo_id_private_media_id_fk" FOREIGN KEY ("personal_photo_id") REFERENCES "public"."private_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts_populated_authors" ADD CONSTRAINT "blog_posts_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts_tags" ADD CONSTRAINT "blog_posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts_tags_locales" ADD CONSTRAINT "blog_posts_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_avatar_id_media_id_fk" FOREIGN KEY ("author_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts_locales" ADD CONSTRAINT "blog_posts_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts_locales" ADD CONSTRAINT "blog_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_version_populated_authors" ADD CONSTRAINT "_blog_posts_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_version_tags" ADD CONSTRAINT "_blog_posts_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_version_tags_locales" ADD CONSTRAINT "_blog_posts_v_version_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v_version_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_author_avatar_id_media_id_fk" FOREIGN KEY ("version_author_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_locales" ADD CONSTRAINT "_blog_posts_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_locales" ADD CONSTRAINT "_blog_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faqs_locales" ADD CONSTRAINT "faqs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_parent_id_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v" ADD CONSTRAINT "_faqs_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faqs_v_locales" ADD CONSTRAINT "_faqs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faqs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_program_id_academic_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academic_programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_members" ADD CONSTRAINT "team_members_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_members_locales" ADD CONSTRAINT "team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "study_plans_courses" ADD CONSTRAINT "study_plans_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "study_plans_courses_locales" ADD CONSTRAINT "study_plans_courses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."study_plans_courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_academic_program_id_academic_programs_id_fk" FOREIGN KEY ("academic_program_id") REFERENCES "public"."academic_programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "study_plans_locales" ADD CONSTRAINT "study_plans_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_study_plans_v_version_courses" ADD CONSTRAINT "_study_plans_v_version_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_study_plans_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_study_plans_v_version_courses_locales" ADD CONSTRAINT "_study_plans_v_version_courses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_study_plans_v_version_courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_study_plans_v" ADD CONSTRAINT "_study_plans_v_parent_id_study_plans_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."study_plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_study_plans_v" ADD CONSTRAINT "_study_plans_v_version_academic_program_id_academic_programs_id_fk" FOREIGN KEY ("version_academic_program_id") REFERENCES "public"."academic_programs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_study_plans_v" ADD CONSTRAINT "_study_plans_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_study_plans_v_locales" ADD CONSTRAINT "_study_plans_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_study_plans_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "private_media_locales" ADD CONSTRAINT "private_media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."private_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "centers" ADD CONSTRAINT "centers_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "centers_locales" ADD CONSTRAINT "centers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_centers_v" ADD CONSTRAINT "_centers_v_parent_id_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."centers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_centers_v" ADD CONSTRAINT "_centers_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_centers_v_locales" ADD CONSTRAINT "_centers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_centers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_images" ADD CONSTRAINT "projects_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_images" ADD CONSTRAINT "projects_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_locales" ADD CONSTRAINT "projects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_images" ADD CONSTRAINT "_projects_v_version_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_version_images" ADD CONSTRAINT "_projects_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_locales" ADD CONSTRAINT "_projects_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_publications_tags" ADD CONSTRAINT "research_publications_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_publications_tags_locales" ADD CONSTRAINT "research_publications_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_publications_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_publications" ADD CONSTRAINT "research_publications_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_publications" ADD CONSTRAINT "research_publications_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_publications_locales" ADD CONSTRAINT "research_publications_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_research_publications_v_version_tags" ADD CONSTRAINT "_research_publications_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_research_publications_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_research_publications_v_version_tags_locales" ADD CONSTRAINT "_research_publications_v_version_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_research_publications_v_version_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_research_publications_v" ADD CONSTRAINT "_research_publications_v_parent_id_research_publications_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."research_publications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_research_publications_v" ADD CONSTRAINT "_research_publications_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_research_publications_v" ADD CONSTRAINT "_research_publications_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_research_publications_v_locales" ADD CONSTRAINT "_research_publications_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_research_publications_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campus_life_highlights" ADD CONSTRAINT "campus_life_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campus_life"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campus_life_highlights_locales" ADD CONSTRAINT "campus_life_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campus_life_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campus_life_stats" ADD CONSTRAINT "campus_life_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campus_life"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campus_life_stats_locales" ADD CONSTRAINT "campus_life_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campus_life_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campus_life" ADD CONSTRAINT "campus_life_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campus_life_locales" ADD CONSTRAINT "campus_life_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campus_life"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campus_life_v_version_highlights" ADD CONSTRAINT "_campus_life_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campus_life_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campus_life_v_version_highlights_locales" ADD CONSTRAINT "_campus_life_v_version_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campus_life_v_version_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campus_life_v_version_stats" ADD CONSTRAINT "_campus_life_v_version_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campus_life_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campus_life_v_version_stats_locales" ADD CONSTRAINT "_campus_life_v_version_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campus_life_v_version_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campus_life_v" ADD CONSTRAINT "_campus_life_v_parent_id_campus_life_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."campus_life"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campus_life_v" ADD CONSTRAINT "_campus_life_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campus_life_v_locales" ADD CONSTRAINT "_campus_life_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campus_life_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offers_interest_highlights" ADD CONSTRAINT "offers_interest_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offers_interest_highlights_locales" ADD CONSTRAINT "offers_interest_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offers_interest_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers_locales" ADD CONSTRAINT "offers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_offers_v_version_interest_highlights" ADD CONSTRAINT "_offers_v_version_interest_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_offers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_offers_v_version_interest_highlights_locales" ADD CONSTRAINT "_offers_v_version_interest_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_offers_v_version_interest_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_offers_v" ADD CONSTRAINT "_offers_v_parent_id_offers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_offers_v" ADD CONSTRAINT "_offers_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_offers_v" ADD CONSTRAINT "_offers_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_offers_v" ADD CONSTRAINT "_offers_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_offers_v_locales" ADD CONSTRAINT "_offers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_offers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partners_locales" ADD CONSTRAINT "partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sliders" ADD CONSTRAINT "sliders_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sliders_locales" ADD CONSTRAINT "sliders_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sliders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sliders_rels" ADD CONSTRAINT "sliders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sliders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sliders_rels" ADD CONSTRAINT "sliders_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "student_affairs_documents" ADD CONSTRAINT "student_affairs_documents_file_id_private_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."private_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_affairs_documents_locales" ADD CONSTRAINT "student_affairs_documents_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."student_affairs_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_student_affairs_documents_v" ADD CONSTRAINT "_student_affairs_documents_v_parent_id_student_affairs_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."student_affairs_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_affairs_documents_v" ADD CONSTRAINT "_student_affairs_documents_v_version_file_id_private_media_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."private_media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_student_affairs_documents_v_locales" ADD CONSTRAINT "_student_affairs_documents_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_student_affairs_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements_locales" ADD CONSTRAINT "announcements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_parent_id_announcements_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_college_id_colleges_id_fk" FOREIGN KEY ("version_college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v_locales" ADD CONSTRAINT "_announcements_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admission_requirements_locales" ADD CONSTRAINT "admission_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_admission_requirements_v" ADD CONSTRAINT "_admission_requirements_v_parent_id_admission_requirements_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admission_requirements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admission_requirements_v" ADD CONSTRAINT "_admission_requirements_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_admission_requirements_v_locales" ADD CONSTRAINT "_admission_requirements_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_admission_requirements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox" ADD CONSTRAINT "forms_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox_locales" ADD CONSTRAINT "forms_blocks_checkbox_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_checkbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_email" ADD CONSTRAINT "forms_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_email_locales" ADD CONSTRAINT "forms_blocks_email_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_email"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_message" ADD CONSTRAINT "forms_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_message_locales" ADD CONSTRAINT "forms_blocks_message_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_message"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_number" ADD CONSTRAINT "forms_blocks_number_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_number_locales" ADD CONSTRAINT "forms_blocks_number_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_number"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select_options" ADD CONSTRAINT "forms_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select_options_locales" ADD CONSTRAINT "forms_blocks_select_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_select_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select" ADD CONSTRAINT "forms_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select_locales" ADD CONSTRAINT "forms_blocks_select_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_text" ADD CONSTRAINT "forms_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_text_locales" ADD CONSTRAINT "forms_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_textarea" ADD CONSTRAINT "forms_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_textarea_locales" ADD CONSTRAINT "forms_blocks_textarea_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_textarea"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_upload_mime_types" ADD CONSTRAINT "forms_blocks_upload_mime_types_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_upload"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_upload" ADD CONSTRAINT "forms_blocks_upload_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_upload_locales" ADD CONSTRAINT "forms_blocks_upload_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_upload"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_emails_locales" ADD CONSTRAINT "forms_emails_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_emails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_locales" ADD CONSTRAINT "forms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_submission_data" ADD CONSTRAINT "form_submissions_submission_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_submission_uploads" ADD CONSTRAINT "form_submissions_submission_uploads_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions_rels" ADD CONSTRAINT "form_submissions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_rels" ADD CONSTRAINT "form_submissions_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_colleges_fk" FOREIGN KEY ("colleges_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_faculty_members_fk" FOREIGN KEY ("faculty_members_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_centers_fk" FOREIGN KEY ("centers_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_offers_fk" FOREIGN KEY ("offers_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_campus_life_fk" FOREIGN KEY ("campus_life_id") REFERENCES "public"."campus_life"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_research_publications_fk" FOREIGN KEY ("research_publications_id") REFERENCES "public"."research_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_academic_programs_fk" FOREIGN KEY ("academic_programs_id") REFERENCES "public"."academic_programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_study_plans_fk" FOREIGN KEY ("study_plans_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roles_fk" FOREIGN KEY ("roles_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_navigation_menus_fk" FOREIGN KEY ("navigation_menus_id") REFERENCES "public"."navigation_menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_colleges_fk" FOREIGN KEY ("colleges_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_academic_departments_fk" FOREIGN KEY ("academic_departments_id") REFERENCES "public"."academic_departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_academic_programs_fk" FOREIGN KEY ("academic_programs_id") REFERENCES "public"."academic_programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faculty_members_fk" FOREIGN KEY ("faculty_members_id") REFERENCES "public"."faculty_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_join_requests_fk" FOREIGN KEY ("join_requests_id") REFERENCES "public"."join_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_requests_fk" FOREIGN KEY ("email_requests_id") REFERENCES "public"."email_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_study_plans_fk" FOREIGN KEY ("study_plans_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_private_media_fk" FOREIGN KEY ("private_media_id") REFERENCES "public"."private_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_centers_fk" FOREIGN KEY ("centers_id") REFERENCES "public"."centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_research_publications_fk" FOREIGN KEY ("research_publications_id") REFERENCES "public"."research_publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campus_life_fk" FOREIGN KEY ("campus_life_id") REFERENCES "public"."campus_life"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offers_fk" FOREIGN KEY ("offers_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sliders_fk" FOREIGN KEY ("sliders_id") REFERENCES "public"."sliders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_student_affairs_documents_fk" FOREIGN KEY ("student_affairs_documents_id") REFERENCES "public"."student_affairs_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admission_requirements_fk" FOREIGN KEY ("admission_requirements_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_footer_logo_id_media_id_fk" FOREIGN KEY ("footer_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_favicon_id_media_id_fk" FOREIGN KEY ("version_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_footer_logo_id_media_id_fk" FOREIGN KEY ("version_footer_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_team_members" ADD CONSTRAINT "about_page_team_members_member_image_id_media_id_fk" FOREIGN KEY ("member_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_team_members" ADD CONSTRAINT "about_page_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_team_members_locales" ADD CONSTRAINT "about_page_team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_intro_image_id_media_id_fk" FOREIGN KEY ("intro_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_president_image_id_media_id_fk" FOREIGN KEY ("president_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_locales" ADD CONSTRAINT "about_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_rels" ADD CONSTRAINT "about_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_rels" ADD CONSTRAINT "about_page_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_member_image_id_media_id_fk" FOREIGN KEY ("member_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_page_v_version_team_members" ADD CONSTRAINT "_about_page_v_version_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_page_v_version_team_members_locales" ADD CONSTRAINT "_about_page_v_version_team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_page_v_version_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_page_v" ADD CONSTRAINT "_about_page_v_version_intro_image_id_media_id_fk" FOREIGN KEY ("version_intro_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_page_v" ADD CONSTRAINT "_about_page_v_version_president_image_id_media_id_fk" FOREIGN KEY ("version_president_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_page_v_locales" ADD CONSTRAINT "_about_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_about_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_page_v_rels" ADD CONSTRAINT "_about_page_v_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_settings_locales" ADD CONSTRAINT "contact_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_settings_v_locales" ADD CONSTRAINT "_contact_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_settings_top_bar_items" ADD CONSTRAINT "navbar_settings_top_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_settings_top_bar_items_locales" ADD CONSTRAINT "navbar_settings_top_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar_settings_top_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_settings_rels" ADD CONSTRAINT "navbar_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navbar_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_settings_rels" ADD CONSTRAINT "navbar_settings_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_settings_v_version_top_bar_items" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_settings_v_version_top_bar_items_locales" ADD CONSTRAINT "_navbar_settings_v_version_top_bar_items_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_settings_v_version_top_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_navbar_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_settings_v_rels" ADD CONSTRAINT "_navbar_settings_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_settings_footer_items" ADD CONSTRAINT "footer_settings_footer_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_settings_footer_items_locales" ADD CONSTRAINT "footer_settings_footer_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_settings_footer_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_settings" ADD CONSTRAINT "footer_settings_footer_background_image_id_media_id_fk" FOREIGN KEY ("footer_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_settings" ADD CONSTRAINT "footer_settings_footer_background_video_id_media_id_fk" FOREIGN KEY ("footer_background_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_settings_locales" ADD CONSTRAINT "footer_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_settings_rels" ADD CONSTRAINT "footer_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."footer_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_settings_rels" ADD CONSTRAINT "footer_settings_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_settings_v_version_footer_items" ADD CONSTRAINT "_footer_settings_v_version_footer_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_settings_v_version_footer_items_locales" ADD CONSTRAINT "_footer_settings_v_version_footer_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_settings_v_version_footer_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_version_footer_background_image_id_media_id_fk" FOREIGN KEY ("version_footer_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_settings_v" ADD CONSTRAINT "_footer_settings_v_version_footer_background_video_id_media_id_fk" FOREIGN KEY ("version_footer_background_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_settings_v_locales" ADD CONSTRAINT "_footer_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_footer_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_settings_v_rels" ADD CONSTRAINT "_footer_settings_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");
  CREATE INDEX "users_college_scope_idx" ON "users" USING btree ("college_scope_id");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "roles_permissions_order_idx" ON "roles_permissions" USING btree ("_order");
  CREATE INDEX "roles_permissions_parent_id_idx" ON "roles_permissions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "roles_slug_idx" ON "roles" USING btree ("slug");
  CREATE INDEX "roles_updated_at_idx" ON "roles" USING btree ("updated_at");
  CREATE INDEX "roles_created_at_idx" ON "roles" USING btree ("created_at");
  CREATE UNIQUE INDEX "roles_locales_locale_parent_id_unique" ON "roles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_square_sizes_square_filename_idx" ON "media" USING btree ("sizes_square_filename");
  CREATE INDEX "media_sizes_small_sizes_small_filename_idx" ON "media" USING btree ("sizes_small_filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "media" USING btree ("sizes_medium_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_xlarge_sizes_xlarge_filename_idx" ON "media" USING btree ("sizes_xlarge_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_populated_authors_order_idx" ON "pages_populated_authors" USING btree ("_order");
  CREATE INDEX "pages_populated_authors_parent_id_idx" ON "pages_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "pages_hero_links_order_idx" ON "pages_hero_links" USING btree ("_order");
  CREATE INDEX "pages_hero_links_parent_id_idx" ON "pages_hero_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_stats_items_order_idx" ON "pages_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_items_parent_id_idx" ON "pages_blocks_stats_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_stats_items_locales_locale_parent_id_unique" ON "pages_blocks_stats_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_colleges_grid_order_idx" ON "pages_blocks_colleges_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_colleges_grid_parent_id_idx" ON "pages_blocks_colleges_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_colleges_grid_path_idx" ON "pages_blocks_colleges_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_colleges_grid_locales_locale_parent_id_unique" ON "pages_blocks_colleges_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_news_grid_order_idx" ON "pages_blocks_news_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_news_grid_parent_id_idx" ON "pages_blocks_news_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_news_grid_path_idx" ON "pages_blocks_news_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_news_grid_locales_locale_parent_id_unique" ON "pages_blocks_news_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_events_grid_order_idx" ON "pages_blocks_events_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_events_grid_parent_id_idx" ON "pages_blocks_events_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_events_grid_path_idx" ON "pages_blocks_events_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_events_grid_locales_locale_parent_id_unique" ON "pages_blocks_events_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_blog_grid_order_idx" ON "pages_blocks_blog_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_blog_grid_parent_id_idx" ON "pages_blocks_blog_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_blog_grid_path_idx" ON "pages_blocks_blog_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_blog_grid_locales_locale_parent_id_unique" ON "pages_blocks_blog_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_team_members_order_idx" ON "pages_blocks_team_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_members_parent_id_idx" ON "pages_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_members_path_idx" ON "pages_blocks_team_members" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_team_members_locales_locale_parent_id_unique" ON "pages_blocks_team_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_partners_partners_order_idx" ON "pages_blocks_partners_partners" USING btree ("_order");
  CREATE INDEX "pages_blocks_partners_partners_parent_id_idx" ON "pages_blocks_partners_partners" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_partners_partners_logo_idx" ON "pages_blocks_partners_partners" USING btree ("logo_id");
  CREATE UNIQUE INDEX "pages_blocks_partners_partners_locales_locale_parent_id_uniq" ON "pages_blocks_partners_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_partners_order_idx" ON "pages_blocks_partners" USING btree ("_order");
  CREATE INDEX "pages_blocks_partners_parent_id_idx" ON "pages_blocks_partners" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_partners_path_idx" ON "pages_blocks_partners" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_partners_locales_locale_parent_id_unique" ON "pages_blocks_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_admission_c_t_a_order_idx" ON "pages_blocks_admission_c_t_a" USING btree ("_order");
  CREATE INDEX "pages_blocks_admission_c_t_a_parent_id_idx" ON "pages_blocks_admission_c_t_a" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_admission_c_t_a_path_idx" ON "pages_blocks_admission_c_t_a" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_admission_c_t_a_locales_locale_parent_id_unique" ON "pages_blocks_admission_c_t_a_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_info_order_idx" ON "pages_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_info_parent_id_idx" ON "pages_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_info_path_idx" ON "pages_blocks_contact_info" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_contact_info_locales_locale_parent_id_unique" ON "pages_blocks_contact_info_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cta_locales_locale_parent_id_unique" ON "pages_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_announcements_order_idx" ON "pages_blocks_announcements" USING btree ("_order");
  CREATE INDEX "pages_blocks_announcements_parent_id_idx" ON "pages_blocks_announcements" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_announcements_path_idx" ON "pages_blocks_announcements" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_announcements_locales_locale_parent_id_unique" ON "pages_blocks_announcements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_campus_life_grid_order_idx" ON "pages_blocks_campus_life_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_campus_life_grid_parent_id_idx" ON "pages_blocks_campus_life_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_campus_life_grid_path_idx" ON "pages_blocks_campus_life_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_campus_life_grid_locales_locale_parent_id_uniqu" ON "pages_blocks_campus_life_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_centers_grid_order_idx" ON "pages_blocks_centers_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_centers_grid_parent_id_idx" ON "pages_blocks_centers_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_centers_grid_path_idx" ON "pages_blocks_centers_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_centers_grid_locales_locale_parent_id_unique" ON "pages_blocks_centers_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_offers_grid_order_idx" ON "pages_blocks_offers_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_offers_grid_parent_id_idx" ON "pages_blocks_offers_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_offers_grid_path_idx" ON "pages_blocks_offers_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_offers_grid_locales_locale_parent_id_unique" ON "pages_blocks_offers_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_projects_grid_order_idx" ON "pages_blocks_projects_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_projects_grid_parent_id_idx" ON "pages_blocks_projects_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_projects_grid_path_idx" ON "pages_blocks_projects_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_projects_grid_locales_locale_parent_id_unique" ON "pages_blocks_projects_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_research_grid_order_idx" ON "pages_blocks_research_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_research_grid_parent_id_idx" ON "pages_blocks_research_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_research_grid_path_idx" ON "pages_blocks_research_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_research_grid_locales_locale_parent_id_unique" ON "pages_blocks_research_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_study_plans_grid_order_idx" ON "pages_blocks_study_plans_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_study_plans_grid_parent_id_idx" ON "pages_blocks_study_plans_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_study_plans_grid_path_idx" ON "pages_blocks_study_plans_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_study_plans_grid_locales_locale_parent_id_uniqu" ON "pages_blocks_study_plans_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_video_order_idx" ON "pages_blocks_video" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_parent_id_idx" ON "pages_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_path_idx" ON "pages_blocks_video" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_video_file_idx" ON "pages_blocks_video" USING btree ("video_file_id");
  CREATE INDEX "pages_blocks_video_poster_image_idx" ON "pages_blocks_video" USING btree ("poster_image_id");
  CREATE UNIQUE INDEX "pages_blocks_video_locales_locale_parent_id_unique" ON "pages_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faculty_members_order_idx" ON "pages_blocks_faculty_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_faculty_members_parent_id_idx" ON "pages_blocks_faculty_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faculty_members_path_idx" ON "pages_blocks_faculty_members" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faculty_members_locales_locale_parent_id_unique" ON "pages_blocks_faculty_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_programs_grid_order_idx" ON "pages_blocks_programs_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_programs_grid_parent_id_idx" ON "pages_blocks_programs_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_programs_grid_path_idx" ON "pages_blocks_programs_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_programs_grid_college_filter_idx" ON "pages_blocks_programs_grid" USING btree ("college_filter_id");
  CREATE UNIQUE INDEX "pages_blocks_programs_grid_locales_locale_parent_id_unique" ON "pages_blocks_programs_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_slider_order_idx" ON "pages_blocks_slider" USING btree ("_order");
  CREATE INDEX "pages_blocks_slider_parent_id_idx" ON "pages_blocks_slider" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_slider_path_idx" ON "pages_blocks_slider" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_slider_locales_locale_parent_id_unique" ON "pages_blocks_slider_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_links_links_order_idx" ON "pages_blocks_links_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_links_links_parent_id_idx" ON "pages_blocks_links_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_links_links_locales_locale_parent_id_unique" ON "pages_blocks_links_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_links_order_idx" ON "pages_blocks_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_links_parent_id_idx" ON "pages_blocks_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_links_path_idx" ON "pages_blocks_links" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_links_locales_locale_parent_id_unique" ON "pages_blocks_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_author_idx" ON "pages" USING btree ("author_id");
  CREATE INDEX "pages_hero_hero_media_idx" ON "pages" USING btree ("hero_media_id");
  CREATE INDEX "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_pages_id_idx" ON "pages_rels" USING btree ("pages_id");
  CREATE INDEX "pages_rels_colleges_id_idx" ON "pages_rels" USING btree ("colleges_id");
  CREATE INDEX "pages_rels_team_members_id_idx" ON "pages_rels" USING btree ("team_members_id");
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id");
  CREATE INDEX "pages_rels_faculty_members_id_idx" ON "pages_rels" USING btree ("faculty_members_id");
  CREATE INDEX "_pages_v_version_populated_authors_order_idx" ON "_pages_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_pages_v_version_populated_authors_parent_id_idx" ON "_pages_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_hero_links_order_idx" ON "_pages_v_version_hero_links" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_links_parent_id_idx" ON "_pages_v_version_hero_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_items_order_idx" ON "_pages_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_items_parent_id_idx" ON "_pages_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_stats_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_stats_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_colleges_grid_order_idx" ON "_pages_v_blocks_colleges_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_colleges_grid_parent_id_idx" ON "_pages_v_blocks_colleges_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_colleges_grid_path_idx" ON "_pages_v_blocks_colleges_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_colleges_grid_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_colleges_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_news_grid_order_idx" ON "_pages_v_blocks_news_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_news_grid_parent_id_idx" ON "_pages_v_blocks_news_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_news_grid_path_idx" ON "_pages_v_blocks_news_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_news_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_news_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_events_grid_order_idx" ON "_pages_v_blocks_events_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_events_grid_parent_id_idx" ON "_pages_v_blocks_events_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_events_grid_path_idx" ON "_pages_v_blocks_events_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_events_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_events_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_blog_grid_order_idx" ON "_pages_v_blocks_blog_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_blog_grid_parent_id_idx" ON "_pages_v_blocks_blog_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_blog_grid_path_idx" ON "_pages_v_blocks_blog_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_blog_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_blog_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_team_members_order_idx" ON "_pages_v_blocks_team_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_members_parent_id_idx" ON "_pages_v_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_members_path_idx" ON "_pages_v_blocks_team_members" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_team_members_locales_locale_parent_id_unique" ON "_pages_v_blocks_team_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_partners_order_idx" ON "_pages_v_blocks_partners_partners" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_partners_partners_parent_id_idx" ON "_pages_v_blocks_partners_partners" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_partners_logo_idx" ON "_pages_v_blocks_partners_partners" USING btree ("logo_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_partners_partners_locales_locale_parent_id_u" ON "_pages_v_blocks_partners_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_order_idx" ON "_pages_v_blocks_partners" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_partners_parent_id_idx" ON "_pages_v_blocks_partners" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_partners_path_idx" ON "_pages_v_blocks_partners" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_partners_locales_locale_parent_id_unique" ON "_pages_v_blocks_partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_admission_c_t_a_order_idx" ON "_pages_v_blocks_admission_c_t_a" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_admission_c_t_a_parent_id_idx" ON "_pages_v_blocks_admission_c_t_a" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_admission_c_t_a_path_idx" ON "_pages_v_blocks_admission_c_t_a" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_admission_c_t_a_locales_locale_parent_id_uni" ON "_pages_v_blocks_admission_c_t_a_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_info_order_idx" ON "_pages_v_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_info_parent_id_idx" ON "_pages_v_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_info_path_idx" ON "_pages_v_blocks_contact_info" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_info_locales_locale_parent_id_unique" ON "_pages_v_blocks_contact_info_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_locales_locale_parent_id_unique" ON "_pages_v_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_announcements_order_idx" ON "_pages_v_blocks_announcements" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_announcements_parent_id_idx" ON "_pages_v_blocks_announcements" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_announcements_path_idx" ON "_pages_v_blocks_announcements" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_announcements_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_announcements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_campus_life_grid_order_idx" ON "_pages_v_blocks_campus_life_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_campus_life_grid_parent_id_idx" ON "_pages_v_blocks_campus_life_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_campus_life_grid_path_idx" ON "_pages_v_blocks_campus_life_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_campus_life_grid_locales_locale_parent_id_un" ON "_pages_v_blocks_campus_life_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_centers_grid_order_idx" ON "_pages_v_blocks_centers_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_centers_grid_parent_id_idx" ON "_pages_v_blocks_centers_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_centers_grid_path_idx" ON "_pages_v_blocks_centers_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_centers_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_centers_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_offers_grid_order_idx" ON "_pages_v_blocks_offers_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_offers_grid_parent_id_idx" ON "_pages_v_blocks_offers_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_offers_grid_path_idx" ON "_pages_v_blocks_offers_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_offers_grid_locales_locale_parent_id_unique" ON "_pages_v_blocks_offers_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_projects_grid_order_idx" ON "_pages_v_blocks_projects_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_projects_grid_parent_id_idx" ON "_pages_v_blocks_projects_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_projects_grid_path_idx" ON "_pages_v_blocks_projects_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_projects_grid_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_projects_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_research_grid_order_idx" ON "_pages_v_blocks_research_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_research_grid_parent_id_idx" ON "_pages_v_blocks_research_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_research_grid_path_idx" ON "_pages_v_blocks_research_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_research_grid_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_research_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_study_plans_grid_order_idx" ON "_pages_v_blocks_study_plans_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_study_plans_grid_parent_id_idx" ON "_pages_v_blocks_study_plans_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_study_plans_grid_path_idx" ON "_pages_v_blocks_study_plans_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_study_plans_grid_locales_locale_parent_id_un" ON "_pages_v_blocks_study_plans_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_video_order_idx" ON "_pages_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_parent_id_idx" ON "_pages_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_path_idx" ON "_pages_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_video_video_file_idx" ON "_pages_v_blocks_video" USING btree ("video_file_id");
  CREATE INDEX "_pages_v_blocks_video_poster_image_idx" ON "_pages_v_blocks_video" USING btree ("poster_image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_video_locales_locale_parent_id_unique" ON "_pages_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faculty_members_order_idx" ON "_pages_v_blocks_faculty_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faculty_members_parent_id_idx" ON "_pages_v_blocks_faculty_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faculty_members_path_idx" ON "_pages_v_blocks_faculty_members" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faculty_members_locales_locale_parent_id_uni" ON "_pages_v_blocks_faculty_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_programs_grid_order_idx" ON "_pages_v_blocks_programs_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_programs_grid_parent_id_idx" ON "_pages_v_blocks_programs_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_programs_grid_path_idx" ON "_pages_v_blocks_programs_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_programs_grid_college_filter_idx" ON "_pages_v_blocks_programs_grid" USING btree ("college_filter_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_programs_grid_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_programs_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_slider_order_idx" ON "_pages_v_blocks_slider" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_slider_parent_id_idx" ON "_pages_v_blocks_slider" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_slider_path_idx" ON "_pages_v_blocks_slider" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_slider_locales_locale_parent_id_unique" ON "_pages_v_blocks_slider_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_links_links_order_idx" ON "_pages_v_blocks_links_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_links_links_parent_id_idx" ON "_pages_v_blocks_links_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_links_links_locales_locale_parent_id_unique" ON "_pages_v_blocks_links_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_links_order_idx" ON "_pages_v_blocks_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_links_parent_id_idx" ON "_pages_v_blocks_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_links_path_idx" ON "_pages_v_blocks_links" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_links_locales_locale_parent_id_unique" ON "_pages_v_blocks_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_author_idx" ON "_pages_v" USING btree ("version_author_id");
  CREATE INDEX "_pages_v_version_hero_version_hero_media_idx" ON "_pages_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_pages_v_version_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_pages_id_idx" ON "_pages_v_rels" USING btree ("pages_id");
  CREATE INDEX "_pages_v_rels_colleges_id_idx" ON "_pages_v_rels" USING btree ("colleges_id");
  CREATE INDEX "_pages_v_rels_team_members_id_idx" ON "_pages_v_rels" USING btree ("team_members_id");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_rels_faculty_members_id_idx" ON "_pages_v_rels" USING btree ("faculty_members_id");
  CREATE INDEX "navigation_menus_items_children_order_idx" ON "navigation_menus_items_children" USING btree ("_order");
  CREATE INDEX "navigation_menus_items_children_parent_id_idx" ON "navigation_menus_items_children" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_menus_items_children_locales_locale_parent_id_uni" ON "navigation_menus_items_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_menus_items_order_idx" ON "navigation_menus_items" USING btree ("_order");
  CREATE INDEX "navigation_menus_items_parent_id_idx" ON "navigation_menus_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_menus_items_locales_locale_parent_id_unique" ON "navigation_menus_items_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "navigation_menus_key_idx" ON "navigation_menus" USING btree ("key");
  CREATE INDEX "navigation_menus_updated_at_idx" ON "navigation_menus" USING btree ("updated_at");
  CREATE INDEX "navigation_menus_created_at_idx" ON "navigation_menus" USING btree ("created_at");
  CREATE INDEX "news_populated_authors_order_idx" ON "news_populated_authors" USING btree ("_order");
  CREATE INDEX "news_populated_authors_parent_id_idx" ON "news_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "news_tags_order_idx" ON "news_tags" USING btree ("_order");
  CREATE INDEX "news_tags_parent_id_idx" ON "news_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "news_tags_locales_locale_parent_id_unique" ON "news_tags_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_college_idx" ON "news" USING btree ("college_id");
  CREATE INDEX "news_author_idx" ON "news" USING btree ("author_id");
  CREATE INDEX "news_category_idx" ON "news" USING btree ("category_id");
  CREATE INDEX "news_image_idx" ON "news" USING btree ("image_id");
  CREATE INDEX "news_featured_image_idx" ON "news" USING btree ("featured_image_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "news_meta_meta_image_idx" ON "news_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "news_locales_locale_parent_id_unique" ON "news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_news_v_version_populated_authors_order_idx" ON "_news_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_news_v_version_populated_authors_parent_id_idx" ON "_news_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_news_v_version_tags_order_idx" ON "_news_v_version_tags" USING btree ("_order");
  CREATE INDEX "_news_v_version_tags_parent_id_idx" ON "_news_v_version_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_news_v_version_tags_locales_locale_parent_id_unique" ON "_news_v_version_tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_college_idx" ON "_news_v" USING btree ("version_college_id");
  CREATE INDEX "_news_v_version_version_author_idx" ON "_news_v" USING btree ("version_author_id");
  CREATE INDEX "_news_v_version_version_category_idx" ON "_news_v" USING btree ("version_category_id");
  CREATE INDEX "_news_v_version_version_image_idx" ON "_news_v" USING btree ("version_image_id");
  CREATE INDEX "_news_v_version_version_featured_image_idx" ON "_news_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_snapshot_idx" ON "_news_v" USING btree ("snapshot");
  CREATE INDEX "_news_v_published_locale_idx" ON "_news_v" USING btree ("published_locale");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");
  CREATE INDEX "_news_v_version_meta_version_meta_image_idx" ON "_news_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_news_v_locales_locale_parent_id_unique" ON "_news_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "colleges_slug_idx" ON "colleges" USING btree ("slug");
  CREATE INDEX "colleges_dean_image_idx" ON "colleges" USING btree ("dean_image_id");
  CREATE INDEX "colleges_image_idx" ON "colleges" USING btree ("image_id");
  CREATE INDEX "colleges_updated_at_idx" ON "colleges" USING btree ("updated_at");
  CREATE INDEX "colleges_created_at_idx" ON "colleges" USING btree ("created_at");
  CREATE INDEX "colleges__status_idx" ON "colleges" USING btree ("_status");
  CREATE INDEX "colleges_meta_meta_image_idx" ON "colleges_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "colleges_locales_locale_parent_id_unique" ON "colleges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_colleges_v_parent_idx" ON "_colleges_v" USING btree ("parent_id");
  CREATE INDEX "_colleges_v_version_version_slug_idx" ON "_colleges_v" USING btree ("version_slug");
  CREATE INDEX "_colleges_v_version_version_dean_image_idx" ON "_colleges_v" USING btree ("version_dean_image_id");
  CREATE INDEX "_colleges_v_version_version_image_idx" ON "_colleges_v" USING btree ("version_image_id");
  CREATE INDEX "_colleges_v_version_version_updated_at_idx" ON "_colleges_v" USING btree ("version_updated_at");
  CREATE INDEX "_colleges_v_version_version_created_at_idx" ON "_colleges_v" USING btree ("version_created_at");
  CREATE INDEX "_colleges_v_version_version__status_idx" ON "_colleges_v" USING btree ("version__status");
  CREATE INDEX "_colleges_v_created_at_idx" ON "_colleges_v" USING btree ("created_at");
  CREATE INDEX "_colleges_v_updated_at_idx" ON "_colleges_v" USING btree ("updated_at");
  CREATE INDEX "_colleges_v_snapshot_idx" ON "_colleges_v" USING btree ("snapshot");
  CREATE INDEX "_colleges_v_published_locale_idx" ON "_colleges_v" USING btree ("published_locale");
  CREATE INDEX "_colleges_v_latest_idx" ON "_colleges_v" USING btree ("latest");
  CREATE INDEX "_colleges_v_autosave_idx" ON "_colleges_v" USING btree ("autosave");
  CREATE INDEX "_colleges_v_version_meta_version_meta_image_idx" ON "_colleges_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_colleges_v_locales_locale_parent_id_unique" ON "_colleges_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "academic_departments_slug_idx" ON "academic_departments" USING btree ("slug");
  CREATE INDEX "academic_departments_college_idx" ON "academic_departments" USING btree ("college_id");
  CREATE INDEX "academic_departments_head_of_department_idx" ON "academic_departments" USING btree ("head_of_department_id");
  CREATE INDEX "academic_departments_updated_at_idx" ON "academic_departments" USING btree ("updated_at");
  CREATE INDEX "academic_departments_created_at_idx" ON "academic_departments" USING btree ("created_at");
  CREATE INDEX "academic_departments__status_idx" ON "academic_departments" USING btree ("_status");
  CREATE UNIQUE INDEX "academic_departments_locales_locale_parent_id_unique" ON "academic_departments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_academic_departments_v_parent_idx" ON "_academic_departments_v" USING btree ("parent_id");
  CREATE INDEX "_academic_departments_v_version_version_slug_idx" ON "_academic_departments_v" USING btree ("version_slug");
  CREATE INDEX "_academic_departments_v_version_version_college_idx" ON "_academic_departments_v" USING btree ("version_college_id");
  CREATE INDEX "_academic_departments_v_version_version_head_of_departme_idx" ON "_academic_departments_v" USING btree ("version_head_of_department_id");
  CREATE INDEX "_academic_departments_v_version_version_updated_at_idx" ON "_academic_departments_v" USING btree ("version_updated_at");
  CREATE INDEX "_academic_departments_v_version_version_created_at_idx" ON "_academic_departments_v" USING btree ("version_created_at");
  CREATE INDEX "_academic_departments_v_version_version__status_idx" ON "_academic_departments_v" USING btree ("version__status");
  CREATE INDEX "_academic_departments_v_created_at_idx" ON "_academic_departments_v" USING btree ("created_at");
  CREATE INDEX "_academic_departments_v_updated_at_idx" ON "_academic_departments_v" USING btree ("updated_at");
  CREATE INDEX "_academic_departments_v_snapshot_idx" ON "_academic_departments_v" USING btree ("snapshot");
  CREATE INDEX "_academic_departments_v_published_locale_idx" ON "_academic_departments_v" USING btree ("published_locale");
  CREATE INDEX "_academic_departments_v_latest_idx" ON "_academic_departments_v" USING btree ("latest");
  CREATE INDEX "_academic_departments_v_autosave_idx" ON "_academic_departments_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_academic_departments_v_locales_locale_parent_id_unique" ON "_academic_departments_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "academic_programs_slug_idx" ON "academic_programs" USING btree ("slug");
  CREATE INDEX "academic_programs_college_idx" ON "academic_programs" USING btree ("college_id");
  CREATE INDEX "academic_programs_department_idx" ON "academic_programs" USING btree ("department_id");
  CREATE INDEX "academic_programs_image_idx" ON "academic_programs" USING btree ("image_id");
  CREATE INDEX "academic_programs_updated_at_idx" ON "academic_programs" USING btree ("updated_at");
  CREATE INDEX "academic_programs_created_at_idx" ON "academic_programs" USING btree ("created_at");
  CREATE INDEX "academic_programs__status_idx" ON "academic_programs" USING btree ("_status");
  CREATE INDEX "academic_programs_meta_meta_image_idx" ON "academic_programs_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "academic_programs_locales_locale_parent_id_unique" ON "academic_programs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_academic_programs_v_parent_idx" ON "_academic_programs_v" USING btree ("parent_id");
  CREATE INDEX "_academic_programs_v_version_version_slug_idx" ON "_academic_programs_v" USING btree ("version_slug");
  CREATE INDEX "_academic_programs_v_version_version_college_idx" ON "_academic_programs_v" USING btree ("version_college_id");
  CREATE INDEX "_academic_programs_v_version_version_department_idx" ON "_academic_programs_v" USING btree ("version_department_id");
  CREATE INDEX "_academic_programs_v_version_version_image_idx" ON "_academic_programs_v" USING btree ("version_image_id");
  CREATE INDEX "_academic_programs_v_version_version_updated_at_idx" ON "_academic_programs_v" USING btree ("version_updated_at");
  CREATE INDEX "_academic_programs_v_version_version_created_at_idx" ON "_academic_programs_v" USING btree ("version_created_at");
  CREATE INDEX "_academic_programs_v_version_version__status_idx" ON "_academic_programs_v" USING btree ("version__status");
  CREATE INDEX "_academic_programs_v_created_at_idx" ON "_academic_programs_v" USING btree ("created_at");
  CREATE INDEX "_academic_programs_v_updated_at_idx" ON "_academic_programs_v" USING btree ("updated_at");
  CREATE INDEX "_academic_programs_v_snapshot_idx" ON "_academic_programs_v" USING btree ("snapshot");
  CREATE INDEX "_academic_programs_v_published_locale_idx" ON "_academic_programs_v" USING btree ("published_locale");
  CREATE INDEX "_academic_programs_v_latest_idx" ON "_academic_programs_v" USING btree ("latest");
  CREATE INDEX "_academic_programs_v_autosave_idx" ON "_academic_programs_v" USING btree ("autosave");
  CREATE INDEX "_academic_programs_v_version_meta_version_meta_image_idx" ON "_academic_programs_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_academic_programs_v_locales_locale_parent_id_unique" ON "_academic_programs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_education_order_idx" ON "faculty_members_education" USING btree ("_order");
  CREATE INDEX "faculty_members_education_parent_id_idx" ON "faculty_members_education" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faculty_members_education_locales_locale_parent_id_unique" ON "faculty_members_education_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_experience_order_idx" ON "faculty_members_experience" USING btree ("_order");
  CREATE INDEX "faculty_members_experience_parent_id_idx" ON "faculty_members_experience" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faculty_members_experience_locales_locale_parent_id_unique" ON "faculty_members_experience_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_publications_order_idx" ON "faculty_members_publications" USING btree ("_order");
  CREATE INDEX "faculty_members_publications_parent_id_idx" ON "faculty_members_publications" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faculty_members_publications_locales_locale_parent_id_unique" ON "faculty_members_publications_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_courses_order_idx" ON "faculty_members_courses" USING btree ("_order");
  CREATE INDEX "faculty_members_courses_parent_id_idx" ON "faculty_members_courses" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faculty_members_courses_locales_locale_parent_id_unique" ON "faculty_members_courses_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_skills_order_idx" ON "faculty_members_skills" USING btree ("_order");
  CREATE INDEX "faculty_members_skills_parent_id_idx" ON "faculty_members_skills" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "faculty_members_skills_locales_locale_parent_id_unique" ON "faculty_members_skills_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "faculty_members_slug_idx" ON "faculty_members" USING btree ("slug");
  CREATE INDEX "faculty_members_college_idx" ON "faculty_members" USING btree ("college_id");
  CREATE INDEX "faculty_members_department_idx" ON "faculty_members" USING btree ("department_id");
  CREATE INDEX "faculty_members_photo_idx" ON "faculty_members" USING btree ("photo_id");
  CREATE INDEX "faculty_members_updated_at_idx" ON "faculty_members" USING btree ("updated_at");
  CREATE INDEX "faculty_members_created_at_idx" ON "faculty_members" USING btree ("created_at");
  CREATE INDEX "faculty_members__status_idx" ON "faculty_members" USING btree ("_status");
  CREATE INDEX "faculty_members_meta_meta_image_idx" ON "faculty_members_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "faculty_members_locales_locale_parent_id_unique" ON "faculty_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faculty_members_rels_order_idx" ON "faculty_members_rels" USING btree ("order");
  CREATE INDEX "faculty_members_rels_parent_idx" ON "faculty_members_rels" USING btree ("parent_id");
  CREATE INDEX "faculty_members_rels_path_idx" ON "faculty_members_rels" USING btree ("path");
  CREATE INDEX "faculty_members_rels_academic_programs_id_idx" ON "faculty_members_rels" USING btree ("academic_programs_id");
  CREATE INDEX "_faculty_members_v_version_education_order_idx" ON "_faculty_members_v_version_education" USING btree ("_order");
  CREATE INDEX "_faculty_members_v_version_education_parent_id_idx" ON "_faculty_members_v_version_education" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_faculty_members_v_version_education_locales_locale_parent_i" ON "_faculty_members_v_version_education_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_version_experience_order_idx" ON "_faculty_members_v_version_experience" USING btree ("_order");
  CREATE INDEX "_faculty_members_v_version_experience_parent_id_idx" ON "_faculty_members_v_version_experience" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_faculty_members_v_version_experience_locales_locale_parent_" ON "_faculty_members_v_version_experience_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_version_publications_order_idx" ON "_faculty_members_v_version_publications" USING btree ("_order");
  CREATE INDEX "_faculty_members_v_version_publications_parent_id_idx" ON "_faculty_members_v_version_publications" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_faculty_members_v_version_publications_locales_locale_paren" ON "_faculty_members_v_version_publications_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_version_courses_order_idx" ON "_faculty_members_v_version_courses" USING btree ("_order");
  CREATE INDEX "_faculty_members_v_version_courses_parent_id_idx" ON "_faculty_members_v_version_courses" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_faculty_members_v_version_courses_locales_locale_parent_id_" ON "_faculty_members_v_version_courses_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_version_skills_order_idx" ON "_faculty_members_v_version_skills" USING btree ("_order");
  CREATE INDEX "_faculty_members_v_version_skills_parent_id_idx" ON "_faculty_members_v_version_skills" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_faculty_members_v_version_skills_locales_locale_parent_id_u" ON "_faculty_members_v_version_skills_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_parent_idx" ON "_faculty_members_v" USING btree ("parent_id");
  CREATE INDEX "_faculty_members_v_version_version_slug_idx" ON "_faculty_members_v" USING btree ("version_slug");
  CREATE INDEX "_faculty_members_v_version_version_college_idx" ON "_faculty_members_v" USING btree ("version_college_id");
  CREATE INDEX "_faculty_members_v_version_version_department_idx" ON "_faculty_members_v" USING btree ("version_department_id");
  CREATE INDEX "_faculty_members_v_version_version_photo_idx" ON "_faculty_members_v" USING btree ("version_photo_id");
  CREATE INDEX "_faculty_members_v_version_version_updated_at_idx" ON "_faculty_members_v" USING btree ("version_updated_at");
  CREATE INDEX "_faculty_members_v_version_version_created_at_idx" ON "_faculty_members_v" USING btree ("version_created_at");
  CREATE INDEX "_faculty_members_v_version_version__status_idx" ON "_faculty_members_v" USING btree ("version__status");
  CREATE INDEX "_faculty_members_v_created_at_idx" ON "_faculty_members_v" USING btree ("created_at");
  CREATE INDEX "_faculty_members_v_updated_at_idx" ON "_faculty_members_v" USING btree ("updated_at");
  CREATE INDEX "_faculty_members_v_snapshot_idx" ON "_faculty_members_v" USING btree ("snapshot");
  CREATE INDEX "_faculty_members_v_published_locale_idx" ON "_faculty_members_v" USING btree ("published_locale");
  CREATE INDEX "_faculty_members_v_latest_idx" ON "_faculty_members_v" USING btree ("latest");
  CREATE INDEX "_faculty_members_v_autosave_idx" ON "_faculty_members_v" USING btree ("autosave");
  CREATE INDEX "_faculty_members_v_version_meta_version_meta_image_idx" ON "_faculty_members_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_faculty_members_v_locales_locale_parent_id_unique" ON "_faculty_members_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faculty_members_v_rels_order_idx" ON "_faculty_members_v_rels" USING btree ("order");
  CREATE INDEX "_faculty_members_v_rels_parent_idx" ON "_faculty_members_v_rels" USING btree ("parent_id");
  CREATE INDEX "_faculty_members_v_rels_path_idx" ON "_faculty_members_v_rels" USING btree ("path");
  CREATE INDEX "_faculty_members_v_rels_academic_programs_id_idx" ON "_faculty_members_v_rels" USING btree ("academic_programs_id");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "join_requests_submission_key_idx" ON "join_requests" USING btree ("submission_key");
  CREATE INDEX "join_requests_desired_college_idx" ON "join_requests" USING btree ("desired_college_id");
  CREATE INDEX "join_requests_desired_program_idx" ON "join_requests" USING btree ("desired_program_id");
  CREATE INDEX "join_requests_high_school_document_idx" ON "join_requests" USING btree ("high_school_document_id");
  CREATE INDEX "join_requests_id_document_idx" ON "join_requests" USING btree ("id_document_id");
  CREATE INDEX "join_requests_personal_photo_idx" ON "join_requests" USING btree ("personal_photo_id");
  CREATE INDEX "join_requests_updated_at_idx" ON "join_requests" USING btree ("updated_at");
  CREATE INDEX "join_requests_created_at_idx" ON "join_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_college_idx" ON "events" USING btree ("college_id");
  CREATE INDEX "events_category_idx" ON "events" USING btree ("category_id");
  CREATE INDEX "events_image_idx" ON "events" USING btree ("image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "events_meta_meta_image_idx" ON "events_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_college_idx" ON "_events_v" USING btree ("version_college_id");
  CREATE INDEX "_events_v_version_version_category_idx" ON "_events_v" USING btree ("version_category_id");
  CREATE INDEX "_events_v_version_version_image_idx" ON "_events_v" USING btree ("version_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_snapshot_idx" ON "_events_v" USING btree ("snapshot");
  CREATE INDEX "_events_v_published_locale_idx" ON "_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_autosave_idx" ON "_events_v" USING btree ("autosave");
  CREATE INDEX "_events_v_version_meta_version_meta_image_idx" ON "_events_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_events_v_locales_locale_parent_id_unique" ON "_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "blog_posts_populated_authors_order_idx" ON "blog_posts_populated_authors" USING btree ("_order");
  CREATE INDEX "blog_posts_populated_authors_parent_id_idx" ON "blog_posts_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "blog_posts_tags_order_idx" ON "blog_posts_tags" USING btree ("_order");
  CREATE INDEX "blog_posts_tags_parent_id_idx" ON "blog_posts_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_posts_tags_locales_locale_parent_id_unique" ON "blog_posts_tags_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");
  CREATE INDEX "blog_posts_author_avatar_idx" ON "blog_posts" USING btree ("author_avatar_id");
  CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category_id");
  CREATE INDEX "blog_posts_image_idx" ON "blog_posts" USING btree ("image_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
  CREATE INDEX "blog_posts__status_idx" ON "blog_posts" USING btree ("_status");
  CREATE INDEX "blog_posts_meta_meta_image_idx" ON "blog_posts_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "blog_posts_locales_locale_parent_id_unique" ON "blog_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_blog_posts_v_version_populated_authors_order_idx" ON "_blog_posts_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_populated_authors_parent_id_idx" ON "_blog_posts_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_blog_posts_v_version_tags_order_idx" ON "_blog_posts_v_version_tags" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_tags_parent_id_idx" ON "_blog_posts_v_version_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_blog_posts_v_version_tags_locales_locale_parent_id_unique" ON "_blog_posts_v_version_tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_blog_posts_v_parent_idx" ON "_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_version_version_slug_idx" ON "_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX "_blog_posts_v_version_version_author_idx" ON "_blog_posts_v" USING btree ("version_author_id");
  CREATE INDEX "_blog_posts_v_version_version_author_avatar_idx" ON "_blog_posts_v" USING btree ("version_author_avatar_id");
  CREATE INDEX "_blog_posts_v_version_version_category_idx" ON "_blog_posts_v" USING btree ("version_category_id");
  CREATE INDEX "_blog_posts_v_version_version_image_idx" ON "_blog_posts_v" USING btree ("version_image_id");
  CREATE INDEX "_blog_posts_v_version_version_updated_at_idx" ON "_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_posts_v_version_version_created_at_idx" ON "_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_posts_v_version_version__status_idx" ON "_blog_posts_v" USING btree ("version__status");
  CREATE INDEX "_blog_posts_v_created_at_idx" ON "_blog_posts_v" USING btree ("created_at");
  CREATE INDEX "_blog_posts_v_updated_at_idx" ON "_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX "_blog_posts_v_snapshot_idx" ON "_blog_posts_v" USING btree ("snapshot");
  CREATE INDEX "_blog_posts_v_published_locale_idx" ON "_blog_posts_v" USING btree ("published_locale");
  CREATE INDEX "_blog_posts_v_latest_idx" ON "_blog_posts_v" USING btree ("latest");
  CREATE INDEX "_blog_posts_v_autosave_idx" ON "_blog_posts_v" USING btree ("autosave");
  CREATE INDEX "_blog_posts_v_version_meta_version_meta_image_idx" ON "_blog_posts_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_blog_posts_v_locales_locale_parent_id_unique" ON "_blog_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "faqs_slug_idx" ON "faqs" USING btree ("slug");
  CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE INDEX "faqs__status_idx" ON "faqs" USING btree ("_status");
  CREATE UNIQUE INDEX "faqs_locales_locale_parent_id_unique" ON "faqs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faqs_v_parent_idx" ON "_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_faqs_v_version_version_slug_idx" ON "_faqs_v" USING btree ("version_slug");
  CREATE INDEX "_faqs_v_version_version_category_idx" ON "_faqs_v" USING btree ("version_category_id");
  CREATE INDEX "_faqs_v_version_version_updated_at_idx" ON "_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_faqs_v_version_version_created_at_idx" ON "_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_faqs_v_version_version__status_idx" ON "_faqs_v" USING btree ("version__status");
  CREATE INDEX "_faqs_v_created_at_idx" ON "_faqs_v" USING btree ("created_at");
  CREATE INDEX "_faqs_v_updated_at_idx" ON "_faqs_v" USING btree ("updated_at");
  CREATE INDEX "_faqs_v_snapshot_idx" ON "_faqs_v" USING btree ("snapshot");
  CREATE INDEX "_faqs_v_published_locale_idx" ON "_faqs_v" USING btree ("published_locale");
  CREATE INDEX "_faqs_v_latest_idx" ON "_faqs_v" USING btree ("latest");
  CREATE INDEX "_faqs_v_autosave_idx" ON "_faqs_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_faqs_v_locales_locale_parent_id_unique" ON "_faqs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "email_requests_college_idx" ON "email_requests" USING btree ("college_id");
  CREATE INDEX "email_requests_program_idx" ON "email_requests" USING btree ("program_id");
  CREATE INDEX "email_requests_reviewed_by_idx" ON "email_requests" USING btree ("reviewed_by_id");
  CREATE INDEX "email_requests_updated_at_idx" ON "email_requests" USING btree ("updated_at");
  CREATE INDEX "email_requests_created_at_idx" ON "email_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "team_members_slug_idx" ON "team_members" USING btree ("slug");
  CREATE INDEX "team_members_image_idx" ON "team_members" USING btree ("image_id");
  CREATE INDEX "team_members_updated_at_idx" ON "team_members" USING btree ("updated_at");
  CREATE INDEX "team_members_created_at_idx" ON "team_members" USING btree ("created_at");
  CREATE UNIQUE INDEX "team_members_locales_locale_parent_id_unique" ON "team_members_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_kind_idx" ON "categories" USING btree ("kind");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "kind_idx" ON "categories" USING btree ("kind");
  CREATE INDEX "parent_idx" ON "categories" USING btree ("parent_id");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "study_plans_courses_order_idx" ON "study_plans_courses" USING btree ("_order");
  CREATE INDEX "study_plans_courses_parent_id_idx" ON "study_plans_courses" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "study_plans_courses_locales_locale_parent_id_unique" ON "study_plans_courses_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "study_plans_slug_idx" ON "study_plans" USING btree ("slug");
  CREATE INDEX "study_plans_academic_program_idx" ON "study_plans" USING btree ("academic_program_id");
  CREATE INDEX "study_plans_college_idx" ON "study_plans" USING btree ("college_id");
  CREATE INDEX "study_plans_updated_at_idx" ON "study_plans" USING btree ("updated_at");
  CREATE INDEX "study_plans_created_at_idx" ON "study_plans" USING btree ("created_at");
  CREATE INDEX "study_plans__status_idx" ON "study_plans" USING btree ("_status");
  CREATE INDEX "academicProgram_idx" ON "study_plans" USING btree ("academic_program_id");
  CREATE INDEX "college_idx" ON "study_plans" USING btree ("college_id");
  CREATE UNIQUE INDEX "study_plans_locales_locale_parent_id_unique" ON "study_plans_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_study_plans_v_version_courses_order_idx" ON "_study_plans_v_version_courses" USING btree ("_order");
  CREATE INDEX "_study_plans_v_version_courses_parent_id_idx" ON "_study_plans_v_version_courses" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_study_plans_v_version_courses_locales_locale_parent_id_uniq" ON "_study_plans_v_version_courses_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_study_plans_v_parent_idx" ON "_study_plans_v" USING btree ("parent_id");
  CREATE INDEX "_study_plans_v_version_version_slug_idx" ON "_study_plans_v" USING btree ("version_slug");
  CREATE INDEX "_study_plans_v_version_version_academic_program_idx" ON "_study_plans_v" USING btree ("version_academic_program_id");
  CREATE INDEX "_study_plans_v_version_version_college_idx" ON "_study_plans_v" USING btree ("version_college_id");
  CREATE INDEX "_study_plans_v_version_version_updated_at_idx" ON "_study_plans_v" USING btree ("version_updated_at");
  CREATE INDEX "_study_plans_v_version_version_created_at_idx" ON "_study_plans_v" USING btree ("version_created_at");
  CREATE INDEX "_study_plans_v_version_version__status_idx" ON "_study_plans_v" USING btree ("version__status");
  CREATE INDEX "_study_plans_v_created_at_idx" ON "_study_plans_v" USING btree ("created_at");
  CREATE INDEX "_study_plans_v_updated_at_idx" ON "_study_plans_v" USING btree ("updated_at");
  CREATE INDEX "_study_plans_v_snapshot_idx" ON "_study_plans_v" USING btree ("snapshot");
  CREATE INDEX "_study_plans_v_published_locale_idx" ON "_study_plans_v" USING btree ("published_locale");
  CREATE INDEX "_study_plans_v_latest_idx" ON "_study_plans_v" USING btree ("latest");
  CREATE INDEX "_study_plans_v_autosave_idx" ON "_study_plans_v" USING btree ("autosave");
  CREATE INDEX "version_academicProgram_idx" ON "_study_plans_v" USING btree ("version_academic_program_id");
  CREATE INDEX "version_college_idx" ON "_study_plans_v" USING btree ("version_college_id");
  CREATE UNIQUE INDEX "_study_plans_v_locales_locale_parent_id_unique" ON "_study_plans_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "private_media_updated_at_idx" ON "private_media" USING btree ("updated_at");
  CREATE INDEX "private_media_created_at_idx" ON "private_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "private_media_filename_idx" ON "private_media" USING btree ("filename");
  CREATE INDEX "private_media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "private_media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "private_media_sizes_medium_sizes_medium_filename_idx" ON "private_media" USING btree ("sizes_medium_filename");
  CREATE UNIQUE INDEX "private_media_locales_locale_parent_id_unique" ON "private_media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "centers_slug_idx" ON "centers" USING btree ("slug");
  CREATE INDEX "centers_image_idx" ON "centers" USING btree ("image_id");
  CREATE INDEX "centers_updated_at_idx" ON "centers" USING btree ("updated_at");
  CREATE INDEX "centers_created_at_idx" ON "centers" USING btree ("created_at");
  CREATE INDEX "centers__status_idx" ON "centers" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_1_idx" ON "centers" USING btree ("slug");
  CREATE INDEX "kind_1_idx" ON "centers" USING btree ("kind");
  CREATE INDEX "_status_idx" ON "centers" USING btree ("_status");
  CREATE UNIQUE INDEX "centers_locales_locale_parent_id_unique" ON "centers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_centers_v_parent_idx" ON "_centers_v" USING btree ("parent_id");
  CREATE INDEX "_centers_v_version_version_slug_idx" ON "_centers_v" USING btree ("version_slug");
  CREATE INDEX "_centers_v_version_version_image_idx" ON "_centers_v" USING btree ("version_image_id");
  CREATE INDEX "_centers_v_version_version_updated_at_idx" ON "_centers_v" USING btree ("version_updated_at");
  CREATE INDEX "_centers_v_version_version_created_at_idx" ON "_centers_v" USING btree ("version_created_at");
  CREATE INDEX "_centers_v_version_version__status_idx" ON "_centers_v" USING btree ("version__status");
  CREATE INDEX "_centers_v_created_at_idx" ON "_centers_v" USING btree ("created_at");
  CREATE INDEX "_centers_v_updated_at_idx" ON "_centers_v" USING btree ("updated_at");
  CREATE INDEX "_centers_v_snapshot_idx" ON "_centers_v" USING btree ("snapshot");
  CREATE INDEX "_centers_v_published_locale_idx" ON "_centers_v" USING btree ("published_locale");
  CREATE INDEX "_centers_v_latest_idx" ON "_centers_v" USING btree ("latest");
  CREATE INDEX "_centers_v_autosave_idx" ON "_centers_v" USING btree ("autosave");
  CREATE INDEX "version_slug_idx" ON "_centers_v" USING btree ("version_slug");
  CREATE INDEX "version_kind_idx" ON "_centers_v" USING btree ("version_kind");
  CREATE INDEX "version__status_idx" ON "_centers_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_centers_v_locales_locale_parent_id_unique" ON "_centers_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_images_order_idx" ON "projects_images" USING btree ("_order");
  CREATE INDEX "projects_images_parent_id_idx" ON "projects_images" USING btree ("_parent_id");
  CREATE INDEX "projects_images_image_idx" ON "projects_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projects_image_idx" ON "projects" USING btree ("image_id");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_2_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projectStatus_idx" ON "projects" USING btree ("project_status");
  CREATE INDEX "_status_1_idx" ON "projects" USING btree ("_status");
  CREATE UNIQUE INDEX "projects_locales_locale_parent_id_unique" ON "projects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_projects_v_version_images_order_idx" ON "_projects_v_version_images" USING btree ("_order");
  CREATE INDEX "_projects_v_version_images_parent_id_idx" ON "_projects_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_images_image_idx" ON "_projects_v_version_images" USING btree ("image_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_image_idx" ON "_projects_v" USING btree ("version_image_id");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_snapshot_idx" ON "_projects_v" USING btree ("snapshot");
  CREATE INDEX "_projects_v_published_locale_idx" ON "_projects_v" USING btree ("published_locale");
  CREATE INDEX "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE INDEX "_projects_v_autosave_idx" ON "_projects_v" USING btree ("autosave");
  CREATE INDEX "version_slug_1_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "version_projectStatus_idx" ON "_projects_v" USING btree ("version_project_status");
  CREATE INDEX "version__status_1_idx" ON "_projects_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_projects_v_locales_locale_parent_id_unique" ON "_projects_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "research_publications_tags_order_idx" ON "research_publications_tags" USING btree ("_order");
  CREATE INDEX "research_publications_tags_parent_id_idx" ON "research_publications_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "research_publications_tags_locales_locale_parent_id_unique" ON "research_publications_tags_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "research_publications_slug_idx" ON "research_publications" USING btree ("slug");
  CREATE INDEX "research_publications_category_idx" ON "research_publications" USING btree ("category_id");
  CREATE INDEX "research_publications_image_idx" ON "research_publications" USING btree ("image_id");
  CREATE INDEX "research_publications_updated_at_idx" ON "research_publications" USING btree ("updated_at");
  CREATE INDEX "research_publications_created_at_idx" ON "research_publications" USING btree ("created_at");
  CREATE INDEX "research_publications__status_idx" ON "research_publications" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_3_idx" ON "research_publications" USING btree ("slug");
  CREATE INDEX "publishDate_idx" ON "research_publications" USING btree ("publish_date");
  CREATE INDEX "_status_2_idx" ON "research_publications" USING btree ("_status");
  CREATE UNIQUE INDEX "research_publications_locales_locale_parent_id_unique" ON "research_publications_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_research_publications_v_version_tags_order_idx" ON "_research_publications_v_version_tags" USING btree ("_order");
  CREATE INDEX "_research_publications_v_version_tags_parent_id_idx" ON "_research_publications_v_version_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_research_publications_v_version_tags_locales_locale_parent_" ON "_research_publications_v_version_tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_research_publications_v_parent_idx" ON "_research_publications_v" USING btree ("parent_id");
  CREATE INDEX "_research_publications_v_version_version_slug_idx" ON "_research_publications_v" USING btree ("version_slug");
  CREATE INDEX "_research_publications_v_version_version_category_idx" ON "_research_publications_v" USING btree ("version_category_id");
  CREATE INDEX "_research_publications_v_version_version_image_idx" ON "_research_publications_v" USING btree ("version_image_id");
  CREATE INDEX "_research_publications_v_version_version_updated_at_idx" ON "_research_publications_v" USING btree ("version_updated_at");
  CREATE INDEX "_research_publications_v_version_version_created_at_idx" ON "_research_publications_v" USING btree ("version_created_at");
  CREATE INDEX "_research_publications_v_version_version__status_idx" ON "_research_publications_v" USING btree ("version__status");
  CREATE INDEX "_research_publications_v_created_at_idx" ON "_research_publications_v" USING btree ("created_at");
  CREATE INDEX "_research_publications_v_updated_at_idx" ON "_research_publications_v" USING btree ("updated_at");
  CREATE INDEX "_research_publications_v_snapshot_idx" ON "_research_publications_v" USING btree ("snapshot");
  CREATE INDEX "_research_publications_v_published_locale_idx" ON "_research_publications_v" USING btree ("published_locale");
  CREATE INDEX "_research_publications_v_latest_idx" ON "_research_publications_v" USING btree ("latest");
  CREATE INDEX "_research_publications_v_autosave_idx" ON "_research_publications_v" USING btree ("autosave");
  CREATE INDEX "version_slug_2_idx" ON "_research_publications_v" USING btree ("version_slug");
  CREATE INDEX "version_publishDate_idx" ON "_research_publications_v" USING btree ("version_publish_date");
  CREATE INDEX "version__status_2_idx" ON "_research_publications_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_research_publications_v_locales_locale_parent_id_unique" ON "_research_publications_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "campus_life_highlights_order_idx" ON "campus_life_highlights" USING btree ("_order");
  CREATE INDEX "campus_life_highlights_parent_id_idx" ON "campus_life_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "campus_life_highlights_locales_locale_parent_id_unique" ON "campus_life_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "campus_life_stats_order_idx" ON "campus_life_stats" USING btree ("_order");
  CREATE INDEX "campus_life_stats_parent_id_idx" ON "campus_life_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "campus_life_stats_locales_locale_parent_id_unique" ON "campus_life_stats_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "campus_life_slug_idx" ON "campus_life" USING btree ("slug");
  CREATE INDEX "campus_life_image_idx" ON "campus_life" USING btree ("image_id");
  CREATE INDEX "campus_life_updated_at_idx" ON "campus_life" USING btree ("updated_at");
  CREATE INDEX "campus_life_created_at_idx" ON "campus_life" USING btree ("created_at");
  CREATE INDEX "campus_life__status_idx" ON "campus_life" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_4_idx" ON "campus_life" USING btree ("slug");
  CREATE INDEX "kind_2_idx" ON "campus_life" USING btree ("kind");
  CREATE INDEX "_status_3_idx" ON "campus_life" USING btree ("_status");
  CREATE UNIQUE INDEX "campus_life_locales_locale_parent_id_unique" ON "campus_life_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_campus_life_v_version_highlights_order_idx" ON "_campus_life_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_campus_life_v_version_highlights_parent_id_idx" ON "_campus_life_v_version_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_campus_life_v_version_highlights_locales_locale_parent_id_u" ON "_campus_life_v_version_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_campus_life_v_version_stats_order_idx" ON "_campus_life_v_version_stats" USING btree ("_order");
  CREATE INDEX "_campus_life_v_version_stats_parent_id_idx" ON "_campus_life_v_version_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_campus_life_v_version_stats_locales_locale_parent_id_unique" ON "_campus_life_v_version_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_campus_life_v_parent_idx" ON "_campus_life_v" USING btree ("parent_id");
  CREATE INDEX "_campus_life_v_version_version_slug_idx" ON "_campus_life_v" USING btree ("version_slug");
  CREATE INDEX "_campus_life_v_version_version_image_idx" ON "_campus_life_v" USING btree ("version_image_id");
  CREATE INDEX "_campus_life_v_version_version_updated_at_idx" ON "_campus_life_v" USING btree ("version_updated_at");
  CREATE INDEX "_campus_life_v_version_version_created_at_idx" ON "_campus_life_v" USING btree ("version_created_at");
  CREATE INDEX "_campus_life_v_version_version__status_idx" ON "_campus_life_v" USING btree ("version__status");
  CREATE INDEX "_campus_life_v_created_at_idx" ON "_campus_life_v" USING btree ("created_at");
  CREATE INDEX "_campus_life_v_updated_at_idx" ON "_campus_life_v" USING btree ("updated_at");
  CREATE INDEX "_campus_life_v_snapshot_idx" ON "_campus_life_v" USING btree ("snapshot");
  CREATE INDEX "_campus_life_v_published_locale_idx" ON "_campus_life_v" USING btree ("published_locale");
  CREATE INDEX "_campus_life_v_latest_idx" ON "_campus_life_v" USING btree ("latest");
  CREATE INDEX "_campus_life_v_autosave_idx" ON "_campus_life_v" USING btree ("autosave");
  CREATE INDEX "version_slug_3_idx" ON "_campus_life_v" USING btree ("version_slug");
  CREATE INDEX "version_kind_1_idx" ON "_campus_life_v" USING btree ("version_kind");
  CREATE INDEX "version__status_3_idx" ON "_campus_life_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_campus_life_v_locales_locale_parent_id_unique" ON "_campus_life_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "offers_interest_highlights_order_idx" ON "offers_interest_highlights" USING btree ("_order");
  CREATE INDEX "offers_interest_highlights_parent_id_idx" ON "offers_interest_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "offers_interest_highlights_locales_locale_parent_id_unique" ON "offers_interest_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "offers_slug_idx" ON "offers" USING btree ("slug");
  CREATE INDEX "offers_category_idx" ON "offers" USING btree ("category_id");
  CREATE INDEX "offers_image_idx" ON "offers" USING btree ("image_id");
  CREATE INDEX "offers_college_idx" ON "offers" USING btree ("college_id");
  CREATE INDEX "offers_updated_at_idx" ON "offers" USING btree ("updated_at");
  CREATE INDEX "offers_created_at_idx" ON "offers" USING btree ("created_at");
  CREATE INDEX "offers__status_idx" ON "offers" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_5_idx" ON "offers" USING btree ("slug");
  CREATE INDEX "category_idx" ON "offers" USING btree ("category_id");
  CREATE INDEX "validUntil_idx" ON "offers" USING btree ("valid_until");
  CREATE INDEX "_status_4_idx" ON "offers" USING btree ("_status");
  CREATE UNIQUE INDEX "offers_locales_locale_parent_id_unique" ON "offers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_offers_v_version_interest_highlights_order_idx" ON "_offers_v_version_interest_highlights" USING btree ("_order");
  CREATE INDEX "_offers_v_version_interest_highlights_parent_id_idx" ON "_offers_v_version_interest_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_offers_v_version_interest_highlights_locales_locale_parent_" ON "_offers_v_version_interest_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_offers_v_parent_idx" ON "_offers_v" USING btree ("parent_id");
  CREATE INDEX "_offers_v_version_version_slug_idx" ON "_offers_v" USING btree ("version_slug");
  CREATE INDEX "_offers_v_version_version_category_idx" ON "_offers_v" USING btree ("version_category_id");
  CREATE INDEX "_offers_v_version_version_image_idx" ON "_offers_v" USING btree ("version_image_id");
  CREATE INDEX "_offers_v_version_version_college_idx" ON "_offers_v" USING btree ("version_college_id");
  CREATE INDEX "_offers_v_version_version_updated_at_idx" ON "_offers_v" USING btree ("version_updated_at");
  CREATE INDEX "_offers_v_version_version_created_at_idx" ON "_offers_v" USING btree ("version_created_at");
  CREATE INDEX "_offers_v_version_version__status_idx" ON "_offers_v" USING btree ("version__status");
  CREATE INDEX "_offers_v_created_at_idx" ON "_offers_v" USING btree ("created_at");
  CREATE INDEX "_offers_v_updated_at_idx" ON "_offers_v" USING btree ("updated_at");
  CREATE INDEX "_offers_v_snapshot_idx" ON "_offers_v" USING btree ("snapshot");
  CREATE INDEX "_offers_v_published_locale_idx" ON "_offers_v" USING btree ("published_locale");
  CREATE INDEX "_offers_v_latest_idx" ON "_offers_v" USING btree ("latest");
  CREATE INDEX "_offers_v_autosave_idx" ON "_offers_v" USING btree ("autosave");
  CREATE INDEX "version_slug_4_idx" ON "_offers_v" USING btree ("version_slug");
  CREATE INDEX "version_category_idx" ON "_offers_v" USING btree ("version_category_id");
  CREATE INDEX "version_validUntil_idx" ON "_offers_v" USING btree ("version_valid_until");
  CREATE INDEX "version__status_4_idx" ON "_offers_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_offers_v_locales_locale_parent_id_unique" ON "_offers_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "partners_slug_idx" ON "partners" USING btree ("slug");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "isActive_idx" ON "partners" USING btree ("is_active");
  CREATE UNIQUE INDEX "partners_locales_locale_parent_id_unique" ON "partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sliders_image_idx" ON "sliders" USING btree ("image_id");
  CREATE INDEX "sliders_updated_at_idx" ON "sliders" USING btree ("updated_at");
  CREATE INDEX "sliders_created_at_idx" ON "sliders" USING btree ("created_at");
  CREATE INDEX "isActive_1_idx" ON "sliders" USING btree ("is_active");
  CREATE INDEX "displayOrder_idx" ON "sliders" USING btree ("display_order");
  CREATE UNIQUE INDEX "sliders_locales_locale_parent_id_unique" ON "sliders_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sliders_rels_order_idx" ON "sliders_rels" USING btree ("order");
  CREATE INDEX "sliders_rels_parent_idx" ON "sliders_rels" USING btree ("parent_id");
  CREATE INDEX "sliders_rels_path_idx" ON "sliders_rels" USING btree ("path");
  CREATE INDEX "sliders_rels_pages_id_idx" ON "sliders_rels" USING btree ("pages_id");
  CREATE INDEX "student_affairs_documents_file_idx" ON "student_affairs_documents" USING btree ("file_id");
  CREATE INDEX "student_affairs_documents_updated_at_idx" ON "student_affairs_documents" USING btree ("updated_at");
  CREATE INDEX "student_affairs_documents_created_at_idx" ON "student_affairs_documents" USING btree ("created_at");
  CREATE INDEX "student_affairs_documents__status_idx" ON "student_affairs_documents" USING btree ("_status");
  CREATE INDEX "_status_5_idx" ON "student_affairs_documents" USING btree ("_status");
  CREATE UNIQUE INDEX "student_affairs_documents_locales_locale_parent_id_unique" ON "student_affairs_documents_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_student_affairs_documents_v_parent_idx" ON "_student_affairs_documents_v" USING btree ("parent_id");
  CREATE INDEX "_student_affairs_documents_v_version_version_file_idx" ON "_student_affairs_documents_v" USING btree ("version_file_id");
  CREATE INDEX "_student_affairs_documents_v_version_version_updated_at_idx" ON "_student_affairs_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_student_affairs_documents_v_version_version_created_at_idx" ON "_student_affairs_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_student_affairs_documents_v_version_version__status_idx" ON "_student_affairs_documents_v" USING btree ("version__status");
  CREATE INDEX "_student_affairs_documents_v_created_at_idx" ON "_student_affairs_documents_v" USING btree ("created_at");
  CREATE INDEX "_student_affairs_documents_v_updated_at_idx" ON "_student_affairs_documents_v" USING btree ("updated_at");
  CREATE INDEX "_student_affairs_documents_v_snapshot_idx" ON "_student_affairs_documents_v" USING btree ("snapshot");
  CREATE INDEX "_student_affairs_documents_v_published_locale_idx" ON "_student_affairs_documents_v" USING btree ("published_locale");
  CREATE INDEX "_student_affairs_documents_v_latest_idx" ON "_student_affairs_documents_v" USING btree ("latest");
  CREATE INDEX "_student_affairs_documents_v_autosave_idx" ON "_student_affairs_documents_v" USING btree ("autosave");
  CREATE INDEX "version__status_5_idx" ON "_student_affairs_documents_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_student_affairs_documents_v_locales_locale_parent_id_unique" ON "_student_affairs_documents_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "announcements_slug_idx" ON "announcements" USING btree ("slug");
  CREATE INDEX "announcements_image_idx" ON "announcements" USING btree ("image_id");
  CREATE INDEX "announcements_college_idx" ON "announcements" USING btree ("college_id");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE INDEX "announcements__status_idx" ON "announcements" USING btree ("_status");
  CREATE UNIQUE INDEX "slug_6_idx" ON "announcements" USING btree ("slug");
  CREATE INDEX "college_1_idx" ON "announcements" USING btree ("college_id");
  CREATE INDEX "publishDate_1_idx" ON "announcements" USING btree ("publish_date");
  CREATE UNIQUE INDEX "announcements_locales_locale_parent_id_unique" ON "announcements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_announcements_v_parent_idx" ON "_announcements_v" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_version_version_slug_idx" ON "_announcements_v" USING btree ("version_slug");
  CREATE INDEX "_announcements_v_version_version_image_idx" ON "_announcements_v" USING btree ("version_image_id");
  CREATE INDEX "_announcements_v_version_version_college_idx" ON "_announcements_v" USING btree ("version_college_id");
  CREATE INDEX "_announcements_v_version_version_updated_at_idx" ON "_announcements_v" USING btree ("version_updated_at");
  CREATE INDEX "_announcements_v_version_version_created_at_idx" ON "_announcements_v" USING btree ("version_created_at");
  CREATE INDEX "_announcements_v_version_version__status_idx" ON "_announcements_v" USING btree ("version__status");
  CREATE INDEX "_announcements_v_created_at_idx" ON "_announcements_v" USING btree ("created_at");
  CREATE INDEX "_announcements_v_updated_at_idx" ON "_announcements_v" USING btree ("updated_at");
  CREATE INDEX "_announcements_v_snapshot_idx" ON "_announcements_v" USING btree ("snapshot");
  CREATE INDEX "_announcements_v_published_locale_idx" ON "_announcements_v" USING btree ("published_locale");
  CREATE INDEX "_announcements_v_latest_idx" ON "_announcements_v" USING btree ("latest");
  CREATE INDEX "_announcements_v_autosave_idx" ON "_announcements_v" USING btree ("autosave");
  CREATE INDEX "version_slug_5_idx" ON "_announcements_v" USING btree ("version_slug");
  CREATE INDEX "version_college_1_idx" ON "_announcements_v" USING btree ("version_college_id");
  CREATE INDEX "version_publishDate_1_idx" ON "_announcements_v" USING btree ("version_publish_date");
  CREATE UNIQUE INDEX "_announcements_v_locales_locale_parent_id_unique" ON "_announcements_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "admission_requirements_image_idx" ON "admission_requirements" USING btree ("image_id");
  CREATE INDEX "admission_requirements_updated_at_idx" ON "admission_requirements" USING btree ("updated_at");
  CREATE INDEX "admission_requirements_created_at_idx" ON "admission_requirements" USING btree ("created_at");
  CREATE INDEX "admission_requirements__status_idx" ON "admission_requirements" USING btree ("_status");
  CREATE INDEX "_status_6_idx" ON "admission_requirements" USING btree ("_status");
  CREATE UNIQUE INDEX "admission_requirements_locales_locale_parent_id_unique" ON "admission_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_admission_requirements_v_parent_idx" ON "_admission_requirements_v" USING btree ("parent_id");
  CREATE INDEX "_admission_requirements_v_version_version_image_idx" ON "_admission_requirements_v" USING btree ("version_image_id");
  CREATE INDEX "_admission_requirements_v_version_version_updated_at_idx" ON "_admission_requirements_v" USING btree ("version_updated_at");
  CREATE INDEX "_admission_requirements_v_version_version_created_at_idx" ON "_admission_requirements_v" USING btree ("version_created_at");
  CREATE INDEX "_admission_requirements_v_version_version__status_idx" ON "_admission_requirements_v" USING btree ("version__status");
  CREATE INDEX "_admission_requirements_v_created_at_idx" ON "_admission_requirements_v" USING btree ("created_at");
  CREATE INDEX "_admission_requirements_v_updated_at_idx" ON "_admission_requirements_v" USING btree ("updated_at");
  CREATE INDEX "_admission_requirements_v_snapshot_idx" ON "_admission_requirements_v" USING btree ("snapshot");
  CREATE INDEX "_admission_requirements_v_published_locale_idx" ON "_admission_requirements_v" USING btree ("published_locale");
  CREATE INDEX "_admission_requirements_v_latest_idx" ON "_admission_requirements_v" USING btree ("latest");
  CREATE INDEX "_admission_requirements_v_autosave_idx" ON "_admission_requirements_v" USING btree ("autosave");
  CREATE INDEX "version__status_6_idx" ON "_admission_requirements_v" USING btree ("version__status");
  CREATE UNIQUE INDEX "_admission_requirements_v_locales_locale_parent_id_unique" ON "_admission_requirements_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_checkbox_order_idx" ON "forms_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_parent_id_idx" ON "forms_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_path_idx" ON "forms_blocks_checkbox" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_checkbox_locales_locale_parent_id_unique" ON "forms_blocks_checkbox_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_email_order_idx" ON "forms_blocks_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_email_parent_id_idx" ON "forms_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_email_path_idx" ON "forms_blocks_email" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_email_locales_locale_parent_id_unique" ON "forms_blocks_email_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_message_order_idx" ON "forms_blocks_message" USING btree ("_order");
  CREATE INDEX "forms_blocks_message_parent_id_idx" ON "forms_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_message_path_idx" ON "forms_blocks_message" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_message_locales_locale_parent_id_unique" ON "forms_blocks_message_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_number_order_idx" ON "forms_blocks_number" USING btree ("_order");
  CREATE INDEX "forms_blocks_number_parent_id_idx" ON "forms_blocks_number" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_number_path_idx" ON "forms_blocks_number" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_number_locales_locale_parent_id_unique" ON "forms_blocks_number_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_select_options_order_idx" ON "forms_blocks_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_options_parent_id_idx" ON "forms_blocks_select_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_blocks_select_options_locales_locale_parent_id_unique" ON "forms_blocks_select_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_select_order_idx" ON "forms_blocks_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_parent_id_idx" ON "forms_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_path_idx" ON "forms_blocks_select" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_select_locales_locale_parent_id_unique" ON "forms_blocks_select_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_text_order_idx" ON "forms_blocks_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_text_parent_id_idx" ON "forms_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_text_path_idx" ON "forms_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_text_locales_locale_parent_id_unique" ON "forms_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_textarea_order_idx" ON "forms_blocks_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_textarea_parent_id_idx" ON "forms_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_textarea_path_idx" ON "forms_blocks_textarea" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_textarea_locales_locale_parent_id_unique" ON "forms_blocks_textarea_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_upload_mime_types_order_idx" ON "forms_blocks_upload_mime_types" USING btree ("_order");
  CREATE INDEX "forms_blocks_upload_mime_types_parent_id_idx" ON "forms_blocks_upload_mime_types" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_upload_order_idx" ON "forms_blocks_upload" USING btree ("_order");
  CREATE INDEX "forms_blocks_upload_parent_id_idx" ON "forms_blocks_upload" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_upload_path_idx" ON "forms_blocks_upload" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_upload_locales_locale_parent_id_unique" ON "forms_blocks_upload_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_emails_order_idx" ON "forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "forms_emails" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_emails_locales_locale_parent_id_unique" ON "forms_emails_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE UNIQUE INDEX "forms_locales_locale_parent_id_unique" ON "forms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "form_submissions_submission_data_order_idx" ON "form_submissions_submission_data" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_data_parent_id_idx" ON "form_submissions_submission_data" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_submission_uploads_order_idx" ON "form_submissions_submission_uploads" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_uploads_parent_id_idx" ON "form_submissions_submission_uploads" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "form_submissions_rels_order_idx" ON "form_submissions_rels" USING btree ("order");
  CREATE INDEX "form_submissions_rels_parent_idx" ON "form_submissions_rels" USING btree ("parent_id");
  CREATE INDEX "form_submissions_rels_path_idx" ON "form_submissions_rels" USING btree ("path");
  CREATE INDEX "form_submissions_rels_media_id_idx" ON "form_submissions_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_pages_id_idx" ON "redirects_rels" USING btree ("pages_id");
  CREATE INDEX "redirects_rels_news_id_idx" ON "redirects_rels" USING btree ("news_id");
  CREATE INDEX "redirects_rels_events_id_idx" ON "redirects_rels" USING btree ("events_id");
  CREATE INDEX "redirects_rels_blog_posts_id_idx" ON "redirects_rels" USING btree ("blog_posts_id");
  CREATE INDEX "redirects_rels_colleges_id_idx" ON "redirects_rels" USING btree ("colleges_id");
  CREATE INDEX "redirects_rels_faculty_members_id_idx" ON "redirects_rels" USING btree ("faculty_members_id");
  CREATE INDEX "redirects_rels_centers_id_idx" ON "redirects_rels" USING btree ("centers_id");
  CREATE INDEX "redirects_rels_offers_id_idx" ON "redirects_rels" USING btree ("offers_id");
  CREATE INDEX "redirects_rels_campus_life_id_idx" ON "redirects_rels" USING btree ("campus_life_id");
  CREATE INDEX "redirects_rels_projects_id_idx" ON "redirects_rels" USING btree ("projects_id");
  CREATE INDEX "redirects_rels_research_publications_id_idx" ON "redirects_rels" USING btree ("research_publications_id");
  CREATE INDEX "redirects_rels_academic_programs_id_idx" ON "redirects_rels" USING btree ("academic_programs_id");
  CREATE INDEX "redirects_rels_study_plans_id_idx" ON "redirects_rels" USING btree ("study_plans_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_roles_id_idx" ON "payload_locked_documents_rels" USING btree ("roles_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_navigation_menus_id_idx" ON "payload_locked_documents_rels" USING btree ("navigation_menus_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_colleges_id_idx" ON "payload_locked_documents_rels" USING btree ("colleges_id");
  CREATE INDEX "payload_locked_documents_rels_academic_departments_id_idx" ON "payload_locked_documents_rels" USING btree ("academic_departments_id");
  CREATE INDEX "payload_locked_documents_rels_academic_programs_id_idx" ON "payload_locked_documents_rels" USING btree ("academic_programs_id");
  CREATE INDEX "payload_locked_documents_rels_faculty_members_id_idx" ON "payload_locked_documents_rels" USING btree ("faculty_members_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_join_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("join_requests_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_email_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("email_requests_id");
  CREATE INDEX "payload_locked_documents_rels_team_members_id_idx" ON "payload_locked_documents_rels" USING btree ("team_members_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_study_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("study_plans_id");
  CREATE INDEX "payload_locked_documents_rels_private_media_id_idx" ON "payload_locked_documents_rels" USING btree ("private_media_id");
  CREATE INDEX "payload_locked_documents_rels_centers_id_idx" ON "payload_locked_documents_rels" USING btree ("centers_id");
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_research_publications_id_idx" ON "payload_locked_documents_rels" USING btree ("research_publications_id");
  CREATE INDEX "payload_locked_documents_rels_campus_life_id_idx" ON "payload_locked_documents_rels" USING btree ("campus_life_id");
  CREATE INDEX "payload_locked_documents_rels_offers_id_idx" ON "payload_locked_documents_rels" USING btree ("offers_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_sliders_id_idx" ON "payload_locked_documents_rels" USING btree ("sliders_id");
  CREATE INDEX "payload_locked_documents_rels_student_affairs_documents__idx" ON "payload_locked_documents_rels" USING btree ("student_affairs_documents_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_admission_requirements_id_idx" ON "payload_locked_documents_rels" USING btree ("admission_requirements_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_footer_logo_idx" ON "site_settings" USING btree ("footer_logo_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_settings_v_version_social_links_order_idx" ON "_site_settings_v_version_social_links" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_social_links_parent_id_idx" ON "_site_settings_v_version_social_links" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version_favicon_idx" ON "_site_settings_v" USING btree ("version_favicon_id");
  CREATE INDEX "_site_settings_v_version_version_footer_logo_idx" ON "_site_settings_v" USING btree ("version_footer_logo_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_team_members_order_idx" ON "about_page_team_members" USING btree ("_order");
  CREATE INDEX "about_page_team_members_parent_id_idx" ON "about_page_team_members" USING btree ("_parent_id");
  CREATE INDEX "about_page_team_members_member_image_idx" ON "about_page_team_members" USING btree ("member_image_id");
  CREATE UNIQUE INDEX "about_page_team_members_locales_locale_parent_id_unique" ON "about_page_team_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_intro_intro_image_idx" ON "about_page" USING btree ("intro_image_id");
  CREATE INDEX "about_page_president_president_image_idx" ON "about_page" USING btree ("president_image_id");
  CREATE UNIQUE INDEX "about_page_locales_locale_parent_id_unique" ON "about_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_rels_order_idx" ON "about_page_rels" USING btree ("order");
  CREATE INDEX "about_page_rels_parent_idx" ON "about_page_rels" USING btree ("parent_id");
  CREATE INDEX "about_page_rels_path_idx" ON "about_page_rels" USING btree ("path");
  CREATE INDEX "about_page_rels_team_members_id_idx" ON "about_page_rels" USING btree ("team_members_id");
  CREATE INDEX "_about_page_v_version_team_members_order_idx" ON "_about_page_v_version_team_members" USING btree ("_order");
  CREATE INDEX "_about_page_v_version_team_members_parent_id_idx" ON "_about_page_v_version_team_members" USING btree ("_parent_id");
  CREATE INDEX "_about_page_v_version_team_members_member_image_idx" ON "_about_page_v_version_team_members" USING btree ("member_image_id");
  CREATE UNIQUE INDEX "_about_page_v_version_team_members_locales_locale_parent_id_" ON "_about_page_v_version_team_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_page_v_version_intro_version_intro_image_idx" ON "_about_page_v" USING btree ("version_intro_image_id");
  CREATE INDEX "_about_page_v_version_president_version_president_image_idx" ON "_about_page_v" USING btree ("version_president_image_id");
  CREATE INDEX "_about_page_v_created_at_idx" ON "_about_page_v" USING btree ("created_at");
  CREATE INDEX "_about_page_v_updated_at_idx" ON "_about_page_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_about_page_v_locales_locale_parent_id_unique" ON "_about_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_page_v_rels_order_idx" ON "_about_page_v_rels" USING btree ("order");
  CREATE INDEX "_about_page_v_rels_parent_idx" ON "_about_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_about_page_v_rels_path_idx" ON "_about_page_v_rels" USING btree ("path");
  CREATE INDEX "_about_page_v_rels_team_members_id_idx" ON "_about_page_v_rels" USING btree ("team_members_id");
  CREATE UNIQUE INDEX "contact_settings_locales_locale_parent_id_unique" ON "contact_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_contact_settings_v_created_at_idx" ON "_contact_settings_v" USING btree ("created_at");
  CREATE INDEX "_contact_settings_v_updated_at_idx" ON "_contact_settings_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_contact_settings_v_locales_locale_parent_id_unique" ON "_contact_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navbar_settings_top_bar_items_order_idx" ON "navbar_settings_top_bar_items" USING btree ("_order");
  CREATE INDEX "navbar_settings_top_bar_items_parent_id_idx" ON "navbar_settings_top_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navbar_settings_top_bar_items_locales_locale_parent_id_uniqu" ON "navbar_settings_top_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navbar_settings_rels_order_idx" ON "navbar_settings_rels" USING btree ("order");
  CREATE INDEX "navbar_settings_rels_parent_idx" ON "navbar_settings_rels" USING btree ("parent_id");
  CREATE INDEX "navbar_settings_rels_path_idx" ON "navbar_settings_rels" USING btree ("path");
  CREATE INDEX "navbar_settings_rels_pages_id_idx" ON "navbar_settings_rels" USING btree ("pages_id");
  CREATE INDEX "_navbar_settings_v_version_top_bar_items_order_idx" ON "_navbar_settings_v_version_top_bar_items" USING btree ("_order");
  CREATE INDEX "_navbar_settings_v_version_top_bar_items_parent_id_idx" ON "_navbar_settings_v_version_top_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navbar_settings_v_version_top_bar_items_locales_locale_pare" ON "_navbar_settings_v_version_top_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navbar_settings_v_created_at_idx" ON "_navbar_settings_v" USING btree ("created_at");
  CREATE INDEX "_navbar_settings_v_updated_at_idx" ON "_navbar_settings_v" USING btree ("updated_at");
  CREATE INDEX "_navbar_settings_v_rels_order_idx" ON "_navbar_settings_v_rels" USING btree ("order");
  CREATE INDEX "_navbar_settings_v_rels_parent_idx" ON "_navbar_settings_v_rels" USING btree ("parent_id");
  CREATE INDEX "_navbar_settings_v_rels_path_idx" ON "_navbar_settings_v_rels" USING btree ("path");
  CREATE INDEX "_navbar_settings_v_rels_pages_id_idx" ON "_navbar_settings_v_rels" USING btree ("pages_id");
  CREATE INDEX "footer_settings_footer_items_order_idx" ON "footer_settings_footer_items" USING btree ("_order");
  CREATE INDEX "footer_settings_footer_items_parent_id_idx" ON "footer_settings_footer_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_settings_footer_items_locales_locale_parent_id_unique" ON "footer_settings_footer_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_settings_footer_background_image_idx" ON "footer_settings" USING btree ("footer_background_image_id");
  CREATE INDEX "footer_settings_footer_background_video_idx" ON "footer_settings" USING btree ("footer_background_video_id");
  CREATE UNIQUE INDEX "footer_settings_locales_locale_parent_id_unique" ON "footer_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_settings_rels_order_idx" ON "footer_settings_rels" USING btree ("order");
  CREATE INDEX "footer_settings_rels_parent_idx" ON "footer_settings_rels" USING btree ("parent_id");
  CREATE INDEX "footer_settings_rels_path_idx" ON "footer_settings_rels" USING btree ("path");
  CREATE INDEX "footer_settings_rels_pages_id_idx" ON "footer_settings_rels" USING btree ("pages_id");
  CREATE INDEX "_footer_settings_v_version_footer_items_order_idx" ON "_footer_settings_v_version_footer_items" USING btree ("_order");
  CREATE INDEX "_footer_settings_v_version_footer_items_parent_id_idx" ON "_footer_settings_v_version_footer_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_footer_settings_v_version_footer_items_locales_locale_paren" ON "_footer_settings_v_version_footer_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_settings_v_version_version_footer_background_ima_idx" ON "_footer_settings_v" USING btree ("version_footer_background_image_id");
  CREATE INDEX "_footer_settings_v_version_version_footer_background_vid_idx" ON "_footer_settings_v" USING btree ("version_footer_background_video_id");
  CREATE INDEX "_footer_settings_v_created_at_idx" ON "_footer_settings_v" USING btree ("created_at");
  CREATE INDEX "_footer_settings_v_updated_at_idx" ON "_footer_settings_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_footer_settings_v_locales_locale_parent_id_unique" ON "_footer_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_settings_v_rels_order_idx" ON "_footer_settings_v_rels" USING btree ("order");
  CREATE INDEX "_footer_settings_v_rels_parent_idx" ON "_footer_settings_v_rels" USING btree ("parent_id");
  CREATE INDEX "_footer_settings_v_rels_path_idx" ON "_footer_settings_v_rels" USING btree ("path");
  CREATE INDEX "_footer_settings_v_rels_pages_id_idx" ON "_footer_settings_v_rels" USING btree ("pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "roles_permissions" CASCADE;
  DROP TABLE "roles" CASCADE;
  DROP TABLE "roles_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "pages_populated_authors" CASCADE;
  DROP TABLE "pages_hero_links" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_stats_items" CASCADE;
  DROP TABLE "pages_blocks_stats_items_locales" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_colleges_grid" CASCADE;
  DROP TABLE "pages_blocks_colleges_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_news_grid" CASCADE;
  DROP TABLE "pages_blocks_news_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_events_grid" CASCADE;
  DROP TABLE "pages_blocks_events_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_blog_grid" CASCADE;
  DROP TABLE "pages_blocks_blog_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_team_members" CASCADE;
  DROP TABLE "pages_blocks_team_members_locales" CASCADE;
  DROP TABLE "pages_blocks_partners_partners" CASCADE;
  DROP TABLE "pages_blocks_partners_partners_locales" CASCADE;
  DROP TABLE "pages_blocks_partners" CASCADE;
  DROP TABLE "pages_blocks_partners_locales" CASCADE;
  DROP TABLE "pages_blocks_admission_c_t_a" CASCADE;
  DROP TABLE "pages_blocks_admission_c_t_a_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_info" CASCADE;
  DROP TABLE "pages_blocks_contact_info_locales" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages_blocks_cta_locales" CASCADE;
  DROP TABLE "pages_blocks_announcements" CASCADE;
  DROP TABLE "pages_blocks_announcements_locales" CASCADE;
  DROP TABLE "pages_blocks_campus_life_grid" CASCADE;
  DROP TABLE "pages_blocks_campus_life_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_centers_grid" CASCADE;
  DROP TABLE "pages_blocks_centers_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_offers_grid" CASCADE;
  DROP TABLE "pages_blocks_offers_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_projects_grid" CASCADE;
  DROP TABLE "pages_blocks_projects_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_research_grid" CASCADE;
  DROP TABLE "pages_blocks_research_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_study_plans_grid" CASCADE;
  DROP TABLE "pages_blocks_study_plans_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_video" CASCADE;
  DROP TABLE "pages_blocks_video_locales" CASCADE;
  DROP TABLE "pages_blocks_faculty_members" CASCADE;
  DROP TABLE "pages_blocks_faculty_members_locales" CASCADE;
  DROP TABLE "pages_blocks_programs_grid" CASCADE;
  DROP TABLE "pages_blocks_programs_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_slider" CASCADE;
  DROP TABLE "pages_blocks_slider_locales" CASCADE;
  DROP TABLE "pages_blocks_links_links" CASCADE;
  DROP TABLE "pages_blocks_links_links_locales" CASCADE;
  DROP TABLE "pages_blocks_links" CASCADE;
  DROP TABLE "pages_blocks_links_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_version_populated_authors" CASCADE;
  DROP TABLE "_pages_v_version_hero_links" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_items" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_colleges_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_colleges_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_news_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_news_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_events_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_events_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_blog_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_blog_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_team_members" CASCADE;
  DROP TABLE "_pages_v_blocks_team_members_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_partners_partners" CASCADE;
  DROP TABLE "_pages_v_blocks_partners_partners_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_partners" CASCADE;
  DROP TABLE "_pages_v_blocks_partners_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_admission_c_t_a" CASCADE;
  DROP TABLE "_pages_v_blocks_admission_c_t_a_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_info" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_info_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_announcements" CASCADE;
  DROP TABLE "_pages_v_blocks_announcements_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_campus_life_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_campus_life_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_centers_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_centers_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_offers_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_offers_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_projects_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_projects_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_research_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_research_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_study_plans_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_study_plans_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_video" CASCADE;
  DROP TABLE "_pages_v_blocks_video_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faculty_members" CASCADE;
  DROP TABLE "_pages_v_blocks_faculty_members_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_programs_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_programs_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_slider" CASCADE;
  DROP TABLE "_pages_v_blocks_slider_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_links_links" CASCADE;
  DROP TABLE "_pages_v_blocks_links_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_links" CASCADE;
  DROP TABLE "_pages_v_blocks_links_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "navigation_menus_items_children" CASCADE;
  DROP TABLE "navigation_menus_items_children_locales" CASCADE;
  DROP TABLE "navigation_menus_items" CASCADE;
  DROP TABLE "navigation_menus_items_locales" CASCADE;
  DROP TABLE "navigation_menus" CASCADE;
  DROP TABLE "news_populated_authors" CASCADE;
  DROP TABLE "news_tags" CASCADE;
  DROP TABLE "news_tags_locales" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_locales" CASCADE;
  DROP TABLE "_news_v_version_populated_authors" CASCADE;
  DROP TABLE "_news_v_version_tags" CASCADE;
  DROP TABLE "_news_v_version_tags_locales" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "_news_v_locales" CASCADE;
  DROP TABLE "colleges" CASCADE;
  DROP TABLE "colleges_locales" CASCADE;
  DROP TABLE "_colleges_v" CASCADE;
  DROP TABLE "_colleges_v_locales" CASCADE;
  DROP TABLE "academic_departments" CASCADE;
  DROP TABLE "academic_departments_locales" CASCADE;
  DROP TABLE "_academic_departments_v" CASCADE;
  DROP TABLE "_academic_departments_v_locales" CASCADE;
  DROP TABLE "academic_programs" CASCADE;
  DROP TABLE "academic_programs_locales" CASCADE;
  DROP TABLE "_academic_programs_v" CASCADE;
  DROP TABLE "_academic_programs_v_locales" CASCADE;
  DROP TABLE "faculty_members_education" CASCADE;
  DROP TABLE "faculty_members_education_locales" CASCADE;
  DROP TABLE "faculty_members_experience" CASCADE;
  DROP TABLE "faculty_members_experience_locales" CASCADE;
  DROP TABLE "faculty_members_publications" CASCADE;
  DROP TABLE "faculty_members_publications_locales" CASCADE;
  DROP TABLE "faculty_members_courses" CASCADE;
  DROP TABLE "faculty_members_courses_locales" CASCADE;
  DROP TABLE "faculty_members_skills" CASCADE;
  DROP TABLE "faculty_members_skills_locales" CASCADE;
  DROP TABLE "faculty_members" CASCADE;
  DROP TABLE "faculty_members_locales" CASCADE;
  DROP TABLE "faculty_members_rels" CASCADE;
  DROP TABLE "_faculty_members_v_version_education" CASCADE;
  DROP TABLE "_faculty_members_v_version_education_locales" CASCADE;
  DROP TABLE "_faculty_members_v_version_experience" CASCADE;
  DROP TABLE "_faculty_members_v_version_experience_locales" CASCADE;
  DROP TABLE "_faculty_members_v_version_publications" CASCADE;
  DROP TABLE "_faculty_members_v_version_publications_locales" CASCADE;
  DROP TABLE "_faculty_members_v_version_courses" CASCADE;
  DROP TABLE "_faculty_members_v_version_courses_locales" CASCADE;
  DROP TABLE "_faculty_members_v_version_skills" CASCADE;
  DROP TABLE "_faculty_members_v_version_skills_locales" CASCADE;
  DROP TABLE "_faculty_members_v" CASCADE;
  DROP TABLE "_faculty_members_v_locales" CASCADE;
  DROP TABLE "_faculty_members_v_rels" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "join_requests" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_locales" CASCADE;
  DROP TABLE "blog_posts_populated_authors" CASCADE;
  DROP TABLE "blog_posts_tags" CASCADE;
  DROP TABLE "blog_posts_tags_locales" CASCADE;
  DROP TABLE "blog_posts" CASCADE;
  DROP TABLE "blog_posts_locales" CASCADE;
  DROP TABLE "_blog_posts_v_version_populated_authors" CASCADE;
  DROP TABLE "_blog_posts_v_version_tags" CASCADE;
  DROP TABLE "_blog_posts_v_version_tags_locales" CASCADE;
  DROP TABLE "_blog_posts_v" CASCADE;
  DROP TABLE "_blog_posts_v_locales" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "faqs_locales" CASCADE;
  DROP TABLE "_faqs_v" CASCADE;
  DROP TABLE "_faqs_v_locales" CASCADE;
  DROP TABLE "email_requests" CASCADE;
  DROP TABLE "team_members" CASCADE;
  DROP TABLE "team_members_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "study_plans_courses" CASCADE;
  DROP TABLE "study_plans_courses_locales" CASCADE;
  DROP TABLE "study_plans" CASCADE;
  DROP TABLE "study_plans_locales" CASCADE;
  DROP TABLE "_study_plans_v_version_courses" CASCADE;
  DROP TABLE "_study_plans_v_version_courses_locales" CASCADE;
  DROP TABLE "_study_plans_v" CASCADE;
  DROP TABLE "_study_plans_v_locales" CASCADE;
  DROP TABLE "private_media" CASCADE;
  DROP TABLE "private_media_locales" CASCADE;
  DROP TABLE "centers" CASCADE;
  DROP TABLE "centers_locales" CASCADE;
  DROP TABLE "_centers_v" CASCADE;
  DROP TABLE "_centers_v_locales" CASCADE;
  DROP TABLE "projects_images" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "projects_locales" CASCADE;
  DROP TABLE "_projects_v_version_images" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "_projects_v_locales" CASCADE;
  DROP TABLE "research_publications_tags" CASCADE;
  DROP TABLE "research_publications_tags_locales" CASCADE;
  DROP TABLE "research_publications" CASCADE;
  DROP TABLE "research_publications_locales" CASCADE;
  DROP TABLE "_research_publications_v_version_tags" CASCADE;
  DROP TABLE "_research_publications_v_version_tags_locales" CASCADE;
  DROP TABLE "_research_publications_v" CASCADE;
  DROP TABLE "_research_publications_v_locales" CASCADE;
  DROP TABLE "campus_life_highlights" CASCADE;
  DROP TABLE "campus_life_highlights_locales" CASCADE;
  DROP TABLE "campus_life_stats" CASCADE;
  DROP TABLE "campus_life_stats_locales" CASCADE;
  DROP TABLE "campus_life" CASCADE;
  DROP TABLE "campus_life_locales" CASCADE;
  DROP TABLE "_campus_life_v_version_highlights" CASCADE;
  DROP TABLE "_campus_life_v_version_highlights_locales" CASCADE;
  DROP TABLE "_campus_life_v_version_stats" CASCADE;
  DROP TABLE "_campus_life_v_version_stats_locales" CASCADE;
  DROP TABLE "_campus_life_v" CASCADE;
  DROP TABLE "_campus_life_v_locales" CASCADE;
  DROP TABLE "offers_interest_highlights" CASCADE;
  DROP TABLE "offers_interest_highlights_locales" CASCADE;
  DROP TABLE "offers" CASCADE;
  DROP TABLE "offers_locales" CASCADE;
  DROP TABLE "_offers_v_version_interest_highlights" CASCADE;
  DROP TABLE "_offers_v_version_interest_highlights_locales" CASCADE;
  DROP TABLE "_offers_v" CASCADE;
  DROP TABLE "_offers_v_locales" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "partners_locales" CASCADE;
  DROP TABLE "sliders" CASCADE;
  DROP TABLE "sliders_locales" CASCADE;
  DROP TABLE "sliders_rels" CASCADE;
  DROP TABLE "student_affairs_documents" CASCADE;
  DROP TABLE "student_affairs_documents_locales" CASCADE;
  DROP TABLE "_student_affairs_documents_v" CASCADE;
  DROP TABLE "_student_affairs_documents_v_locales" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "announcements_locales" CASCADE;
  DROP TABLE "_announcements_v" CASCADE;
  DROP TABLE "_announcements_v_locales" CASCADE;
  DROP TABLE "admission_requirements" CASCADE;
  DROP TABLE "admission_requirements_locales" CASCADE;
  DROP TABLE "_admission_requirements_v" CASCADE;
  DROP TABLE "_admission_requirements_v_locales" CASCADE;
  DROP TABLE "forms_blocks_checkbox" CASCADE;
  DROP TABLE "forms_blocks_checkbox_locales" CASCADE;
  DROP TABLE "forms_blocks_email" CASCADE;
  DROP TABLE "forms_blocks_email_locales" CASCADE;
  DROP TABLE "forms_blocks_message" CASCADE;
  DROP TABLE "forms_blocks_message_locales" CASCADE;
  DROP TABLE "forms_blocks_number" CASCADE;
  DROP TABLE "forms_blocks_number_locales" CASCADE;
  DROP TABLE "forms_blocks_select_options" CASCADE;
  DROP TABLE "forms_blocks_select_options_locales" CASCADE;
  DROP TABLE "forms_blocks_select" CASCADE;
  DROP TABLE "forms_blocks_select_locales" CASCADE;
  DROP TABLE "forms_blocks_text" CASCADE;
  DROP TABLE "forms_blocks_text_locales" CASCADE;
  DROP TABLE "forms_blocks_textarea" CASCADE;
  DROP TABLE "forms_blocks_textarea_locales" CASCADE;
  DROP TABLE "forms_blocks_upload_mime_types" CASCADE;
  DROP TABLE "forms_blocks_upload" CASCADE;
  DROP TABLE "forms_blocks_upload_locales" CASCADE;
  DROP TABLE "forms_emails" CASCADE;
  DROP TABLE "forms_emails_locales" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "forms_locales" CASCADE;
  DROP TABLE "form_submissions_submission_data" CASCADE;
  DROP TABLE "form_submissions_submission_uploads" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "form_submissions_rels" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_social_links" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  DROP TABLE "about_page_team_members" CASCADE;
  DROP TABLE "about_page_team_members_locales" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TABLE "about_page_locales" CASCADE;
  DROP TABLE "about_page_rels" CASCADE;
  DROP TABLE "_about_page_v_version_team_members" CASCADE;
  DROP TABLE "_about_page_v_version_team_members_locales" CASCADE;
  DROP TABLE "_about_page_v" CASCADE;
  DROP TABLE "_about_page_v_locales" CASCADE;
  DROP TABLE "_about_page_v_rels" CASCADE;
  DROP TABLE "contact_settings" CASCADE;
  DROP TABLE "contact_settings_locales" CASCADE;
  DROP TABLE "_contact_settings_v" CASCADE;
  DROP TABLE "_contact_settings_v_locales" CASCADE;
  DROP TABLE "smart_chat_settings" CASCADE;
  DROP TABLE "navbar_settings_top_bar_items" CASCADE;
  DROP TABLE "navbar_settings_top_bar_items_locales" CASCADE;
  DROP TABLE "navbar_settings" CASCADE;
  DROP TABLE "navbar_settings_rels" CASCADE;
  DROP TABLE "_navbar_settings_v_version_top_bar_items" CASCADE;
  DROP TABLE "_navbar_settings_v_version_top_bar_items_locales" CASCADE;
  DROP TABLE "_navbar_settings_v" CASCADE;
  DROP TABLE "_navbar_settings_v_rels" CASCADE;
  DROP TABLE "footer_settings_footer_items" CASCADE;
  DROP TABLE "footer_settings_footer_items_locales" CASCADE;
  DROP TABLE "footer_settings" CASCADE;
  DROP TABLE "footer_settings_locales" CASCADE;
  DROP TABLE "footer_settings_rels" CASCADE;
  DROP TABLE "_footer_settings_v_version_footer_items" CASCADE;
  DROP TABLE "_footer_settings_v_version_footer_items_locales" CASCADE;
  DROP TABLE "_footer_settings_v" CASCADE;
  DROP TABLE "_footer_settings_v_locales" CASCADE;
  DROP TABLE "_footer_settings_v_rels" CASCADE;
  DROP TABLE "analytics_settings" CASCADE;
  DROP TABLE "dashboard_metrics" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_system_role";
  DROP TYPE "public"."enum_pages_hero_links_link_type";
  DROP TYPE "public"."enum_pages_hero_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_stats_items_key";
  DROP TYPE "public"."enum_pages_blocks_stats_items_icon";
  DROP TYPE "public"."enum_pages_blocks_colleges_grid_variant";
  DROP TYPE "public"."enum_pages_blocks_news_grid_variant";
  DROP TYPE "public"."enum_pages_blocks_events_grid_variant";
  DROP TYPE "public"."enum_pages_blocks_blog_grid_variant";
  DROP TYPE "public"."enum_pages_blocks_campus_life_grid_kind_filter";
  DROP TYPE "public"."enum_pages_blocks_projects_grid_status_filter";
  DROP TYPE "public"."enum_pages_blocks_programs_grid_degree_filter";
  DROP TYPE "public"."enum_pages_blocks_links_links_icon";
  DROP TYPE "public"."enum_pages_hero_type";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_type";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_stats_items_key";
  DROP TYPE "public"."enum__pages_v_blocks_stats_items_icon";
  DROP TYPE "public"."enum__pages_v_blocks_colleges_grid_variant";
  DROP TYPE "public"."enum__pages_v_blocks_news_grid_variant";
  DROP TYPE "public"."enum__pages_v_blocks_events_grid_variant";
  DROP TYPE "public"."enum__pages_v_blocks_blog_grid_variant";
  DROP TYPE "public"."enum__pages_v_blocks_campus_life_grid_kind_filter";
  DROP TYPE "public"."enum__pages_v_blocks_projects_grid_status_filter";
  DROP TYPE "public"."enum__pages_v_blocks_programs_grid_degree_filter";
  DROP TYPE "public"."enum__pages_v_blocks_links_links_icon";
  DROP TYPE "public"."enum__pages_v_version_hero_type";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum__news_v_published_locale";
  DROP TYPE "public"."enum_colleges_status";
  DROP TYPE "public"."enum__colleges_v_version_status";
  DROP TYPE "public"."enum__colleges_v_published_locale";
  DROP TYPE "public"."enum_academic_departments_status";
  DROP TYPE "public"."enum__academic_departments_v_version_status";
  DROP TYPE "public"."enum__academic_departments_v_published_locale";
  DROP TYPE "public"."enum_academic_programs_degree_type";
  DROP TYPE "public"."enum_academic_programs_status";
  DROP TYPE "public"."enum__academic_programs_v_version_degree_type";
  DROP TYPE "public"."enum__academic_programs_v_version_status";
  DROP TYPE "public"."enum__academic_programs_v_published_locale";
  DROP TYPE "public"."enum_faculty_members_status";
  DROP TYPE "public"."enum__faculty_members_v_version_status";
  DROP TYPE "public"."enum__faculty_members_v_published_locale";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_join_requests_gender";
  DROP TYPE "public"."enum_join_requests_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum__events_v_published_locale";
  DROP TYPE "public"."enum_blog_posts_status";
  DROP TYPE "public"."enum__blog_posts_v_version_status";
  DROP TYPE "public"."enum__blog_posts_v_published_locale";
  DROP TYPE "public"."enum_faqs_status";
  DROP TYPE "public"."enum__faqs_v_version_status";
  DROP TYPE "public"."enum__faqs_v_published_locale";
  DROP TYPE "public"."enum_email_requests_request_type";
  DROP TYPE "public"."enum_email_requests_status";
  DROP TYPE "public"."enum_categories_kind";
  DROP TYPE "public"."enum_study_plans_courses_semester";
  DROP TYPE "public"."enum_study_plans_status";
  DROP TYPE "public"."enum__study_plans_v_version_courses_semester";
  DROP TYPE "public"."enum__study_plans_v_version_status";
  DROP TYPE "public"."enum__study_plans_v_published_locale";
  DROP TYPE "public"."enum_centers_kind";
  DROP TYPE "public"."enum_centers_status";
  DROP TYPE "public"."enum__centers_v_version_kind";
  DROP TYPE "public"."enum__centers_v_version_status";
  DROP TYPE "public"."enum__centers_v_published_locale";
  DROP TYPE "public"."enum_projects_project_status";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum__projects_v_version_project_status";
  DROP TYPE "public"."enum__projects_v_version_status";
  DROP TYPE "public"."enum__projects_v_published_locale";
  DROP TYPE "public"."enum_research_publications_status";
  DROP TYPE "public"."enum__research_publications_v_version_status";
  DROP TYPE "public"."enum__research_publications_v_published_locale";
  DROP TYPE "public"."enum_campus_life_kind";
  DROP TYPE "public"."enum_campus_life_status";
  DROP TYPE "public"."enum__campus_life_v_version_kind";
  DROP TYPE "public"."enum__campus_life_v_version_status";
  DROP TYPE "public"."enum__campus_life_v_published_locale";
  DROP TYPE "public"."enum_offers_status";
  DROP TYPE "public"."enum__offers_v_version_status";
  DROP TYPE "public"."enum__offers_v_published_locale";
  DROP TYPE "public"."enum_partners_type";
  DROP TYPE "public"."enum_sliders_link_type";
  DROP TYPE "public"."enum_student_affairs_documents_status";
  DROP TYPE "public"."enum__student_affairs_documents_v_version_status";
  DROP TYPE "public"."enum__student_affairs_documents_v_published_locale";
  DROP TYPE "public"."enum_announcements_status";
  DROP TYPE "public"."enum__announcements_v_version_status";
  DROP TYPE "public"."enum__announcements_v_published_locale";
  DROP TYPE "public"."enum_admission_requirements_status";
  DROP TYPE "public"."enum__admission_requirements_v_version_status";
  DROP TYPE "public"."enum__admission_requirements_v_published_locale";
  DROP TYPE "public"."enum_forms_blocks_upload_upload_collection";
  DROP TYPE "public"."enum_forms_confirmation_type";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_navbar_settings_top_bar_items_link_type";
  DROP TYPE "public"."enum_navbar_settings_call_to_action_type";
  DROP TYPE "public"."enum_navbar_settings_call_to_action_appearance";
  DROP TYPE "public"."enum__navbar_settings_v_version_top_bar_items_link_type";
  DROP TYPE "public"."enum__navbar_settings_v_version_call_to_action_type";
  DROP TYPE "public"."enum__navbar_settings_v_version_call_to_action_appearance";
  DROP TYPE "public"."enum_footer_settings_footer_items_link_type";
  DROP TYPE "public"."enum_footer_settings_footer_background_type";
  DROP TYPE "public"."enum__footer_settings_v_version_footer_items_link_type";
  DROP TYPE "public"."enum__footer_settings_v_version_footer_background_type";`)
}
