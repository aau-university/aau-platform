import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import configPromise from '@payload-config'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'

const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Disposition': 'attachment; filename="student-affairs-document.pdf"',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'X-Content-Type-Options': 'nosniff',
} as const

const MIME_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

type RouteContext = { params: Promise<{ id: string }> }

type RuntimePrivateMedia = {
  prefix?: string | null
}

function isRuntimePrivateMedia(value: unknown): value is RuntimePrivateMedia {
  if (!value || typeof value !== 'object') return false
  return !('prefix' in value) || value.prefix == null || typeof value.prefix === 'string'
}

function relationshipID(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

function controlledHeaders(mimeType: unknown, source?: Headers): Headers {
  const safeMimeType =
    typeof mimeType === 'string' && MIME_TYPES.has(mimeType) ? mimeType : 'application/octet-stream'
  const extension = MIME_TYPES.get(safeMimeType) ?? 'bin'
  const headers = new Headers(RESPONSE_HEADERS)

  headers.set('Content-Type', safeMimeType)
  headers.set('Content-Disposition', `attachment; filename="student-affairs-document.${extension}"`)

  for (const name of ['accept-ranges', 'content-length', 'content-range', 'etag']) {
    const value = source?.get(name)
    if (value) headers.set(name, value)
  }

  return headers
}

function notFound(): Response {
  return new Response('Not Found', { status: 404, headers: RESPONSE_HEADERS })
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { id: rawID } = await params
  if (!/^\d+$/.test(rawID)) {
    return new Response('Invalid document ID', { status: 400, headers: RESPONSE_HEADERS })
  }

  const id = Number(rawID)
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response('Invalid document ID', { status: 400, headers: RESPONSE_HEADERS })
  }

  const payload = await getPayload({ config: configPromise })

  let parent
  try {
    parent = await payload.findByID({
      collection: 'student-affairs-documents',
      id,
      depth: 0,
      draft: false,
      overrideAccess: false,
      select: {
        _status: true,
        file: true,
        fileComingSoon: true,
      },
    })
  } catch {
    return notFound()
  }

  const privateMediaID = relationshipID(parent.file)
  if (
    parent._status !== 'published' ||
    parent.fileComingSoon !== false ||
    privateMediaID === null
  ) {
    return notFound()
  }

  let privateFile
  try {
    privateFile = await payload.findByID({
      collection: 'private-media',
      id: privateMediaID,
      depth: 0,
      overrideAccess: true,
      select: {
        filename: true,
        mimeType: true,
        prefix: true,
      },
    })
  } catch {
    return notFound()
  }

  if (!isRuntimePrivateMedia(privateFile)) return notFound()
  const storagePrefix = privateFile.prefix ?? undefined

  const filename = privateFile.filename
  if (typeof filename !== 'string' || !filename || path.basename(filename) !== filename) {
    return notFound()
  }

  const privateCollection = payload.collections['private-media']
  const upload = privateCollection?.config.upload
  if (!upload || typeof upload !== 'object') return notFound()

  const payloadRequest = await createLocalReq(
    {
      req: {
        headers: new Headers(request.headers),
        signal: request.signal,
        url: request.url,
      } as Partial<PayloadRequest>,
    },
    payload,
  )

  for (const handler of upload.handlers ?? []) {
    let response
    try {
      response = await handler(payloadRequest, {
        doc: privateFile,
        headers: new Headers(),
        params: {
          collection: 'private-media',
          filename,
          prefix: storagePrefix,
        },
      })
    } catch {
      return new Response(null, { status: 502, headers: RESPONSE_HEADERS })
    }

    if (response instanceof Response) {
      if (!response.ok) {
        return response.status === 404
          ? notFound()
          : new Response(null, { status: 502, headers: RESPONSE_HEADERS })
      }
      return new Response(response.body, {
        status: response.status,
        headers: controlledHeaders(privateFile.mimeType, response.headers),
      })
    }
  }

  try {
    const root = await realpath(path.resolve(upload.staticDir || privateCollection.config.slug))
    const filePath = await realpath(path.resolve(root, filename))
    const relativePath = path.relative(root, filePath)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return notFound()

    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) return notFound()

    const stream = Readable.toWeb(createReadStream(filePath))
    const headers = controlledHeaders(privateFile.mimeType)
    headers.set('Content-Length', String(fileStats.size))
    return new Response(stream as ReadableStream, { headers })
  } catch {
    return notFound()
  }
}
