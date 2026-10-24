import Link from 'next/link'
import { cookies } from 'next/headers'

import { Button } from '@/components/ui/Button'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'

async function resolveInitialLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie
  return DEFAULT_LOCALE
}

export default async function FrontendNotFound() {
  const locale = await resolveInitialLocale()
  const isAr = locale === 'ar'
  const badge = isAr ? '404 — الصفحة غير موجودة' : '404 — Page not found'
  const title = isAr ? 'الصفحة غير موجودة' : 'Page not found'
  const description = isAr
    ? 'الصفحة المطلوبة غير موجودة أو تم نقلها.'
    : 'The page you are looking for could not be found or has been moved.'
  const backHome = isAr ? 'العودة إلى الرئيسية' : 'Back to home'

  return (
    <main className="min-h-screen bg-background px-4 py-24 text-center text-foreground">
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 shadow-elegant">
        <p className="text-sm font-semibold text-secondary">{badge}</p>
        <h1 className="mt-3 text-3xl font-display font-bold">{title}</h1>
        <p className="mt-4 text-muted-foreground">{description}</p>
        <Button asChild className="mt-8">
          <Link href="/">{backHome}</Link>
        </Button>
      </div>
    </main>
  )
}
