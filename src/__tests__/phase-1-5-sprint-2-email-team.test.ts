import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { homepageBlocks } from '@/blocks'
import config from '@/payload.config'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

async function importWorkspaceModule(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath)
  return import(pathToFileURL(absolutePath).href)
}

describe('Phase 1.5 Sprint 2 — EmailRequests, TeamMembers, Blocks, Route Handler', () => {
  it('registers Sprint 2 collections in payload config', async () => {
    const resolved = await config
    const slugs = resolved.collections?.map((c) => c.slug) ?? []

    expect(slugs).toContain('email-requests')
    expect(slugs).toContain('team-members')
  })

  it('EmailRequests collection has correct access control (no public create)', async () => {
    const { EmailRequests } = await importWorkspaceModule('src/collections/EmailRequests.ts')

    expect(EmailRequests.slug).toBe('email-requests')
    expect(EmailRequests.access).toMatchObject({
      create: expect.any(Function),
      read: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    })

    // Public (no user) must NOT be allowed to create
    const createResult = EmailRequests.access.create({ req: { user: null } })
    expect(createResult).toBe(false)

    // Public (no user) must NOT be allowed to read
    const readResult = EmailRequests.access.read({ req: { user: null } })
    expect(readResult).toBe(false)
  })

  it('EmailRequests has approved field shape: fullName, requestType, sourceIp, userAgent', async () => {
    const { EmailRequests } = await importWorkspaceModule('src/collections/EmailRequests.ts')

    const fieldNames = EmailRequests.fields.map((f: { name?: string }) => f.name).filter(Boolean)
    expect(fieldNames).toContain('fullName')
    expect(fieldNames).toContain('requestType')
    expect(fieldNames).toContain('sourceIp')
    expect(fieldNames).toContain('userAgent')
  })

  it('TeamMembers collection has publicReadActiveOrAdmin read access and slug', async () => {
    const { TeamMembers } = await importWorkspaceModule('src/collections/TeamMembers.ts')

    expect(TeamMembers.slug).toBe('team-members')
    expect(TeamMembers.access).toMatchObject({
      create: expect.any(Function),
      read: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    })

    // Public (no user) gets a where query (active only), not true/false
    const readResult = TeamMembers.access.read({ req: { user: null } })
    expect(typeof readResult).toBe('object')
    expect(readResult).toMatchObject({ isActive: { equals: true } })
  })

  it('wires Sprint 2 blocks into homepageBlocks', () => {
    const slugs = homepageBlocks.map((block) => block.slug)
    expect(slugs).toContain('teamMembers')
    expect(slugs).toContain('partners')
  })

  it('email-request Zod schema validates correct input and rejects honeypot', async () => {
    const { emailRequestSchema } = await importWorkspaceModule('src/lib/forms/email-request-schema.ts')

    const valid = emailRequestSchema.safeParse({
      fullName: 'Ahmed Ali',
      phone: '+967 777 123',
      requestType: 'transcript',
    })
    expect(valid.success).toBe(true)

    // Honeypot filled → invalid
    const bot = emailRequestSchema.safeParse({
      fullName: 'Bot',
      requestType: 'other',
      _hp: 'filled-by-bot',
    })
    expect(bot.success).toBe(false)
  })

  it('email-request route handler file exists', () => {
    const routePath = path.join(repoRoot, 'src/app/api/public/email-request/route.ts')
    expect(existsSync(routePath), 'email-request route.ts should exist').toBe(true)
  })

  it('AboutPage global has teamMembersRelationship field and legacy teamMembers array', async () => {
    const { AboutPage } = await importWorkspaceModule('src/globals/AboutPage/index.ts')

    const fieldNames = AboutPage.fields.map((f: { name?: string }) => f.name).filter(Boolean)
    expect(fieldNames).toContain('teamMembersRelationship')
    expect(fieldNames).toContain('teamMembers')
  })

  it('email-request route returns generic validation errors and does not leak Zod messages', async () => {
    const { POST } = await importWorkspaceModule('src/app/api/public/email-request/route.ts')
    
    // Create an invalid request (missing required fullName)
    const req = new NextRequest('http://localhost/api/public/email-request', {
      method: 'POST',
      body: JSON.stringify({
        requestType: 'transcript',
        phone: '123'
      })
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.ok).toBe(false)
    expect(data.code).toBe('validation_failed')
    // Ensure Zod details are NOT present
    expect(data.issues).toBeUndefined()
    expect(data.errors).toBeUndefined()
  })
})
