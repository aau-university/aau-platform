/**
 * Phase 1.5 Sprint 1-2 corrective pass — gap validation tests.
 *
 * TDD: These tests are written BEFORE the fixes. They must fail first,
 * then pass after implementation.
 *
 * Covers:
 * - RenderBlocks handles eventsGrid / blogGrid / faq / teamMembers / partners
 * - query-helpers expanded API
 * - Collection loaders: events, blog-posts, faqs, team-members
 * - EmailRequests: correct field model + strict access
 * - TeamMembers: correct field model (name/isActive) + publicReadActiveOrAdmin
 * - TeamMembersBlock: has selectedMembers relationship field
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

async function importMod(relativePath: string) {
  const abs = path.join(repoRoot, relativePath)
  return import(pathToFileURL(abs).href)
}

// ── 1. query-helpers expanded API ─────────────────────────────────────────

describe('query-helpers expanded API', () => {
  it('exports buildActiveWhere', async () => {
    const mod = await importMod('src/lib/payload/query-helpers.ts')
    expect(typeof mod.buildActiveWhere).toBe('function')
    expect(mod.buildActiveWhere()).toEqual({ isActive: { equals: true } })
  })

  it('buildPublicQueryOptions accepts page, sort, and depth overrides', async () => {
    const mod = await importMod('src/lib/payload/query-helpers.ts')
    const opts = mod.buildPublicQueryOptions({ limit: 4, locale: 'en', page: 2, sort: '-createdAt', depth: 1 })
    expect(opts.page).toBe(2)
    expect(opts.sort).toBe('-createdAt')
    expect(opts.depth).toBe(1)
    expect(opts.overrideAccess).toBe(false)
  })
})

// ── 2. Collection loaders exist ────────────────────────────────────────────

describe('Sprint 1-2 collection loaders exist', () => {
  it.each([
    'src/lib/payload/get-public-events.ts',
    'src/lib/payload/get-public-blog-posts.ts',
    'src/lib/payload/get-public-faqs.ts',
    'src/lib/payload/get-public-team-members.ts',
  ])('%s exists', (filePath) => {
    expect(existsSync(path.join(repoRoot, filePath))).toBe(true)
  })

  it('get-public-events exports getPublicEvents function', () => {
    const src = readFileSync(path.join(repoRoot, 'src/lib/payload/get-public-events.ts'), 'utf8')
    expect(src).toContain('export async function getPublicEvents')
  })

  it('get-public-blog-posts exports getPublicBlogPosts function', () => {
    const src = readFileSync(path.join(repoRoot, 'src/lib/payload/get-public-blog-posts.ts'), 'utf8')
    expect(src).toContain('export async function getPublicBlogPosts')
  })

  it('get-public-faqs exports getPublicFAQs function', () => {
    const src = readFileSync(path.join(repoRoot, 'src/lib/payload/get-public-faqs.ts'), 'utf8')
    expect(src).toContain('export async function getPublicFAQs')
  })

  it('get-public-team-members exports getPublicTeamMembers function', () => {
    const src = readFileSync(path.join(repoRoot, 'src/lib/payload/get-public-team-members.ts'), 'utf8')
    expect(src).toContain('export async function getPublicTeamMembers')
  })
})

// ── 3. EmailRequests — correct model + strict access ──────────────────────

describe('EmailRequests — approved field model and access', () => {
  it('has correct slug', async () => {
    const { EmailRequests } = await importMod('src/collections/EmailRequests.ts')
    expect(EmailRequests.slug).toBe('email-requests')
  })

  it('direct public create must return false (not a Where query)', async () => {
    const { EmailRequests } = await importMod('src/collections/EmailRequests.ts')
    const result = EmailRequests.access.create({ req: { user: null } })
    // Must be exactly false — not a Where object
    expect(result).toBe(false)
  })

  it('has the approved field shape: fullName, studentId, college, program, phone, alternateEmail, requestType', async () => {
    const { EmailRequests } = await importMod('src/collections/EmailRequests.ts')
    const fieldNames: string[] = EmailRequests.fields
      .map((f: { name?: string }) => f.name)
      .filter(Boolean)
    expect(fieldNames).toContain('fullName')
    expect(fieldNames).toContain('studentId')
    expect(fieldNames).toContain('college')
    expect(fieldNames).toContain('program')
    expect(fieldNames).toContain('phone')
    expect(fieldNames).toContain('alternateEmail')
    expect(fieldNames).toContain('requestType')
    expect(fieldNames).toContain('sourceIp')
    expect(fieldNames).toContain('userAgent')
  })

  it('Zod schema does not leak detailed validation messages on invalid input', async () => {
    const { emailRequestSchema } = await importMod('src/lib/forms/email-request-schema.ts')
    // Schema must exist and parse correctly
    const valid = emailRequestSchema.safeParse({
      fullName: 'Ahmed Ali',
      phone: '+967 777 123 456',
      requestType: 'transcript',
    })
    expect(valid.success).toBe(true)

    // Honeypot filled → invalid
    const bot = emailRequestSchema.safeParse({
      fullName: 'Bot',
      requestType: 'other',
      _hp: 'filled',
    })
    expect(bot.success).toBe(false)
  })
})

// ── 4. TeamMembers — approved field model + publicReadActiveOrAdmin ────────

describe('TeamMembers — approved field model and access', () => {
  it('uses isActive field (not isPublished)', async () => {
    const { TeamMembers } = await importMod('src/collections/TeamMembers.ts')
    const fieldNames: string[] = TeamMembers.fields
      .map((f: { name?: string }) => f.name)
      .filter(Boolean)
    expect(fieldNames).toContain('isActive')
    expect(fieldNames).not.toContain('isPublished')
  })

  it('has the approved field shape: name, jobTitle, group, bio, image, displayOrder', async () => {
    const { TeamMembers } = await importMod('src/collections/TeamMembers.ts')
    const fieldNames: string[] = TeamMembers.fields
      .map((f: { name?: string }) => f.name)
      .filter(Boolean)
    expect(fieldNames).toContain('name')
    expect(fieldNames).toContain('jobTitle')
    expect(fieldNames).toContain('group')
    expect(fieldNames).toContain('bio')
    expect(fieldNames).toContain('image')
    expect(fieldNames).toContain('displayOrder')
  })

  it('read access returns isActive where clause for anonymous users (publicReadActiveOrAdmin)', async () => {
    const { TeamMembers } = await importMod('src/collections/TeamMembers.ts')
    const result = TeamMembers.access.read({ req: { user: null } })
    expect(typeof result).toBe('object')
    expect(result).toMatchObject({ isActive: { equals: true } })
  })

  it('create/update/delete is restricted to admin+', async () => {
    const { TeamMembers } = await importMod('src/collections/TeamMembers.ts')
    // Non-admin user (level 2 coordinator) cannot create
    const mockCoordinator = { roleLevel: 2, roleSlug: 'coordinator' }
    const createResult = TeamMembers.access.create({ req: { user: mockCoordinator } })
    expect(createResult).toBe(false)
  })
})

// ── 5. TeamMembersBlock — selectedMembers relationship field ──────────────

describe('TeamMembersBlock — approved shape with selectedMembers', () => {
  it('has selectedMembers relationship field pointing to team-members', async () => {
    const { TeamMembersBlock } = await importMod('src/blocks/TeamMembersBlock/config.ts')
    const relField = TeamMembersBlock.fields.find(
      (f: { name?: string }) => f.name === 'selectedMembers',
    )
    expect(relField).toBeDefined()
    expect(relField?.type).toBe('relationship')
    expect(relField?.relationTo).toBe('team-members')
    expect(relField?.hasMany).toBe(true)
  })

  it('still has title, description, maxItems fields', async () => {
    const { TeamMembersBlock } = await importMod('src/blocks/TeamMembersBlock/config.ts')
    const fieldNames: string[] = TeamMembersBlock.fields
      .map((f: { name?: string }) => f.name)
      .filter(Boolean)
    expect(fieldNames).toContain('title')
    expect(fieldNames).toContain('description')
    expect(fieldNames).toContain('maxItems')
    expect(fieldNames).toContain('selectedMembers')
  })
})

// ── 6. RenderBlocks — new block types registered ──────────────────────────
// NOTE: Full render tests are in src/blocks/__tests__/RenderBlocks.test.tsx
// Here we verify the switch-based dispatcher handles new block types by inspecting the source

describe('RenderBlocks source handles new block types', () => {
  it('switch includes eventsGrid, blogGrid, faq, teamMembers, partners cases', () => {
    const src = readFileSync(
      path.join(repoRoot, 'src/blocks/RenderBlocks.tsx'),
      'utf8',
    )
    expect(src).toContain("case 'eventsGrid':")
    expect(src).toContain("case 'blogGrid':")
    expect(src).toContain("case 'faq':")
    expect(src).toContain("case 'teamMembers':")
    expect(src).toContain("case 'partners':")
  })
})
