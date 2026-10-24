/**
 * `<MainLayout />` — bfcache-restore remount.
 *
 * Regression coverage for the "dead buttons after back-navigation" bug:
 * Framer Motion's `whileInView` (used across every public section
 * component, see `src/lib/animation/viewport.ts`) only evaluates once per
 * mount. When a browser restores a page from the back/forward cache
 * (bfcache) — e.g. the user opens a detail page then presses Back — React
 * does not remount anything on its own, so any section that never scrolled
 * into view before the user left stays permanently hidden/non-interactive.
 *
 * `MainLayout` fixes this by bumping a `key` on its children wrapper when
 * it observes a `pageshow` event with `persisted: true` (the standard
 * signal for "this page was served from bfcache"), forcing React to
 * unmount + remount the page subtree so every `whileInView` observer is
 * freshly created and re-evaluates current scroll position immediately.
 *
 * This test proves the remount actually happens by rendering a child that
 * records a mount each time its `useEffect(() => {...}, [])` fires — an
 * effect with an empty dependency array only re-fires on a genuine
 * unmount+remount, not on an ordinary re-render.
 */

import { act, render } from '@testing-library/react'
import { MotionConfigContext } from 'framer-motion'
import { useContext, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MainLayout } from '@/components/site/MainLayout'

function MountSpy({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount()
  }, [onMount])
  return <div data-testid="child">content</div>
}

function MotionConfigSpy({ onConfig }: { onConfig: (value: string | undefined) => void }) {
  const config = useContext(MotionConfigContext)
  useEffect(() => {
    onConfig(config.reducedMotion)
  }, [config.reducedMotion, onConfig])
  return null
}

describe('<MainLayout />', () => {
  it('applies the user reduced-motion preference to the route subtree', () => {
    const onConfig = vi.fn()
    render(
      <MainLayout>
        <MotionConfigSpy onConfig={onConfig} />
      </MainLayout>,
    )

    expect(onConfig).toHaveBeenLastCalledWith('user')
  })

  it('does NOT remount children on an ordinary re-render', () => {
    const onMount = vi.fn()
    const { rerender } = render(
      <MainLayout>
        <MountSpy onMount={onMount} />
      </MainLayout>,
    )
    expect(onMount).toHaveBeenCalledTimes(1)

    rerender(
      <MainLayout>
        <MountSpy onMount={onMount} />
      </MainLayout>,
    )
    expect(onMount).toHaveBeenCalledTimes(1)
  })

  it('remounts children when the page is restored from bfcache (pageshow persisted)', () => {
    const onMount = vi.fn()
    render(
      <MainLayout>
        <MountSpy onMount={onMount} />
      </MainLayout>,
    )
    expect(onMount).toHaveBeenCalledTimes(1)

    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent
      Object.defineProperty(event, 'persisted', { value: true })
      window.dispatchEvent(event)
    })

    expect(onMount).toHaveBeenCalledTimes(2)
  })

  it('does NOT remount children on a normal pageshow (persisted: false)', () => {
    const onMount = vi.fn()
    render(
      <MainLayout>
        <MountSpy onMount={onMount} />
      </MainLayout>,
    )
    expect(onMount).toHaveBeenCalledTimes(1)

    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent
      Object.defineProperty(event, 'persisted', { value: false })
      window.dispatchEvent(event)
    })

    expect(onMount).toHaveBeenCalledTimes(1)
  })
})
