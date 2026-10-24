import { describe, expect, it, vi } from 'vitest'

import { createSeedOperations } from '../lib/local-api'

describe('createSeedOperations', () => {
  it('threads one request and fixed seed options through collection operations', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findGlobal: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      updateGlobal: vi.fn().mockResolvedValue({ id: 1 }),
    }
    const req = { context: { disableRevalidate: true, seed: true } }
    const operations = createSeedOperations(payload as never, req as never)

    if (false) {
      // @ts-expect-error all-locales collection reads must use findAllLocales
      await operations.find({ collection: 'roles', locale: 'all' })
      // @ts-expect-error all-locales global reads must use findGlobalAllLocales
      await operations.findGlobal({ locale: 'all', slug: 'site-settings' })
      await operations.update({
        collection: 'roles',
        data: {
          canAccessDoctorPortal: false,
          canAccessPayloadAdmin: true,
          canAccessRefine: false,
          canAccessStudentPortal: false,
          isActive: true,
          isSystemRole: true,
          level: 5,
          name: 'Super admin',
          permissions: [],
          slug: 'super_admin',
        },
        id: 1,
        locale: 'en',
      })
    }

    await operations.find({
      collection: 'roles',
      limit: 1,
      locale: 'en',
      showHiddenFields: true,
    })
    await operations.create({
      collection: 'roles',
      data: {
        canAccessDoctorPortal: false,
        canAccessPayloadAdmin: true,
        canAccessRefine: false,
        canAccessStudentPortal: false,
        isActive: true,
        isSystemRole: true,
        level: 5,
        name: 'Super admin',
        permissions: [],
        slug: 'super_admin',
      },
      locale: 'en',
    })
    await operations.update({
      collection: 'roles',
      data: { isActive: true },
      id: 1,
    })
    await operations.findGlobal({ locale: 'ar', slug: 'site-settings' })
    await operations.updateGlobal({
      data: { siteName: 'AAU' },
      slug: 'site-settings',
    })
    await operations.findAllLocales({ collection: 'pages', limit: 1 })
    await operations.findGlobalAllLocales({ slug: 'site-settings' })

    expect(payload.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ locale: 'all' }))
    expect(payload.findGlobal).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ locale: 'all' }),
    )

    for (const call of [
      payload.find.mock.calls[0]?.[0],
      payload.create.mock.calls[0]?.[0],
      payload.update.mock.calls[0]?.[0],
      payload.findGlobal.mock.calls[0]?.[0],
      payload.updateGlobal.mock.calls[0]?.[0],
      payload.find.mock.calls[1]?.[0],
      payload.findGlobal.mock.calls[1]?.[0],
    ]) {
      expect(call).toEqual(
        expect.objectContaining({
          context: req.context,
          fallbackLocale: false,
          overrideAccess: true,
          req,
        }),
      )
    }
  })

  it('passes canonical reset context through a Local API update', async () => {
    const payload = { update: vi.fn().mockResolvedValue({ id: 1 }) }
    const req = {
      context: { canonicalSeedReset: true, disableRevalidate: true, seed: true },
    }

    await createSeedOperations(payload as never, req as never).update({
      collection: 'campus-life',
      data: { publishedAt: null },
      id: 1,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ context: req.context, req }),
    )
  })
})
