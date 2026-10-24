'use client'

/**
 * LanguageToggle — small UI button that flips the active language.
 *
 * Renders the label of the OTHER language (so the click target shows the
 * destination, not the current state). Pure inline styles are intentionally
 * avoided in favor of utility classes; if the page is not using Tailwind,
 * the consumer should pass `className` to style this component.
 */

import { useLanguage } from './LanguageProvider'

export interface LanguageToggleProps {
  className?: string
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { t, toggleLanguage } = useLanguage()
  const targetLabel = t('common.languageToggle')
  const ariaLabel = t('common.languageToggleAria')

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={ariaLabel}
      data-testid="language-toggle"
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md border border-current px-3 py-1 text-sm font-medium hover:bg-current/10 transition-colors'
      }
    >
      <span aria-hidden="true">🌐</span>
      <span>{targetLabel}</span>
    </button>
  )
}
