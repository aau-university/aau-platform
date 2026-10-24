import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payloadBoundary = vi.hoisted(() => ({
  commitTransaction: vi.fn(),
  createLocalReq: vi.fn(),
  initTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

vi.mock('payload', () => payloadBoundary)

import { runSeed } from '../run-seed'
import { seedResetTargets, type SeedResetTarget, type SeedStageContext } from '../lib/types'
import {
  directPoolOptions,
  restoreSeedTestEnvironment,
  setupSeedTestEnvironment,
} from './run-seed.test-helpers'

describe('runSeed stage configuration', () => {
  let environment: ReturnType<typeof setupSeedTestEnvironment>

  beforeEach(() => {
    environment = setupSeedTestEnvironment()
    vi.resetAllMocks()
  })

  afterEach(() => {
    restoreSeedTestEnvironment(environment)
  })

  it('rejects multiple bootstrap-enabled stages before lock acquisition', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const connect = vi.fn().mockResolvedValue(client)
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }
    const firstStage = vi
      .fn()
      .mockResolvedValue({ conflict: 0, created: 0, skipped: 0, updated: 0 })
    const secondStage = vi
      .fn()
      .mockResolvedValue({ conflict: 0, created: 0, skipped: 0, updated: 0 })

    await expect(
      runSeed(payload as never, {
        stages: [
          { allowBootstrapUser: true, name: 'bootstrap-admin', run: firstStage },
          { allowBootstrapUser: true, name: 'demo-users', run: secondStage },
        ],
      }),
    ).rejects.toThrow('Only one seed stage may allow bootstrap user creation')

    expect(connect).not.toHaveBeenCalled()
    expect(firstStage).not.toHaveBeenCalled()
    expect(secondStage).not.toHaveBeenCalled()
  })

  it('rejects target reset in production before lock acquisition', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'production')
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    try {
      await expect(runSeed(payload as never, { resetTarget: 'news', stages: [] })).rejects.toThrow(
        'Content seed reset is not permitted in production',
      )
      expect(connect).not.toHaveBeenCalled()
    } finally {
      vi.stubEnv('NODE_ENV', originalNodeEnv)
    }
  })

  // The refusal above used to be the ONLY production guard inside runSeed, and
  // it fired only when a resetTarget was present. A broad `full` seed — no
  // reset target — reached the stages, so `src/seed/run.ts` and the
  // authenticated seed route could write the canonical content over production
  // data. These two cases pin the guard at the function every caller shares.
  it('rejects a full seed in production before lock acquisition', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'production')
    const connect = vi.fn()
    const stage = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    try {
      await expect(
        runSeed(payload as never, { stages: [{ name: 'content', run: stage }] }),
      ).rejects.toThrow('Content seed is not permitted in production')
      // Nothing may be taken or written: not the advisory lock, not a stage.
      expect(connect).not.toHaveBeenCalled()
      expect(stage).not.toHaveBeenCalled()
    } finally {
      vi.stubEnv('NODE_ENV', originalNodeEnv)
    }
  })

  it('rejects a default full seed — no options at all — in production', async () => {
    // This is exactly `src/seed/run.ts`: `runSeed(payload)`.
    const originalNodeEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'production')
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    try {
      await expect(runSeed(payload as never)).rejects.toThrow(
        'Content seed is not permitted in production',
      )
      expect(connect).not.toHaveBeenCalled()
    } finally {
      vi.stubEnv('NODE_ENV', originalNodeEnv)
    }
  })

  it('still permits a full seed in the staging deployment', async () => {
    // The guard must not repeat the NODE_ENV mistake: the VPS runner sets
    // NODE_ENV=production in staging too, so only AAU_ENV may decide.
    const originalNodeEnv = process.env.NODE_ENV
    const originalAauEnv = process.env.AAU_ENV
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AAU_ENV', 'staging')
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    try {
      // It gets past the deployment guard and reaches the lock — which is the
      // proof. What the lock then does is another test's business.
      await expect(runSeed(payload as never, { stages: [] })).rejects.not.toThrow(
        'not permitted in production',
      )
    } finally {
      vi.stubEnv('NODE_ENV', originalNodeEnv)
      vi.stubEnv('AAU_ENV', originalAauEnv)
    }
  })

  it('rejects a reset target outside the content allowlist before lock acquisition', async () => {
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    await expect(
      runSeed(payload as never, { resetTarget: 'users' as never, stages: [] }),
    ).rejects.toThrow('Unsupported content seed reset target: users')
    expect(connect).not.toHaveBeenCalled()
  })

  it('rejects dashboard reset before lock or request creation', async () => {
    const connect = vi.fn()
    const payload = { db: { pool: { connect }, poolOptions: directPoolOptions } }

    await expect(
      runSeed(payload as never, { resetTarget: 'dashboard-metrics' as never }),
    ).rejects.toThrow('Unsupported content seed reset target: dashboard-metrics')
    expect(connect).not.toHaveBeenCalled()
    expect(payloadBoundary.createLocalReq).not.toHaveBeenCalled()
  })

  it('rejects keyless reset targets before lock or request creation', async () => {
    for (const resetTarget of [
      'sliders',
      'student-affairs-documents',
      'admission-requirements',
    ] as const) {
      const connect = vi.fn()
      const payload = {
        create: vi.fn(),
        db: { pool: { connect }, poolOptions: directPoolOptions },
        update: vi.fn(),
      }

      await expect(
        runSeed(payload as never, { resetTarget: resetTarget as never }),
      ).rejects.toThrow(`Unsupported content seed reset target: ${resetTarget}`)
      expect(connect).not.toHaveBeenCalled()
      expect(payloadBoundary.createLocalReq).not.toHaveBeenCalled()
      expect(payload.create).not.toHaveBeenCalled()
      expect(payload.update).not.toHaveBeenCalled()
    }
  })

  it('exposes the exact supported identity and global reset targets', () => {
    expect(seedResetTargets).toEqual([
      'team-members',
      'news',
      'events',
      'blog-posts',
      'faqs',
      'announcements',
      'centers',
      'projects',
      'research-publications',
      'campus-life',
      'offers',
      'partners',
      'navigation-menus',
      'pages',
      'site-settings',
      'about-page',
      'contact-settings',
      'smart-chat-settings',
      'navbar-settings',
      'footer-settings',
      'analytics-settings',
    ])
  })

  it('rejects a broad reset array before lock acquisition', async () => {
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    await expect(
      runSeed(payload as never, { resetTarget: ['news', 'offers'] as never, stages: [] }),
    ).rejects.toThrow('Content seed reset target must be singular')
    expect(connect).not.toHaveBeenCalled()
  })

  it('rejects the removed plural reset property at runtime before lock acquisition', async () => {
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    await expect(
      runSeed(payload as never, { resetTargets: ['news', 'offers'], stages: [] } as never),
    ).rejects.toThrow('Content seed reset target must be singular')
    expect(connect).not.toHaveBeenCalled()
  })

  it('passes one explicitly allowlisted reset target to stage state', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)
    const stage = vi.fn(async ({ state }: SeedStageContext) => {
      expect(state.resetTarget).toBe('news')
      return { conflict: 0, created: 0, skipped: 0, updated: 0 }
    })

    await runSeed(payload as never, {
      resetTarget: 'news',
      stages: [{ name: 'content', resetTargets: ['news'], run: stage }],
    })

    expect(stage).toHaveBeenCalledOnce()
    expect(payloadBoundary.createLocalReq).toHaveBeenCalledWith(
      {
        context: { canonicalSeedReset: true, disableRevalidate: true, seed: true },
        fallbackLocale: false,
      },
      payload,
    )
  })

  it('runs only the single stage that owns a targeted reset', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    payloadBoundary.createLocalReq.mockResolvedValue({ payload })
    payloadBoundary.initTransaction.mockResolvedValue(true)
    const owner = vi
      .fn()
      .mockResolvedValue({ conflict: 0, created: 0, skipped: 0, updated: 1 })
    const unrelatedSlugStage = vi.fn()
    const unrelatedKeylessStage = vi.fn()

    const result = await runSeed(payload as never, {
      resetTarget: 'news',
      stages: [
        { name: 'taxonomy', run: unrelatedSlugStage },
        { name: 'editorial', resetTargets: ['news'], run: owner },
        { name: 'keyless', run: unrelatedKeylessStage },
      ],
    })

    expect(result.stages.map(({ name }) => name)).toEqual(['editorial'])
    expect(owner).toHaveBeenCalledOnce()
    expect(unrelatedSlugStage).not.toHaveBeenCalled()
    expect(unrelatedKeylessStage).not.toHaveBeenCalled()
    expect(payloadBoundary.createLocalReq).toHaveBeenCalledOnce()
  })

  it('rejects a reset without exactly one configured owning stage before lock acquisition', async () => {
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    await expect(
      runSeed(payload as never, {
        resetTarget: 'news',
        stages: [{ name: 'roles', run: vi.fn() }],
      }),
    ).rejects.toThrow('must have exactly one configured owning stage')
    expect(connect).not.toHaveBeenCalled()
  })

  if (false) {
    // @ts-expect-error broad reset arrays are not part of the server API
    void runSeed({} as never, { resetTargets: ['news', 'offers'] })
    // @ts-expect-error keyless collections cannot be reset without stable schema identity
    const sliderReset: SeedResetTarget = 'sliders'
    // @ts-expect-error keyless collections cannot be reset without stable schema identity
    const studentDocumentReset: SeedResetTarget = 'student-affairs-documents'
    // @ts-expect-error keyless collections cannot be reset without stable schema identity
    const admissionRequirementReset: SeedResetTarget = 'admission-requirements'
    void [sliderReset, studentDocumentReset, admissionRequirementReset]
  }
})
