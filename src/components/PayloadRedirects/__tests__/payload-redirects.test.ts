import { describe, expect, it } from 'vitest'

import type { Redirect } from '@/payload-types'
import { resolveRedirectTarget, targetForRedirect } from '../index'

function redirect(from: string, url: string, id = 1): Redirect {
  return {
    id,
    from,
    to: { type: 'custom', url },
    createdAt: '',
    updatedAt: '',
  }
}

describe('PayloadRedirects resolution', () => {
  it('flattens a redirect chain at request time', () => {
    expect(resolveRedirectTarget('/a', [redirect('/a', '/b'), redirect('/b', '/c', 2)]))
      .toBe('/c')
  })

  it('rejects self redirects and cycles', () => {
    expect(resolveRedirectTarget('/a', [redirect('/a', '/a')])).toBeNull()
    expect(resolveRedirectTarget('/a', [redirect('/a', '/b'), redirect('/b', '/a', 2)]))
      .toBeNull()
  })

  it('rejects protocol-relative and non-HTTP custom destinations', () => {
    expect(targetForRedirect(redirect('/a', '//evil.example'))).toBeNull()
    expect(targetForRedirect(redirect('/a', 'javascript:alert(1)'))).toBeNull()
  })

  it('uses the central registry for a populated nested Program reference', () => {
    const target = targetForRedirect({
      id: 1,
      from: '/old',
      to: {
        type: 'reference',
        reference: {
          relationTo: 'academic-programs',
          value: { slug: 'computer-science', college: { slug: 'engineering' } } as never,
        },
      },
      createdAt: '',
      updatedAt: '',
    })

    expect(target).toBe('/colleges/engineering/programs/computer-science')
  })

  it('does not resolve an unpopulated relationship ID', () => {
    expect(targetForRedirect({
      id: 1,
      from: '/old',
      to: {
        type: 'reference',
        reference: { relationTo: 'pages', value: 42 },
      },
      createdAt: '',
      updatedAt: '',
    })).toBeNull()
  })
})
