'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Mail, Send } from 'lucide-react'
import type { z } from 'zod'

import { PublicFormSuccess } from '@/components/shared/states/PublicFormSuccess'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
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
import { Textarea } from '@/components/ui/textarea'
import {
  emailRequestSchema,
  REQUEST_TYPES,
  type RequestType,
} from '@/lib/forms/email-request-schema'
import type { Locale } from '@/i18n/locale'

export { PublicFormSuccess as EmailRequestSuccessPanel } from '@/components/shared/states/PublicFormSuccess'

/**
 * Form-value type aliases.
 *
 * The schema uses `z.coerce.number()` for the `college` and `program`
 * relationship IDs so the API can accept either strings or numbers from
 * the client. In Zod v4 this means:
 *   - `z.input`  has those fields typed as `unknown` (anything coerceable)
 *   - `z.output` has them typed as `number | undefined` (post-coercion)
 *
 * react-hook-form's `zodResolver` returns a `Resolver<z.input<T>, …,
 * z.output<T>>` — so the form's `TFieldValues` must be the INPUT type
 * for the resolver to type-check, and the submit handler receives the
 * OUTPUT type via the third generic.
 */
type EmailRequestFormValues = z.input<typeof emailRequestSchema>
type EmailRequestSubmitValues = z.output<typeof emailRequestSchema>

/**
 * Convenience alias kept for callers that need the resolved (post-coercion)
 * shape — e.g. to serialise the form payload for `fetch`.
 */
export type EmailRequestInput = EmailRequestSubmitValues


export interface EmailRequestProgramOption {
  id: number
  slug: string
  name: string
}

export interface EmailRequestCollegeOption {
  id: number
  slug: string
  name: string
  programs: EmailRequestProgramOption[]
}

interface EmailRequestFormProps {
  colleges: EmailRequestCollegeOption[]
  locale: Locale
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: 'validation_failed' | 'rate_limited' | 'server_error' | 'network' }

const REQUEST_TYPE_LABELS: Record<Locale, Record<RequestType, string>> = {
  ar: {
    academic_certificate: 'شهادة أكاديمية',
    transcript: 'كشف درجات',
    enrollment_verification: 'إثبات قيد',
    grade_objection: 'اعتراض على درجة',
    other: 'أخرى',
  },
  en: {
    academic_certificate: 'Academic Certificate',
    transcript: 'Transcript',
    enrollment_verification: 'Enrollment Verification',
    grade_objection: 'Grade Objection',
    other: 'Other',
  },
}

/**
 * Public email-request form.
 *
 * Submits via `fetch('/api/public/email-request')`. The route applies Zod
 * validation with {@link emailRequestSchema}, honeypot check, and IP rate
 * limiting. Errors are surfaced as a generic banner — the server never
 * returns Zod issue details to the client.
 */
export function EmailRequestForm({ colleges, locale }: EmailRequestFormProps) {
  const isAr = locale === 'ar'
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })

  const form = useForm<EmailRequestFormValues, unknown, EmailRequestSubmitValues>({
    resolver: zodResolver(emailRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      studentId: '',
      college: undefined,
      program: undefined,
      phone: '',
      alternateEmail: '',
      requestType: undefined,
      notes: '',
      _hp: '',
    },
  })

  // `useWatch` (vs `form.watch`) is the React Compiler-safe way to
  // subscribe to a single field — `form.watch` returns a fresh value on
  // every render and trips `react-hooks/incompatible-library`.
  const selectedCollegeId = useWatch({ control: form.control, name: 'college' })
  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === Number(selectedCollegeId)),
    [colleges, selectedCollegeId],
  )

  async function onSubmit(values: EmailRequestSubmitValues) {
    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/public/email-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.ok) {
        setState({ kind: 'success' })
        form.reset()
        return
      }

      const payload = (await res.json().catch(() => ({}))) as { code?: string }
      if (res.status === 429) {
        setState({ kind: 'error', code: 'rate_limited' })
      } else if (payload?.code === 'validation_failed') {
        setState({ kind: 'error', code: 'validation_failed' })
      } else {
        setState({ kind: 'error', code: 'server_error' })
      }
    } catch {
      setState({ kind: 'error', code: 'network' })
    }
  }

  if (state.kind === 'success') {
    return (
      <PublicFormSuccess
        title={isAr ? 'تم استلام طلبك' : 'Request Submitted'}
        message={
          isAr
            ? 'شكراً لك. ستقوم شؤون الطلاب بمراجعة طلبك والتواصل معك عبر البريد الإلكتروني أو الهاتف.'
            : 'Thank you. Student Affairs will review your request and contact you via email or phone.'
        }
        onReset={() => setState({ kind: 'idle' })}
        resetLabel={isAr ? 'تقديم طلب جديد' : 'Submit a new request'}
      />
    )
  }

  return (
    <Card className="mx-auto max-w-2xl border-border/60 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
        <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
          <Send className="h-6 w-6" />
          {isAr ? 'تقديم طلب بريد إلكتروني' : 'Submit Email Request'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-5"
            noValidate
          >
            {/* Honeypot — hidden from users. */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              {...form.register('_hp')}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>{isAr ? 'الاسم الكامل' : 'Full Name'} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isAr ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                       autoComplete="name"
                       required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'الرقم الجامعي' : 'Student ID'}</FormLabel>
                    <FormControl>
                      <Input
                       placeholder={isAr ? 'الرقم الجامعي (اختياري)' : 'Student ID (optional)'}
                       dir="ltr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'رقم الهاتف' : 'Phone'}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={isAr ? 'رقم الهاتف' : 'Phone number'}
                       autoComplete="tel"
                       dir="ltr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="college"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'الكلية' : 'College'}</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => {
                        field.onChange(value === '' ? undefined : Number(value))
                        // Reset program when college changes.
                        form.setValue('program', undefined, { shouldValidate: false })
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={isAr ? 'اختر الكلية' : 'Select a college'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colleges.map((college) => (
                          <SelectItem key={college.id} value={String(college.id)}>
                            {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'البرنامج' : 'Program'}</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) =>
                        field.onChange(value === '' ? undefined : Number(value))
                      }
                      disabled={!selectedCollege || selectedCollege.programs.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedCollege
                                ? isAr
                                  ? 'اختر الكلية أولاً'
                                  : 'Select a college first'
                                : selectedCollege.programs.length === 0
                                  ? isAr
                                    ? 'لا توجد برامج'
                                    : 'No programs available'
                                  : isAr
                                    ? 'اختر البرنامج'
                                    : 'Select a program'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedCollege?.programs.map((program) => (
                          <SelectItem key={program.id} value={String(program.id)}>
                            {program.name}
                          </SelectItem>
                        )) ?? null}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="alternateEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isAr ? 'بريد إلكتروني بديل' : 'Alternate Email'}
                  </FormLabel>
                  <FormControl>
                    <Input
                       type="email"
                       dir="ltr"
                      placeholder={
                        isAr
                          ? 'بريد إلكتروني بديل للتواصل (اختياري)'
                          : 'Alternate contact email (optional)'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>{isAr ? 'نوع الطلب' : 'Request Type'} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) =>
                      field.onChange(value === '' ? undefined : (value as RequestType))
                    }
                  >
                    <FormControl>
                       <SelectTrigger aria-required="true">
                        <SelectValue
                          placeholder={isAr ? 'اختر نوع الطلب' : 'Select a request type'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {REQUEST_TYPE_LABELS[locale][type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isAr ? 'ملاحظات' : 'Notes'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isAr
                          ? 'أضف أي تفاصيل إضافية حول طلبك (اختياري)'
                          : 'Add any additional details about your request (optional)'
                      }
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {state.kind === 'error' ? (
              <ErrorBanner code={state.code} locale={locale} />
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="min-h-11 w-full"
              disabled={state.kind === 'submitting'}
            >
              <Mail className="h-4 w-4" />
              {state.kind === 'submitting'
                ? isAr
                  ? 'جاري الإرسال...'
                  : 'Submitting...'
                : isAr
                  ? 'إرسال الطلب'
                  : 'Submit Request'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function ErrorBanner({
  code,
  locale,
}: {
  code: 'validation_failed' | 'rate_limited' | 'server_error' | 'network'
  locale: Locale
}) {
  const isAr = locale === 'ar'
  const messages: Record<typeof code, string> = {
    validation_failed: isAr
      ? 'يرجى التحقق من صحة البيانات المدخلة.'
      : 'Please check the submitted data for errors.',
    rate_limited: isAr
      ? 'لقد تجاوزت عدد المحاولات المسموح بها. حاول لاحقاً.'
      : 'You have exceeded the allowed number of attempts. Please try again later.',
    server_error: isAr
      ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.'
      : 'An unexpected error occurred. Please try again later.',
    network: isAr
      ? 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.'
      : 'Unable to reach the server. Please check your internet connection.',
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{messages[code]}</span>
    </div>
  )
}

export default EmailRequestForm
