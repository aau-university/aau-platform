import { describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * Admin panel must carry the university identity, not Payload's:
 * custom Logo/Icon graphics (login screen + nav header), a university
 * title suffix (default is "- Payload"), and a university favicon
 * (default is the Payload mark).
 */
describe('admin panel branding', () => {
  it('registers university Logo and Icon graphics for the admin UI', async () => {
    const resolved = await config

    expect(resolved.admin?.components?.graphics?.Logo).toBe(
      '@/components/AdminGraphics/Logo#AdminLogo',
    )
    expect(resolved.admin?.components?.graphics?.Icon).toBe(
      '@/components/AdminGraphics/Icon#AdminIcon',
    )
  })

  it('replaces the "- Payload" title suffix and default favicon', async () => {
    const resolved = await config

    expect(resolved.admin?.meta?.titleSuffix).toBe('- جامعة الجيل الجديد')
    expect(resolved.admin?.meta?.titleSuffix).not.toMatch(/payload/i)

    const icons = resolved.admin?.meta?.icons
    expect(Array.isArray(icons)).toBe(true)
    const first = Array.isArray(icons) ? icons[0] : undefined
    const url = typeof first === 'object' && first !== null && 'url' in first ? first.url : first
    expect(url).toBe('/assets/university-logo.png')
  })
})
