/**
 * LanguageProvider — same-URL switch behavior.
 *
 * These tests verify:
 *   1. The provider seeds itself from `initialLanguage` and exposes Arabic
 *      by default.
 *   2. Toggling/setting language updates document.documentElement.lang and dir.
 *   3. Toggling writes the cookie (we sniff document.cookie).
 *   4. The component tree re-renders the new language text without any
 *      navigation/URL change.
 *   5. `t()` returns the translated value for the active language.
 */

import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LanguageProvider, useLanguage } from '../LanguageProvider'
import { LANG_COOKIE } from '../locale'

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1]
}

describe('LanguageProvider', () => {
  it('defaults to Arabic when no initialLanguage is provided', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    })
    expect(result.current.language).toBe('ar')
    expect(result.current.direction).toBe('rtl')
  })

  it('honors initialLanguage from SSR', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => (
        <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
      ),
    })
    expect(result.current.language).toBe('en')
    expect(result.current.direction).toBe('ltr')
  })

  it('toggleLanguage flips the active language and writes the cookie', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => (
        <LanguageProvider initialLanguage="ar">{children}</LanguageProvider>
      ),
    })

    act(() => result.current.toggleLanguage())
    expect(result.current.language).toBe('en')
    expect(readCookie(LANG_COOKIE)).toBe('en')

    act(() => result.current.toggleLanguage())
    expect(result.current.language).toBe('ar')
    expect(readCookie(LANG_COOKIE)).toBe('ar')
  })

  it('setLanguage updates <html lang> and <html dir>', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => (
        <LanguageProvider initialLanguage="ar">{children}</LanguageProvider>
      ),
    })

    act(() => result.current.setLanguage('en'))
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')

    act(() => result.current.setLanguage('ar'))
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('children re-render with the new translation when language flips', () => {
    function Probe() {
      const { t, toggleLanguage } = useLanguage()
      return (
        <div>
          <span data-testid="apply">{t('common.applyNow')}</span>
          <button type="button" onClick={toggleLanguage}>
            switch
          </button>
        </div>
      )
    }

    render(
      <LanguageProvider initialLanguage="ar">
        <Probe />
      </LanguageProvider>,
    )

    expect(screen.getByTestId('apply').textContent).toBe('التقديم الآن')
    act(() => screen.getByText('switch').click())
    expect(screen.getByTestId('apply').textContent).toBe('Apply Now')
  })

  it('ignores invalid setLanguage values', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => (
        <LanguageProvider initialLanguage="ar">{children}</LanguageProvider>
      ),
    })
    // @ts-expect-error — passing invalid locale on purpose
    act(() => result.current.setLanguage('fr'))
    expect(result.current.language).toBe('ar')
  })
})
