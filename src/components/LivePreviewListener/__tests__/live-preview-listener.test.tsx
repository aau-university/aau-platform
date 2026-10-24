import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const livePreview = vi.hoisted(() => ({
  officialBridge: vi.fn((_props: { refresh: () => void; serverURL: string }) => null),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: livePreview.refresh }),
}))

vi.mock('@payloadcms/live-preview-react', () => ({
  RefreshRouteOnSave: livePreview.officialBridge,
}))

import { LivePreviewListener } from '../index'

describe('LivePreviewListener', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('delegates the same-origin refresh bridge to Payload', () => {
    render(<LivePreviewListener />)

    const props = livePreview.officialBridge.mock.calls[0]?.[0]
    expect(livePreview.officialBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: expect.any(Function),
        serverURL: window.location.origin,
      }),
      undefined,
    )

    props?.refresh()
    expect(livePreview.refresh).not.toHaveBeenCalled()
    props?.refresh()
    props?.refresh()
    expect(livePreview.refresh).toHaveBeenCalledTimes(2)
  })
})
