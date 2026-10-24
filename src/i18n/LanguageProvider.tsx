'use client'

/**
 * LanguageProvider — same-URL bilingual switch (cookie-based).
 *
 * Strategy: see `src/i18n/locale.ts`.
 *
 * - Reads the initial locale from a SSR-provided prop so there is no flash.
 * - On `setLanguage` / `toggleLanguage`, updates the cookie, the `<html lang>`
 *   and `<html dir>` attributes, and re-renders subscribed components.
 * - Does NOT navigate. The URL never changes when the user toggles language.
 * - Exposes a typed `t(key)` helper bound to the current language.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  getDirection,
  isLocale,
  type Locale,
} from './locale'
import { translate, type DictKey } from './dictionary'

interface LanguageContextValue {
  language: Locale
  direction: 'rtl' | 'ltr'
  setLanguage: (next: Locale) => void
  toggleLanguage: () => void
  t: (key: DictKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function writeCookie(value: Locale) {
  if (typeof document === 'undefined') return
  // path=/ so admin and public share the same preference; SameSite=Lax for
  // good UX on top-level navigations and decent CSRF posture.
  document.cookie = `${LANG_COOKIE}=${value}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`
}

function applyDocumentAttributes(value: Locale) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.setAttribute('lang', value)
  html.setAttribute('dir', getDirection(value))
}

export interface LanguageProviderProps {
  /** Locale resolved on the server from the cookie (or default). */
  initialLanguage?: Locale
  children: ReactNode
}

export function LanguageProvider({ initialLanguage, children }: LanguageProviderProps) {
  const router = useRouter()
  const safeInitial: Locale = isLocale(initialLanguage) ? initialLanguage : DEFAULT_LOCALE
  const [language, setLanguageState] = useState<Locale>(safeInitial)

  // Keep document attributes in sync (handles the case where the user changes
  // language on the client after SSR).
  useEffect(() => {
    applyDocumentAttributes(language)
  }, [language])

  const setLanguage = useCallback((next: Locale) => {
    if (!isLocale(next)) return
    setLanguageState(next)
    writeCookie(next)
    applyDocumentAttributes(next)
    router.refresh()
  }, [router])

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }, [language, setLanguage])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction: getDirection(language),
      setLanguage,
      toggleLanguage,
      t: (key: DictKey) => translate(language, key),
    }),
    [language, setLanguage, toggleLanguage],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used inside <LanguageProvider />')
  }
  return ctx
}
