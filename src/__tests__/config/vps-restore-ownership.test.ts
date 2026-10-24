import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const restoreScript = readFileSync(
  path.resolve(REPO_ROOT, 'deploy/scripts/restore.sh'),
  'utf8',
)

describe('VPS restore uploads ownership', () => {
  it('fails closed unless restored uploads match the full runtime UID:GID', () => {
    // The identity is a variable rather than a literal so restore.sh and
    // initialize-from-backup.sh read it from the same place -- they install the
    // same tree for the same container, and a drill that pinned one and not the
    // other produced a tree one script could walk and the other could not.
    //
    // What matters is unchanged and asserted here: the DEFAULT is the runner
    // image's identity, and BOTH halves are verified. A correct UID with the
    // wrong primary GID is still an ownership-contract failure.
    expect(restoreScript).toMatch(/APP_UID="\$\{APP_UID:-10001\}"/)
    expect(restoreScript).toMatch(/APP_GID="\$\{APP_GID:-10001\}"/)
    expect(restoreScript).toContain('chown -R "${APP_UID}:${APP_GID}" "$staging"')
    expect(restoreScript).toContain(
      'find "$staging" \\( ! -uid "$APP_UID" -o ! -gid "$APP_GID" \\)',
    )
    expect(restoreScript).toContain('UID:GID ${APP_UID}:${APP_GID}')
  })

  it('reports an unreadable staging tree instead of dying silently', () => {
    // The probe used to be `find ... 2>/dev/null | head -5`. Under
    // `set -euo pipefail` a find that cannot descend exits non-zero, fails the
    // pipeline, fails the assignment and kills the script -- stderr discarded,
    // no message of its own. Reproduced directly: the old form exits 1 having
    // printed nothing after "extracting uploads into a staging tree", which is
    // the worst shape available here, because the operator cannot tell whether
    // anything was destroyed. (Nothing was: this is the non-destructive phase.)
    expect(restoreScript).toMatch(/owner_probe_rc=\$\?/)
    expect(restoreScript).toContain(
      'could not enumerate the staged uploads to verify their ownership',
    )
    expect(restoreScript).toContain('Nothing has been destroyed')
    expect(restoreScript).not.toMatch(/find "\$staging"[^\n]*2>\/dev\/null \| head/)
  })
})
