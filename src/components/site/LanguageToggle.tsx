'use client'

import { Globe } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { cn } from '@/lib/utils'

/**
 * LanguageToggle (header-styled) — accessible button that switches the
 * active language in place without changing the URL.
 *
 * Re-implements the `src/i18n/LanguageToggle.tsx` look with the gold
 * accent so it matches the header / footer identity. The provider's
 * `toggleLanguage` does all the work; this is presentation only.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { t, toggleLanguage } = useLanguage()
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={t('common.languageToggleAria')}
      data-testid="language-toggle"
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-3 py-1.5 text-sm font-bold',
        'hover:bg-secondary hover:text-primary hover:border-secondary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary',
        className,
      )}
    >
      <Globe className="w-4 h-4" aria-hidden="true" />
      <span>{t('common.languageToggle')}</span>
    </button>
  )
}
