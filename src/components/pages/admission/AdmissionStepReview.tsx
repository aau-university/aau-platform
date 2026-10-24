'use client'

import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import type { Locale } from '@/i18n/locale'

type JoinRequestFormValues = z.input<typeof joinRequestSchema>
type JoinRequestSubmitValues = z.output<typeof joinRequestSchema>

interface AdmissionStepReviewProps {
  form: UseFormReturn<JoinRequestFormValues, any, JoinRequestSubmitValues>
  locale: Locale
  selectedCollegeLabel: string
  selectedProgramLabel: string
}

export function AdmissionStepReview({
  form,
  locale,
  selectedCollegeLabel,
  selectedProgramLabel,
}: AdmissionStepReviewProps) {
  const isAr = locale === 'ar'
  const isGraduate = form.getValues('educationStatus') === 'graduate'

  const reviewItems: Array<{ label: string; value: string | number; ltr?: boolean }> = [
    { label: isAr ? 'الاسم الكامل' : 'Full Name', value: form.getValues('fullName') },
    { label: isAr ? 'البريد الإلكتروني' : 'Email Address', value: form.getValues('email'), ltr: true },
    { label: isAr ? 'رقم الهاتف' : 'Phone Number', value: form.getValues('phone'), ltr: true },
    {
      label: isAr ? 'نوع التسجيل' : 'Registration Type',
      value: isGraduate
        ? isAr
          ? 'خريج ثانوي'
          : 'High School Graduate'
        : isAr
          ? 'حجز مقعد'
          : 'Seat Reservation',
    },
    { label: isAr ? 'الكلية المطلوبة' : 'Desired College', value: selectedCollegeLabel || '-' },
    { label: isAr ? 'البرنامج الأكاديمي' : 'Desired Program', value: selectedProgramLabel || '-' },
    { label: isAr ? 'قسم الثانوية' : 'High School branch', value: form.getValues('highSchoolType') || '-' },
    {
      label: isAr ? 'معدل الثانوية العامة' : 'High School GPA',
      value: form.getValues('highSchoolGpa') ? `${form.getValues('highSchoolGpa')}%` : '-',
    },
    {
      label: isAr ? 'شهادة الثانوية العامة' : 'School Certificate file',
      value: form.getValues('highSchoolDocument')
        ? (form.getValues('highSchoolDocument') as File).name
        : '-',
    },
    {
      label: isAr ? 'نسخة الهوية' : 'ID copy file',
      value: form.getValues('idDocument') ? (form.getValues('idDocument') as File).name : '-',
    },
    {
      label: isAr ? 'الصورة الشخصية' : 'Photo file',
      value: form.getValues('personalPhoto') ? (form.getValues('personalPhoto') as File).name : '-',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
        <CheckCircle2 className="w-5 h-5 text-secondary" />
        <h2 id="admission-step-4-heading" tabIndex={-1} className="outline-none">
          {isAr ? 'مراجعة طلب الالتحاق' : 'Review & Confirm'}
        </h2>
      </div>

      <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md">
        {reviewItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-3 px-5 py-3.5 text-sm sm:grid-cols-2">
            <dt className="font-bold text-muted-foreground">{item.label}</dt>
            <dd dir={item.ltr ? 'ltr' : undefined} className="col-span-2 font-medium text-foreground sm:col-span-1">{item.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-center text-amber-600 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-bold">
        {isAr
          ? 'يرجى مراجعة كافة البيانات والملفات المرفقة قبل إرسال طلبك النهائي.'
          : 'Please review all data and attached files before submitting your final request.'}
      </p>
    </div>
  )
}
