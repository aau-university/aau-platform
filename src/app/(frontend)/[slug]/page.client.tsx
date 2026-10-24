'use client'

/**
 * `PageClient` — client-side controller for the `[slug]` page route.
 *
 * Stub: renders nothing. PR-018 wires this to the `useHeaderTheme()`
 * hook so the page can signal a header theme (e.g. `dark` over a hero
 * image with a dark overlay) to the `SiteHeader`. The wiring lives in
 * a client component (this file) because:
 *
 *   - `useHeaderTheme()` is a hook → client-only.
 *   - The server component (`page.tsx`) cannot call hooks.
 *   - Mounting a client child is the standard Next.js pattern for
 *     bridging server-rendered content + client-only effects.
 *
 * For now, this is a no-op so the route renders without the providers
 * layer (which lands in PR-018). Once PR-018 lands, this component
 * will read the hero `theme` field (or a sensible default) and call
 * `useHeaderTheme().setTheme(...)` on mount.
 */
export const PageClient = () => null

export default PageClient
