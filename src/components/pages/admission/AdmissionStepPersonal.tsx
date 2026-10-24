'use client'

import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { User } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import type { Locale } from '@/i18n/locale'

type JoinRequestFormValues = z.input<typeof joinRequestSchema>
type JoinRequestSubmitValues = z.output<typeof joinRequestSchema>

interface AdmissionStepPersonalProps {
  form: UseFormReturn<JoinRequestFormValues, any, JoinRequestSubmitValues>
  locale: Locale
}

export function AdmissionStepPersonal({ form, locale }: AdmissionStepPersonalProps) {
  const isAr = locale === 'ar'

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const clean = e.target.value.replace(/[^\u0600-\u06FFa-zA-Z\s]/g, '').replace(/\s\s+/g, ' ')
    onChange(clean)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    let clean = e.target.value.replace(/[^\d+]/g, '')
    if (clean.includes('+')) {
      clean = `+${clean.replace(/\+/g, '')}`
    }
    onChange(clean.slice(0, 16))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
        <User className="w-5 h-5 text-secondary" />
        <h2 id="admission-step-1-heading" tabIndex={-1} className="outline-none">
          {isAr ? 'المعلومات الشخصية' : 'Personal Details'}
        </h2>
      </div>

      <FormField
        control={form.control as any}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">
              {isAr ? 'الاسم الكامل (الاسم الثلاثي على الأقل)' : 'Full Name'}{' '}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={isAr ? 'أدخل اسمك الكامل بالحروف فقط' : 'Enter your full name'}
                required
                aria-required="true"
                className="h-11 border-border/80 focus:border-secondary focus:ring-secondary/15"
                {...field}
                onChange={(e) => handleNameChange(e, field.onChange)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control as any}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  required
                  aria-required="true"
                  dir="ltr"
                  placeholder="name@example.com"
                  className="h-11 border-border/80 focus:border-secondary focus:ring-secondary/15"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'رقم الهاتف' : 'Phone Number'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  required
                  aria-required="true"
                  dir="ltr"
                  placeholder="77XXXXXXX"
                  className="h-11 border-border/80 focus:border-secondary focus:ring-secondary/15 text-left"
                  {...field}
                  onChange={(e) => handlePhoneChange(e, field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control as any}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'الجنس' : 'Gender'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(val) => field.onChange(val === '' ? undefined : val)}
              >
                <FormControl>
                  <SelectTrigger aria-required="true" className="h-11 border-border/80 focus:border-secondary">
                    <SelectValue placeholder={isAr ? 'اختر الجنس' : 'Select Gender'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{isAr ? 'ذكر' : 'Male'}</SelectItem>
                  <SelectItem value="female">{isAr ? 'أنثى' : 'Female'}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

      </div>

      <FormField
        control={form.control as any}
        name="educationStatus"
        render={({ field }) => (
          <FormItem className="p-4 rounded-2xl bg-secondary/5 border border-secondary/15 mt-2">
            <FormLabel className="font-bold text-secondary mb-3 block">
              {isAr ? 'الحالة الدراسية' : 'Education Status'}{' '}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                aria-label={isAr ? 'الحالة الدراسية' : 'Education Status'}
                aria-required="true"
                value={field.value || 'graduate'}
                onValueChange={field.onChange}
                className="flex flex-col gap-3"
              >
                <div className="group flex min-h-11 items-center gap-2">
                  <RadioGroupItem value="graduate" id="graduate" className="border-secondary text-secondary" />
                  <FormLabel htmlFor="graduate" className="flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center py-2 text-sm font-bold transition-colors group-hover:text-secondary">
                    {isAr
                      ? 'خريج ثانوية عامة (مستعد لرفع الوثائق وتفعيل الخصم 3٪)'
                      : 'High School Graduate (Ready to upload documents & activate 3% discount)'}
                  </FormLabel>
                </div>
                <div className="group flex min-h-11 items-center gap-2">
                  <RadioGroupItem value="student" id="student" className="border-secondary text-secondary" />
                  <FormLabel htmlFor="student" className="flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center py-2 text-sm font-bold transition-colors group-hover:text-secondary">
                    {isAr
                      ? 'طالب ثالث ثانوي حالي (حجز مقعد فقط - الوثائق اختيارية)'
                      : '3rd Year Secondary Student (Seat reservation - documents optional)'}
                  </FormLabel>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
