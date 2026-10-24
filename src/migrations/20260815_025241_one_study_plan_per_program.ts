import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "academicProgram_idx";
  DROP INDEX "version_academicProgram_idx";
  DROP INDEX "study_plans_academic_program_idx";
  CREATE UNIQUE INDEX "study_plans_academic_program_idx" ON "study_plans" USING btree ("academic_program_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "study_plans_academic_program_idx";
  CREATE INDEX "academicProgram_idx" ON "study_plans" USING btree ("academic_program_id");
  CREATE INDEX "version_academicProgram_idx" ON "_study_plans_v" USING btree ("version_academic_program_id");
  CREATE INDEX "study_plans_academic_program_idx" ON "study_plans" USING btree ("academic_program_id");`)
}
