// Load .env files
import 'dotenv/config'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  })
}

// jsdom does not implement IntersectionObserver. framer-motion uses it
// for `whileInView` animations on the public homepage sections, so we
// install a minimal stub that immediately marks every element as in
// view. This makes section animations resolve synchronously during
// tests without changing component code.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class StubIntersectionObserver {
    constructor(_cb: IntersectionObserverCallback) {
      // Intentionally do nothing — framer-motion only checks that
      // `observe` exists; entries are produced by framer's internal
      // fallbacks when the polyfill is silent.
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: ReadonlyArray<number> = []
  }
  // Install the stub. Cast to the global shape — the contract is
  // intentionally minimal but the structure matches `IntersectionObserver`.
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    StubIntersectionObserver
}
