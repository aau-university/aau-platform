'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import type { Locale } from '@/i18n/locale'

interface AdmissionErrorBannerProps {
  code: 'validation_failed' | 'rate_limited' | 'server_error' | 'network' | null
  locale: Locale
}

export function AdmissionErrorBanner({ code, locale }: AdmissionErrorBannerProps) {
  if (!code) return null

  const isAr = locale === 'ar'
  const messages: Record<NonNullable<typeof code>, string> = {
    validation_failed: isAr
      ? 'يرجى التحقق من صحة البيانات المدخلة والمرفقات.'
      : 'Please check the submitted fields and attachments.',
    rate_limited: isAr
      ? 'لقد تجاوزت عدد المحاولات المسموح بها لليوم. حاول لاحقاً.'
      : 'You have exceeded the maximum submissions. Please try again later.',
    server_error: isAr
      ? 'حدث خطأ في الخادم أثناء المعالجة. يرجى التواصل مع الدعم الفني.'
      : 'Internal server error. Please contact tech support.',
    network: isAr
      ? 'تعذّر الاتصال بالشبكة. تحقق من جودة الإنترنت وحاول مجدداً.'
      : 'Network error. Please check your internet connection.',
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span className="font-bold">{messages[code]}</span>
    </div>
  )
}
