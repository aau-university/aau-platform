'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/i18n/LanguageProvider'

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[frontend:error]', error)
    }
  }, [error])

  const badge = isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error'
  const title = isAr ? 'تعذّر تحميل هذه الصفحة' : 'Unable to load this page'
  const description = isAr
    ? 'يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، تواصل مع إدارة الجامعة.'
    : 'Please try again. If the issue persists, contact the university administration.'
  const cta = isAr ? 'إعادة المحاولة' : 'Try again'

  return (
    <main className="min-h-screen bg-background px-4 py-24 text-center text-foreground">
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 shadow-elegant">
        <p className="text-sm font-semibold text-secondary">{badge}</p>
        <h1 className="mt-3 text-3xl font-display font-bold">{title}</h1>
        <p className="mt-4 text-muted-foreground">{description}</p>
        <Button className="mt-8" onClick={reset}>
          {cta}
        </Button>
      </div>
    </main>
  )
}
