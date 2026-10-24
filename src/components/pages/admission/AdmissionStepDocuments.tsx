'use client'

import React from 'react'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { FolderOpen } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import type { Locale } from '@/i18n/locale'
import { FileUploadZone } from './FileUploadZone'

type JoinRequestFormValues = z.input<typeof joinRequestSchema>
type JoinRequestSubmitValues = z.output<typeof joinRequestSchema>

interface AdmissionStepDocumentsProps {
  form: UseFormReturn<JoinRequestFormValues, any, JoinRequestSubmitValues>
  locale: Locale
}

export function AdmissionStepDocuments({ form, locale }: AdmissionStepDocumentsProps) {
  const isAr = locale === 'ar'

  const educationStatus = useWatch({ control: form.control, name: 'educationStatus' })
  const isGraduate = educationStatus === 'graduate'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
        <FolderOpen className="w-5 h-5 text-secondary" />
        <h2 id="admission-step-3-heading" tabIndex={-1} className="outline-none">
          {isAr ? 'رفع المستندات والوثائق' : 'Document Uploads'}
        </h2>
      </div>

      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
        {isGraduate
          ? isAr
            ? 'يرجى رفع المستندات التالية بصيغة PDF أو صور (الحد الأقصى 5 ميجابايت للملف). الرفع إلزامي لتفعيل خصم الـ 3٪ وتصدير الرقم الجامعي.'
            : 'Please upload the following files in PDF or image format (Max size 5MB per file). Uploading is mandatory to activate the 3% discount.'
          : isAr
            ? 'رفع الوثائق حالياً اختياري لطلاب الثالث ثانوي لحجز مقعد مؤقت. يمكنك إرسال الطلب بدونه قريباً.'
            : 'Uploading documents is optional for current 3rd year students to reserve a temporary seat.'}
      </p>

      <fieldset className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-3">
        <legend className="sr-only">
          {isAr ? 'وثائق طلب القبول' : 'Admission application documents'}
        </legend>
        <FormField
          control={form.control as any}
          name="highSchoolDocument"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FileUploadZone
                  label={isAr ? 'شهادة الثانوية العامة' : 'High School Certificate'}
                  subLabel={!isGraduate && isAr ? 'اختياري لحجز المقعد' : 'أقصى حجم 5 ميجابايت'}
                  value={field.value}
                  onChange={field.onChange}
                  isAr={isAr}
                  required={isGraduate}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="idDocument"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FileUploadZone
                  label={isAr ? 'البطاقة الشخصية / جواز السفر' : 'ID / Passport Copy'}
                  subLabel={!isGraduate && isAr ? 'اختياري لحجز المقعد' : 'أقصى حجم 5 ميجابايت'}
                  value={field.value}
                  onChange={field.onChange}
                  isAr={isAr}
                  required={isGraduate}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="personalPhoto"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FileUploadZone
                  label={isAr ? 'الصورة الشخصية' : 'Personal Photo'}
                  subLabel={!isGraduate && isAr ? 'اختياري لحجز المقعد' : 'أقصى حجم 5 ميجابايت'}
                  value={field.value}
                  onChange={field.onChange}
                  isAr={isAr}
                  required={isGraduate}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </fieldset>
    </div>
  )
}
