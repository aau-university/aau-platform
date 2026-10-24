import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

import { Breadcrumb } from '@/components/Breadcrumb'
import { EmptyState } from '@/components/common/EmptyState'
import { Container } from '@/components/ui/Container'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicFAQs } from '@/lib/payload/get-public-faqs'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'
  const description = isAr
    ? 'إجابات للأسئلة الأكثر شيوعاً من طلاب جامعة الجيل الجديد'
    : 'Answers to the most common questions from AAU students'
  return { title, description, openGraph: { title, description } }
}

export default async function FaqPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<FaqSkeleton />}>
      <FaqContent locale={locale} />
    </Suspense>
  )
}

async function FaqContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const faqs = await getPublicFAQs({ locale, limit: 30 })

  return (
    <div id="main-content" className="min-h-screen bg-background py-12 sm:py-16">
      <Container>
        <Breadcrumb
          items={[{ label: isAr ? 'الأسئلة الشائعة' : 'FAQ' }]}
          locale={locale}
        />

        <header className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <HelpCircle className="h-4 w-4" />
            {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
          </div>
          <h1 id="faq-title" className="text-balance mb-4 py-2 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h1>
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-primary to-secondary" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {isAr
              ? 'إجابات للأسئلة الأكثر شيوعاً من طلاب جامعة الجيل الجديد'
              : 'Answers to the most common questions from AAU students'}
          </p>
        </header>

        {faqs.length === 0 ? (
          <EmptyState
            title={isAr ? 'لا توجد أسئلة شائعة' : 'No FAQs available'}
            message={
              isAr
                ? 'لا توجد أسئلة شائعة منشورة حالياً.'
                : 'No published FAQs available right now.'
            }
            icon={<HelpCircle className="h-16 w-16 text-muted-foreground" />}
          />
        ) : (
          <section aria-labelledby="faq-title" className="mx-auto max-w-3xl space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <summary className="flex min-h-14 w-full cursor-pointer list-none items-center justify-between gap-4 p-4 text-start font-semibold transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:p-5">
                  <span className="leading-6">{faq.question}</span>
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none">
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  </span>
                </summary>
                <div className="border-t border-border/40 px-4 pb-5 pt-4 text-muted-foreground leading-7 sm:px-5">
                  {faq.answer}
                </div>
              </details>
            ))}
          </section>
        )}
      </Container>
    </div>
  )
}

function FaqSkeleton() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 text-center">
          <div className="mx-auto mb-4 h-6 w-32 rounded-full bg-muted" />
          <div className="mx-auto mb-4 h-12 w-full max-w-80 rounded-xl bg-muted" />
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-muted" />
          <div className="mx-auto h-6 w-2/3 rounded-md bg-muted" />
        </div>
        <div className="mx-auto max-w-3xl space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
