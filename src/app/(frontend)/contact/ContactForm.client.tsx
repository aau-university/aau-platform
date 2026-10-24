'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react'

import { PublicFormSuccess } from '@/components/shared/states/PublicFormSuccess'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { contactSchema, type ContactInput } from '@/lib/forms/contact-schema'
import type { Locale } from '@/i18n/locale'

export interface ContactFormLabels {
  name: string
  namePlaceholder: string
  email: string
  emailPlaceholder: string
  phone: string
  phonePlaceholder: string
  subject: string
  subjectPlaceholder: string
  message: string
  messagePlaceholder: string
  submit: string
}

export interface ContactInfo {
  phone?: string
  email?: string
  address?: string
}

interface ContactFormProps {
  labels: ContactFormLabels
  info: ContactInfo
  locale: Locale
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: 'validation_failed' | 'rate_limited' | 'server_error' | 'network' }

/**
 * Public contact form.
 *
 * Submits via `fetch('/api/public/contact')` — the existing route handler
 * applies Zod validation (with the same schema), honeypot check, IP rate
 * limiting, and persists the message via the Payload Local API with
 * `overrideAccess: true` (the `contact-messages` collection itself denies
 * anonymous create).
 *
 * UI is intentionally lightweight: shadcn Form primitives + inline
 * success / error banners (no toast library is installed in the platform).
 */
export function ContactForm({ labels, info, locale }: ContactFormProps) {
  const isAr = locale === 'ar'
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      _hp: '',
    },
  })

  async function onSubmit(values: ContactInput) {
    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.ok) {
        setState({ kind: 'success' })
        form.reset()
        return
      }

      const payload = (await res.json().catch(() => ({}))) as {
        code?: string
      }
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
        title={isAr ? 'تم إرسال رسالتك بنجاح' : 'Message Sent'}
        message={
          isAr
            ? 'شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.'
            : 'Thank you for reaching out. We will get back to you as soon as possible.'
        }
        onReset={() => setState({ kind: 'idle' })}
        resetLabel={isAr ? 'إرسال رسالة أخرى' : 'Send another message'}
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <ContactInfoPanel info={info} locale={locale} />

      <Card className="overflow-hidden border-border/60 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
          <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
            <Send className="h-6 w-6" />
            {isAr ? 'أرسل رسالة' : 'Send a Message'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 sm:space-y-5"
              noValidate
            >
              {/* Honeypot — hidden from users, bots tend to fill it. */}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.name} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder={labels.namePlaceholder}
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.email} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={labels.emailPlaceholder}
                          autoComplete="email"
                          required
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
                      <FormLabel>{labels.phone}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={labels.phonePlaceholder}
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

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.subject} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={labels.subjectPlaceholder} required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.message} <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={labels.messagePlaceholder}
                        rows={6}
                        required
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
                <Send className="h-4 w-4" />
                {state.kind === 'submitting'
                  ? isAr
                    ? 'جاري الإرسال...'
                    : 'Sending...'
                  : labels.submit}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function ContactInfoPanel({ info, locale }: { info: ContactInfo; locale: Locale }) {
  const isAr = locale === 'ar'
  const items: Array<{ icon: typeof Phone; label: string; value?: string; dir?: string }> = [
    {
      icon: Phone,
      label: isAr ? 'الهاتف' : 'Phone',
      value: info.phone,
      dir: 'ltr',
    },
    {
      icon: Mail,
      label: isAr ? 'البريد الإلكتروني' : 'Email',
      value: info.email,
      dir: 'ltr',
    },
    {
      icon: MapPin,
      label: isAr ? 'العنوان' : 'Address',
      value: info.address,
    },
  ].filter((item) => item.value)

  if (items.length === 0) return null

  return (
    <aside className="space-y-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <item.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="mb-1 font-semibold text-foreground">{item.label}</h4>
            <p dir={item.dir} className="break-words text-muted-foreground">{item.value}</p>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          {isAr ? 'ساعات العمل' : 'Office Hours'}
        </h4>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'الأحد - الخميس، 8:00 ص - 4:00 م'
            : 'Sunday - Thursday, 8:00 AM - 4:00 PM'}
        </p>
      </div>
    </aside>
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

export default ContactForm
