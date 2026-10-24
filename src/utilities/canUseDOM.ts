/**
 * True when running in a browser environment with a real DOM.
 *
 * Used to guard `window`/`document` access in code that may be imported
 * by both server and client bundles.
 */
export const canUseDOM: boolean = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
)

export default canUseDOM
