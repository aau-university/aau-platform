'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast, Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { z } from 'zod'
import {
  ChevronRight,
  ChevronLeft,
  Cog,
  CheckCircle2,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { ShineBorder } from '@/components/ui/ShineBorder'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import type { Locale } from '@/i18n/locale'
import type { PublicStudentAffairsDocument } from '@/lib/payload/get-public-student-affairs-documents'

import { StudentAffairsDocs } from './StudentAffairsDocs'
import { ShimmerButton } from './ShimmerButton'

import { AdmissionFormStepper } from './AdmissionFormStepper'
import { AdmissionStepPersonal } from './AdmissionStepPersonal'
import { AdmissionStepAcademic } from './AdmissionStepAcademic'
import { AdmissionStepDocuments } from './AdmissionStepDocuments'
import { AdmissionStepReview } from './AdmissionStepReview'
import { AdmissionSuccessDialog } from './AdmissionSuccessDialog'
import { AdmissionErrorBanner } from './AdmissionErrorBanner'

type JoinRequestFormValues = z.input<typeof joinRequestSchema>
type JoinRequestSubmitValues = z.output<typeof joinRequestSchema>

export interface AdmissionProgramOption {
  id: number
  slug: string
  name: string
}

export interface AdmissionCollegeOption {
  id: number
  slug: string
  name: string
  programs: AdmissionProgramOption[]
}

interface AdmissionFormProps {
  colleges: AdmissionCollegeOption[]
  locale: Locale
  studentAffairsDocs?: PublicStudentAffairsDocument[]
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: 'validation_failed' | 'rate_limited' | 'server_error' | 'network' }

const TOTAL_STEPS = 4 as const

const generateSerialNumber = () => {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `AJU-${new Date().getFullYear().toString().slice(-2)}-${random}`
}

export function AdmissionForm({
  colleges,
  locale,
  studentAffairsDocs = [],
}: AdmissionFormProps) {
  const isAr = locale === 'ar'
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })
  const [serialNumber, setSerialNumber] = useState<string | null>(null)
  const previousStep = useRef(step)

  const form = useForm<JoinRequestFormValues, unknown, JoinRequestSubmitValues>({
    resolver: zodResolver(joinRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      nationalId: '',
      dateOfBirth: '',
      gender: undefined,
      highSchoolType: '',
      highSchoolGpa: undefined,
      desiredCollege: undefined,
      desiredProgram: undefined,
      highSchoolDocument: null,
      idDocument: null,
      personalPhoto: null,
      educationStatus: 'graduate',
      _hp: '',
    },
  })

  const selectedCollegeId = useWatch({ control: form.control, name: 'desiredCollege' })
  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === Number(selectedCollegeId)),
    [colleges, selectedCollegeId],
  )

  const educationStatus = useWatch({ control: form.control, name: 'educationStatus' })
  const isGraduate = educationStatus === 'graduate'

  const selectedCollegeLabel = selectedCollege ? selectedCollege.name : ''
  const programId = useWatch({ control: form.control, name: 'desiredProgram' })
  const selectedProgram = useMemo(
    () => selectedCollege?.programs.find((p) => p.id === Number(programId)),
    [selectedCollege, programId],
  )
  const selectedProgramLabel = selectedProgram ? selectedProgram.name : ''
  const stepLabels = isAr
    ? ['المعلومات الشخصية', 'الكلية والبرنامج الدراسي', 'رفع المستندات والوثائق', 'مراجعة طلب الالتحاق']
    : ['Personal Details', 'College & Program', 'Document Uploads', 'Review & Confirm']

  useEffect(() => {
    if (previousStep.current !== step) {
      document.getElementById(`admission-step-${step}-heading`)?.focus()
      previousStep.current = step
    }
  }, [step])

  // Navigation validation guards
  async function onNextFromStep1() {
    const valid = await form.trigger([
      'fullName',
      'email',
      'phone',
      'gender',
      'educationStatus',
    ])
    if (valid) {
      setStep(2)
    } else {
      toast.error(
        isAr
          ? 'يرجى التأكد من صحة جميع البيانات المطلوبة في هذه الخطوة'
          : 'Please ensure all required fields in this step are valid',
      )
    }
  }

  async function onNextFromStep2() {
    const valid = await form.trigger([
      'desiredCollege',
      'desiredProgram',
      'highSchoolGpa',
      'highSchoolType',
    ])
    if (valid) {
      setStep(3)
    } else {
      toast.error(
        isAr
          ? 'يرجى اختيار الكلية والبرنامج وملء التفاصيل الدراسية'
          : 'Please select your college, program, and complete school details',
      )
    }
  }

  async function onNextFromStep3() {
    if (isGraduate) {
      const values = form.getValues()
      const hasDocs = values.highSchoolDocument && values.idDocument && values.personalPhoto
      if (!hasDocs) {
        toast.error(
          isAr
            ? 'يرجى رفع جميع الوثائق المطلوبة (شهادة الثانوية، الهوية، والصورة الشخصية)'
            : 'Please upload all required documents (High School, ID, and Photo)',
        )
        return
      }
    }
    setStep(4)
  }

  function onBack() {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(3)
  }

  async function onSubmit(values: JoinRequestSubmitValues) {
    setState({ kind: 'submitting' })

    const isGraduateUser = values.educationStatus === 'graduate'
    const hasFiles = values.highSchoolDocument && values.idDocument && values.personalPhoto

    if (isGraduateUser && !hasFiles) {
      toast.error(
        isAr
          ? 'يرجى رفع جميع الوثائق المطلوبة للحصول على الرقم التسلسلي والخصم'
          : 'Please upload all required documents to get the serial number and discount',
      )
      setStep(3)
      setState({ kind: 'idle' })
      return
    }

    try {
      const formData = new FormData()

      // Append values
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (key !== 'highSchoolDocument' && key !== 'idDocument' && key !== 'personalPhoto') {
            formData.append(key, String(val))
          }
        }
      })

      // Append files
      if (values.highSchoolDocument instanceof File) {
        formData.append('highSchoolDocument', values.highSchoolDocument)
      }
      if (values.idDocument instanceof File) {
        formData.append('idDocument', values.idDocument)
      }
      if (values.personalPhoto instanceof File) {
        formData.append('personalPhoto', values.personalPhoto)
      }

      const res = await fetch('/api/public/join-request', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const serial = generateSerialNumber()
        setSerialNumber(serial)
        setState({ kind: 'success' })
        toast.success(
          isAr
            ? 'تم إرسال طلب القبول وحفظه بنجاح'
            : 'Admission application submitted successfully',
        )
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

  const resetForm = () => {
    setState({ kind: 'idle' })
    setSerialNumber(null)
    setStep(1)
    form.reset()
  }

  const slideDirection = isAr ? 50 : -50

  return (
    <div className="container mx-auto px-4 max-w-4xl relative z-10">
      <Toaster richColors position="top-center" />

      {/* Regulations downloads section */}
      <StudentAffairsDocs docs={studentAffairsDocs} locale={locale} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <ShineBorder borderWidth={2.5} duration={12} color={['hsl(var(--secondary))', 'transparent', '#3B82F6', 'transparent', 'hsl(var(--secondary))']}>
          <SpotlightCard spotlightColor="rgba(212, 175, 55, 0.12)" className="border-none bg-transparent">
            <Card className="border-none bg-transparent shadow-none">

              {/* Stepper progress indicator bar */}
              <AdmissionFormStepper step={step} locale={locale} />

              <CardContent className="p-6 md:p-10">
                <Form {...form}>
                   <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                     <p role="status" aria-live="polite" className="sr-only">
                       {isAr ? `الخطوة ${step} من ${TOTAL_STEPS}: ${stepLabels[step - 1]}` : `Step ${step} of ${TOTAL_STEPS}: ${stepLabels[step - 1]}`}
                     </p>
                    {/* Honeypot anti-spam field */}
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="absolute -left-[9999px] h-0 w-0 opacity-0"
                      {...form.register('_hp')}
                    />

                    {/* Step sliding panels */}
                    <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: slideDirection }}
                          animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -slideDirection }}
                           transition={{ duration: 0.35 }}
                           role="group"
                           aria-labelledby="admission-step-1-heading"
                        >
                          <AdmissionStepPersonal form={form} locale={locale} />
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: slideDirection }}
                          animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -slideDirection }}
                           transition={{ duration: 0.35 }}
                           role="group"
                           aria-labelledby="admission-step-2-heading"
                        >
                          <AdmissionStepAcademic form={form} colleges={colleges} locale={locale} />
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: slideDirection }}
                          animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -slideDirection }}
                           transition={{ duration: 0.35 }}
                           role="group"
                           aria-labelledby="admission-step-3-heading"
                        >
                          <AdmissionStepDocuments form={form} locale={locale} />
                        </motion.div>
                      )}

                      {step === 4 && (
                        <motion.div
                          key="step4"
                          initial={{ opacity: 0, x: slideDirection }}
                          animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -slideDirection }}
                           transition={{ duration: 0.35 }}
                           role="group"
                           aria-labelledby="admission-step-4-heading"
                        >
                          <AdmissionStepReview
                            form={form}
                            locale={locale}
                            selectedCollegeLabel={selectedCollegeLabel}
                            selectedProgramLabel={selectedProgramLabel}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* API Submission Error notifications */}
                    <AdmissionErrorBanner
                      code={state.kind === 'error' ? state.code : null}
                      locale={locale}
                    />

                    {/* Wizard controls footer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
                      {step > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onBack}
                          disabled={state.kind === 'submitting'}
                          className="min-h-11 gap-2"
                        >
                          {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                          {isAr ? 'السابق' : 'Back'}
                        </Button>
                      ) : (
                        <span />
                      )}

                      {step < TOTAL_STEPS ? (
                        <Button
                          type="button"
                          onClick={
                            step === 1
                              ? onNextFromStep1
                              : step === 2
                                ? onNextFromStep2
                                : onNextFromStep3
                          }
                          disabled={state.kind === 'submitting'}
                          className="min-h-11 gap-2"
                        >
                          {isAr ? 'التالي' : 'Next'}
                          {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <ShimmerButton type="submit" disabled={state.kind === 'submitting'} className="min-h-11">
                          {state.kind === 'submitting' ? (
                            <>
                              <Cog className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                              {isAr ? 'جاري إرسال الطلب...' : 'Submitting Application...'}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              {isAr ? 'تقديم الطلب والاشتراك' : 'Submit Application'}
                            </>
                          )}
                        </ShimmerButton>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </SpotlightCard>
        </ShineBorder>
      </motion.div>

      {/* Success details overlay */}
      <AdmissionSuccessDialog
        isOpen={state.kind === 'success'}
        onClose={resetForm}
        serialNumber={serialNumber}
        locale={locale}
        isGraduate={isGraduate}
      />
    </div>
  )
}

export default AdmissionForm
