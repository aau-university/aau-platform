'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

export const LivePreviewListener = () => {
  const router = useRouter()
  const isInitialRefresh = useRef(true)
  const refresh = useCallback(() => {
    // The ID-bound `/next/preview` request already rendered the latest draft.
    // Payload's eager mount refresh is redundant here and can race a following
    // Next navigation; all document-event refreshes still reach the router.
    if (isInitialRefresh.current) {
      isInitialRefresh.current = false
      return
    }
    router.refresh()
  }, [router])
  const serverURL =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SERVER_URL || ''

  return <RefreshRouteOnSave refresh={refresh} serverURL={serverURL} />
}

export default LivePreviewListener
