import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createLocalReqMock, findByIDMock, getPayloadMock } = vi.hoisted(() => ({
  createLocalReqMock: vi.fn(),
  findByIDMock: vi.fn(),
  getPayloadMock: vi.fn(),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    createLocalReq: createLocalReqMock,
    getPayload: getPayloadMock,
  }
})
vi.mock('@payload-config', () => ({ default: {} }))

import { GET } from '@/app/api/public/student-affairs-documents/[id]/download/route'

const request = new Request(
  'http://localhost:3000/api/public/student-affairs-documents/12/download',
)

function context(id = '12') {
  return { params: Promise.resolve({ id }) }
}

function publishedParent(file: number | null = 41) {
  return {
    id: 12,
    _status: 'published',
    fileComingSoon: false,
    file,
  }
}

function privateFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 41,
    filename: 'private-source-name.pdf',
    mimeType: 'application/pdf',
    prefix: 'student-affairs',
    ...overrides,
  }
}

describe('public Student Affairs document download', () => {
  let localDirectory: string | undefined

  beforeEach(() => {
    findByIDMock.mockReset()
    getPayloadMock.mockReset()
    createLocalReqMock.mockReset()

    const payload = {
      collections: {
        'private-media': {
          config: {
            slug: 'private-media',
            upload: { staticDir: 'uploads/private' },
          },
        },
      },
      findByID: findByIDMock,
      logger: { error: vi.fn() },
    }
    getPayloadMock.mockResolvedValue(payload)
    createLocalReqMock.mockImplementation(async ({ req }) => ({ ...req, payload }))
  })

  afterEach(async () => {
    if (localDirectory) {
      await rm(localDirectory, { force: true, recursive: true })
      localDirectory = undefined
    }
  })

  it('streams the exact bound private relation through the configured cloud handler', async () => {
    const handler = vi.fn(
      async () =>
        new Response('cloud-file', {
          headers: {
            'Content-Disposition': 'inline; filename="private-source-name.pdf"',
            'Content-Type': 'text/plain',
            'X-Amz-Meta-Private-Key': 'secret/object/key',
          },
        }),
    )
    const payload = await getPayloadMock()
    payload.collections['private-media'].config.upload.handlers = [handler]
    getPayloadMock.mockResolvedValue(payload)
    findByIDMock.mockResolvedValueOnce(publishedParent()).mockResolvedValueOnce(privateFile())

    const response = await GET(request, context())

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('cloud-file')
    expect(findByIDMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'student-affairs-documents',
        id: 12,
        depth: 0,
        draft: false,
        overrideAccess: false,
      }),
    )
    expect(findByIDMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'private-media',
        id: 41,
        depth: 0,
        overrideAccess: true,
      }),
    )
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.any(Object) }),
      expect.objectContaining({
        doc: expect.objectContaining({ id: 41 }),
        params: {
          collection: 'private-media',
          filename: 'private-source-name.pdf',
          prefix: 'student-affairs',
        },
      }),
    )
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="student-affairs-document.pdf"',
    )
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-amz-meta-private-key')).toBeNull()
    expect(response.headers.get('content-disposition')).not.toContain('private-source-name')
  })

  it('streams a path-contained local file when no upload handler responds', async () => {
    localDirectory = await mkdtemp(path.join(tmpdir(), 'student-affairs-download-'))
    await writeFile(path.join(localDirectory, 'bound.pdf'), 'local-file')
    const payload = await getPayloadMock()
    payload.collections['private-media'].config.upload.staticDir = localDirectory
    getPayloadMock.mockResolvedValue(payload)
    findByIDMock
      .mockResolvedValueOnce(publishedParent())
      .mockResolvedValueOnce(privateFile({ filename: 'bound.pdf', prefix: undefined }))

    const response = await GET(request, context())

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('local-file')
    expect(response.headers.get('content-length')).toBe('10')
  })

  it.each([
    ['missing parent', null],
    ['draft parent', { ...publishedParent(), _status: 'draft' }],
    ['coming-soon parent', { ...publishedParent(), fileComingSoon: true }],
    [
      'parent without an explicit not-coming-soon state',
      { ...publishedParent(), fileComingSoon: undefined },
    ],
    ['parent without a file', publishedParent(null)],
  ])('returns 404 for a %s', async (_case, parent) => {
    if (parent === null) {
      findByIDMock.mockRejectedValueOnce(new Error('Not found'))
    } else {
      findByIDMock.mockResolvedValueOnce(parent)
    }

    const response = await GET(request, context())

    expect(response.status).toBe(404)
    expect(findByIDMock).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when the exact bound private relation no longer exists', async () => {
    findByIDMock
      .mockResolvedValueOnce(publishedParent(41))
      .mockRejectedValueOnce(new Error('Not found'))

    const response = await GET(request, context())

    expect(response.status).toBe(404)
  })

  it('rejects an invalid runtime storage prefix before invoking upload handlers', async () => {
    const handler = vi.fn(async () => new Response('unexpected'))
    const payload = await getPayloadMock()
    payload.collections['private-media'].config.upload.handlers = [handler]
    getPayloadMock.mockResolvedValue(payload)
    findByIDMock
      .mockResolvedValueOnce(publishedParent(41))
      .mockResolvedValueOnce(privateFile({ prefix: 123 }))

    const response = await GET(request, context())

    expect(response.status).toBe(404)
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores arbitrary private-media query input and resolves only the parent relation', async () => {
    findByIDMock.mockResolvedValueOnce(publishedParent(41)).mockResolvedValueOnce(privateFile())
    const handler = vi.fn(async () => new Response('bound-file'))
    const payload = await getPayloadMock()
    payload.collections['private-media'].config.upload.handlers = [handler]
    getPayloadMock.mockResolvedValue(payload)

    const response = await GET(
      new Request(`${request.url}?privateMediaId=999&filename=other.pdf`),
      context(),
    )

    expect(response.status).toBe(200)
    expect(findByIDMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 41 }))
    expect(JSON.stringify(findByIDMock.mock.calls)).not.toContain('999')
    expect(JSON.stringify(findByIDMock.mock.calls)).not.toContain('other.pdf')
  })

  it.each(['', '0', '-1', '1.5', 'abc', '../41'])('rejects malformed parent ID %j', async (id) => {
    const response = await GET(request, context(id))

    expect(response.status).toBe(400)
    expect(getPayloadMock).not.toHaveBeenCalled()
  })
})
