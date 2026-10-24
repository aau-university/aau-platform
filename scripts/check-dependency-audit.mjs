/**
 * Dependency vulnerability gate.
 *
 * ── Why this is not a bare `pnpm audit` ───────────────────────────────────
 * A plain `pnpm audit --audit-level=high` was red on the very first run: the
 * tree already carried 24 high/critical advisories, almost all of them
 * transitive through Payload and Next. A gate that is red on day one for
 * reasons nobody in the current change can fix is not a gate — it is a step
 * everyone learns to skip, and then a genuinely new vulnerability slips past it
 * unnoticed.
 *
 * Nor is the answer to lower the threshold or drop the check. Both would hide
 * the debt instead of tracking it.
 *
 * So the gate compares against a recorded baseline
 * (`.github/security/audit-baseline.json`):
 *
 *   NEW advisory, not in the baseline        -> FAIL. This change introduced it.
 *   Baseline advisory still present          -> reported, does not fail.
 *   Baseline advisory no longer present      -> FAIL, with instructions to
 *                                               remove it, so the baseline
 *                                               cannot silently rot into a
 *                                               permanent exemption list.
 *
 * The baseline carries a review date. It is debt with an owner, not a mute
 * button.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BASELINE_PATH = '.github/security/audit-baseline.json'

function runAudit() {
  try {
    // `pnpm audit` exits non-zero when it finds anything, which is the normal
    // case here — the findings are on stdout either way.
    return execFileSync('pnpm', ['audit', '--audit-level=high', '--prod', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    if (typeof error.stdout === 'string' && error.stdout.trim().startsWith('{')) {
      return error.stdout
    }
    throw error
  }
}

const report = JSON.parse(runAudit())
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))

const found = new Map()
for (const advisory of Object.values(report.advisories ?? {})) {
  const id = advisory.github_advisory_id ?? String(advisory.id)
  if (!found.has(id)) {
    found.set(id, {
      id,
      module: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title ?? '',
      patched: advisory.patched_versions ?? '',
    })
  }
}

const baselined = new Set(Object.keys(baseline.advisories ?? {}))
const introduced = [...found.values()].filter((a) => !baselined.has(a.id))
const resolved = [...baselined].filter((id) => !found.has(id))

console.log(
  `high/critical advisories: ${found.size} found, ${baselined.size} baselined, ` +
    `${introduced.length} new, ${resolved.length} resolved`,
)

if (introduced.length > 0) {
  console.error('\nThis change introduces vulnerabilities that were not present before:\n')
  for (const a of introduced) {
    console.error(`  ${a.severity.padEnd(8)} ${a.module}  ${a.id}`)
    console.error(`           ${a.title}`)
    console.error(`           fixed in ${a.patched}`)
  }
  console.error('\nUpgrade the dependency. Adding it to the baseline is not the fix.')
  process.exit(1)
}

// ── Attribute drift ───────────────────────────────────────────────────────
// Matching on ID ALONE is not enough. A GHSA entry is not immutable: its
// severity can be re-rated, its affected range widened to cover a package the
// baseline recorded as untouched, and its `patched_versions` can go from
// "no fix available" to a real fix. Any of those changes what the baseline
// MEANS while its ID stays the same — so the entry silently keeps exempting an
// advisory nobody has re-read.
//
// The case that matters most is `patched`: an advisory baselined as
// unfixable becoming fixable is precisely the moment to act on it, and an
// ID-only comparison is blind to exactly that.
const drifted = []
for (const advisory of found.values()) {
  const entry = baseline.advisories[advisory.id]
  if (!entry) continue
  for (const field of ['module', 'severity', 'patched']) {
    const recorded = entry[field] ?? ''
    const current = advisory[field] ?? ''
    if (recorded !== current) {
      drifted.push({ id: advisory.id, field, recorded, current })
    }
  }
}

if (drifted.length > 0) {
  console.error('\nBaselined advisories have CHANGED since they were recorded:\n')
  for (const d of drifted) {
    console.error(`  ${d.id}  ${d.field}`)
    console.error(`           recorded: ${d.recorded || '<empty>'}`)
    console.error(`           now:      ${d.current || '<empty>'}`)
  }
  console.error(
    '\nRe-read each one before updating the baseline. A severity re-rating or a ' +
      'newly available fix is the point at which known debt stops being acceptable — ' +
      'not a field to copy across.',
  )
  process.exit(1)
}

if (resolved.length > 0) {
  console.error('\nThese baselined advisories are no longer present:\n')
  for (const id of resolved) {
    const entry = baseline.advisories[id]
    console.error(`  ${id}  (${entry.module})`)
  }
  console.error(
    `\nRemove them from ${BASELINE_PATH}. A baseline that is never pruned stops ` +
      'being a record of known debt and becomes a permanent exemption list.',
  )
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
if (baseline.review_by && today > baseline.review_by) {
  console.error(
    `\nThe audit baseline was due for review on ${baseline.review_by}. ` +
      'Re-evaluate the outstanding advisories and set a new date.',
  )
  process.exit(1)
}

if (found.size > 0) {
  console.log(`\nOutstanding known debt (review by ${baseline.review_by}):\n`)
  const byModule = new Map()
  for (const a of found.values()) {
    byModule.set(a.module, (byModule.get(a.module) ?? 0) + 1)
  }
  for (const [module, count] of [...byModule].sort()) {
    console.log(`  ${module} (${count})`)
  }
  console.log('\nNothing new was introduced by this change.')
}
