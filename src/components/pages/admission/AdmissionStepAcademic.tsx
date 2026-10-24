'use client'

import React, { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { GraduationCap } from 'lucide-react'
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
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import type { Locale } from '@/i18n/locale'
import type { AdmissionCollegeOption } from './AdmissionForm'

type JoinRequestFormValues = z.input<typeof joinRequestSchema>
type JoinRequestSubmitValues = z.output<typeof joinRequestSchema>

interface AdmissionStepAcademicProps {
  form: UseFormReturn<JoinRequestFormValues, any, JoinRequestSubmitValues>
  colleges: AdmissionCollegeOption[]
  locale: Locale
}

export function AdmissionStepAcademic({ form, colleges, locale }: AdmissionStepAcademicProps) {
  const isAr = locale === 'ar'

  const selectedCollegeId = useWatch({ control: form.control, name: 'desiredCollege' })
  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === Number(selectedCollegeId)),
    [colleges, selectedCollegeId],
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
        <GraduationCap className="w-5 h-5 text-secondary" />
        <h2 id="admission-step-2-heading" tabIndex={-1} className="outline-none">
          {isAr ? 'الكلية والبرنامج الدراسي' : 'College & Program'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control as any}
          name="desiredCollege"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'الكلية' : 'College'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(val) => {
                  field.onChange(val === '' ? undefined : Number(val))
                  form.setValue('desiredProgram', undefined, { shouldValidate: false })
                }}
              >
                <FormControl>
                  <SelectTrigger aria-required="true" className="h-11 border-border/80">
                    <SelectValue placeholder={isAr ? 'اختر الكلية' : 'Select College'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="desiredProgram"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'البرنامج الدراسي' : 'Academic Program'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(val) => field.onChange(val === '' ? undefined : Number(val))}
                disabled={!selectedCollege || selectedCollege.programs.length === 0}
              >
                <FormControl>
                  <SelectTrigger aria-required="true" className="h-11 border-border/80">
                    <SelectValue
                      placeholder={
                        !selectedCollege
                          ? isAr
                            ? 'اختر الكلية أولاً'
                            : 'Select a college first'
                          : selectedCollege.programs.length === 0
                            ? isAr
                              ? 'لا توجد برامج متوفرة'
                              : 'No programs available'
                            : isAr
                              ? 'اختر البرنامج'
                              : 'Select a program'
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedCollege?.programs.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          control={form.control as any}
          name="highSchoolType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'قسم الثانوية' : 'High School Branch'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={isAr ? 'مثال: علمي، أدبي، إنجليزي' : 'e.g. Scientific, Literary'}
                  required
                  aria-required="true"
                  className="h-11 border-border/80 focus:border-secondary"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="highSchoolGpa"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">
                {isAr ? 'المعدل التراكمي للثانوية (٪)' : 'High School GPA (%)'}{' '}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  required
                  aria-required="true"
                  placeholder={isAr ? 'مثال: 92.5' : 'e.g. 92.5'}
                  className="h-11 border-border/80 focus:border-secondary"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value)
                    field.onChange(val)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
