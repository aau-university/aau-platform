'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import type { Locale } from '@/i18n/locale'

interface AdmissionSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  serialNumber: string | null
  locale: Locale
  isGraduate: boolean
}

export function AdmissionSuccessDialog({
  isOpen,
  onClose,
  serialNumber,
  locale,
  isGraduate,
}: AdmissionSuccessDialogProps) {
  const isAr = locale === 'ar'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md bg-background p-0 overflow-hidden border border-border rounded-3xl shadow-2xl">
        <div className="p-8 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-gold"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl font-display font-bold text-foreground">
              {isAr ? 'تم استلام طلبك بنجاح!' : 'Application Received!'}
            </DialogTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isGraduate
                ? isAr
                  ? 'شكراً لتسجيلك الإلكتروني. لقد حصلت على خصم 3٪ على الرسوم الدراسية فور التحقق من مستنداتك!'
                  : 'Thank you for applying online! You have received a 3% tuition fee discount pending document verification.'
                : isAr
                  ? 'تم تسجيل بيانات حجز مقعدك بنجاح. يرجى إحضار الوثائق لاحقاً للحصول على الخصم.'
                  : 'Your seat reservation details have been logged successfully. Bring documents later to get the discount.'}
            </p>
          </div>

          {serialNumber && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-secondary/5 rounded-2xl p-5 border border-secondary/20 relative"
            >
              <div className="flex items-center justify-center gap-1.5 text-secondary font-bold text-xs mb-2">
                <div className="motion-ambient size-1.5 rounded-full bg-secondary animate-pulse motion-reduce:animate-none" />
                {isAr ? 'رقم طلب القبول المؤقت' : 'Temporary Application ID'}
              </div>
              <div dir="ltr" className="rounded-xl border border-border/50 bg-background/50 py-3 font-display text-3xl font-black tracking-widest text-secondary">
                {serialNumber}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                {isAr
                  ? 'يرجى حفظ هذا الرقم أو طباعته لمتابعة حالة القبول عند زيارة الجامعة.'
                  : 'Please keep this number to follow up on your admission status.'}
              </p>
            </motion.div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            {serialNumber && (
              <Button
                onClick={() => window.print()}
                className="bg-primary hover:bg-primary/95 text-secondary font-bold h-11 rounded-xl gap-2 shadow-lg"
              >
                <FileText className="w-4 h-4" />
                {isAr ? 'طباعة أو حفظ الرقم' : 'Print / Save Details'}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:bg-muted/10 rounded-xl"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
