'use client'

import { User, GraduationCap, FolderOpen, CheckCircle2 } from 'lucide-react'
import type { Locale } from '@/i18n/locale'

interface AdmissionFormStepperProps {
  step: 1 | 2 | 3 | 4
  locale: Locale
}

const TOTAL_STEPS = 4

export function AdmissionFormStepper({ step, locale }: AdmissionFormStepperProps) {
  const isAr = locale === 'ar'

  const steps = [
    { number: 1, label: isAr ? 'الشخصية' : 'Personal', Icon: User },
    { number: 2, label: isAr ? 'الأكاديمية' : 'Academic', Icon: GraduationCap },
    { number: 3, label: isAr ? 'الوثائق' : 'Documents', Icon: FolderOpen },
    { number: 4, label: isAr ? 'المراجعة' : 'Review', Icon: CheckCircle2 },
  ]

  return (
    <nav aria-label={isAr ? 'خطوات طلب القبول' : 'Admission application progress'} className="border-b border-border/40 bg-gradient-to-r from-primary/20 via-primary/45 to-secondary/15 p-6 md:p-8">
      <div
        role="progressbar"
        aria-label={isAr ? 'تقدم الطلب' : 'Application progress'}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-valuetext={isAr ? `الخطوة ${step} من ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
        className="sr-only"
      />
      <ol className="relative mx-auto flex max-w-lg items-center justify-between">
        <li className="absolute inset-x-0 top-5 z-0 h-0.5 rounded-full bg-muted/60" aria-hidden="true">
          <div
            className="h-full rounded-full bg-secondary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </li>
        {steps.map((s) => {
          const isActive = step === s.number
          const isCompleted = step > s.number

          return (
            <li key={s.number} aria-current={isActive ? 'step' : undefined} className="relative z-10 flex flex-col items-center">
              <div
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold border',
                  isActive
                    ? 'bg-secondary border-secondary text-primary shadow-gold'
                    : isCompleted
                      ? 'bg-primary border-secondary text-secondary shadow-elegant'
                      : 'bg-background border-border/80 text-muted-foreground',
                ].join(' ')}
              >
                <s.Icon className="size-4" aria-hidden="true" />
              </div>
              <span
                className={[
                  'text-[10px] sm:text-xs mt-2 font-bold transition-colors',
                  isActive || isCompleted ? 'text-secondary' : 'text-muted-foreground',
                ].join(' ')}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
