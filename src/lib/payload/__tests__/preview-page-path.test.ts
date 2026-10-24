import { describe, expect, it } from 'vitest'

import { getPreviewPageRedirectPath } from '../preview-page-path'

describe('getPreviewPageRedirectPath', () => {
  it('does not redirect when the requested path matches the latest Page slug', () => {
    expect(getPreviewPageRedirectPath('about', 'about')).toBeNull()
  })

  it('redirects a stale or wrong route to the ticket-bound Page path', () => {
    expect(getPreviewPageRedirectPath('old-about', 'about')).toBe('/about')
  })

  it('redirects the home document away from /home to the site root', () => {
    expect(getPreviewPageRedirectPath('home', 'home')).toBe('/')
  })
})
