import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const verifySql = readFileSync(
  path.join(process.cwd(), 'migration/simulation/02_verify.sql'),
  'utf8',
)

describe('Neon verifier publication-status UNION regression', () => {
  it('casts each table-specific PostgreSQL enum to text before UNION ALL', () => {
    const start = verifySql.indexOf("SELECT 'academic_departments'")
    const end = verifySql.indexOf(';', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)

    const statusUnion = verifySql.slice(start, end + 1)
    const expected = [
      "SELECT 'academic_departments' entity,_status::text,count(*) FROM academic_departments GROUP BY _status",
      "UNION ALL SELECT 'academic_programs',_status::text,count(*) FROM academic_programs GROUP BY _status",
      "UNION ALL SELECT 'colleges',_status::text,count(*) FROM colleges GROUP BY _status",
      "UNION ALL SELECT 'faculty_members',_status::text,count(*) FROM faculty_members GROUP BY _status",
      "UNION ALL SELECT 'study_plans',_status::text,count(*) FROM study_plans GROUP BY _status",
    ]

    for (const statement of expected) expect(statusUnion).toContain(statement)
    expect(statusUnion.match(/_status::text/g)).toHaveLength(5)
  })
})
