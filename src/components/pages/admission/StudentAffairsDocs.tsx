'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Rocket, Construction, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { PublicStudentAffairsDocument } from '@/lib/payload/get-public-student-affairs-documents'

interface StudentAffairsDocsProps {
  docs: PublicStudentAffairsDocument[]
  locale: 'ar' | 'en'
}

export function StudentAffairsDocs({ docs, locale }: StudentAffairsDocsProps) {
  const isAr = locale === 'ar'
  const [showFileModal, setShowFileModal] = useState(false)

  return (
    <motion.div
      className="mb-16"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 bg-secondary rounded-full" />
        <h2 className="text-2xl font-display font-bold text-foreground">
          {isAr ? 'شؤون الطلاب واللوائح' : 'Student Affairs & Regulations'}
        </h2>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 text-secondary/60" aria-hidden="true" />
          <p>{isAr ? 'لا توجد مستندات منشورة حالياً.' : 'No documents are currently published.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <motion.div key={doc.id} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                asChild={Boolean(doc.downloadUrl) && !doc.fileComingSoon}
                variant="outline"
                className="w-full h-auto py-4 px-5 flex items-center justify-between text-right bg-card hover:bg-secondary/5 border-border/80 group transition-all duration-300 shadow-sm hover:shadow-gold hover:border-secondary"
                onClick={
                  doc.downloadUrl && !doc.fileComingSoon
                    ? () => toast.info(isAr ? 'يتم الآن تنزيل الملف...' : 'Downloading file...')
                    : () => setShowFileModal(true)
                }
              >
                {doc.downloadUrl && !doc.fileComingSoon ? (
                  <a href={doc.downloadUrl} download>
                    <DocumentButtonContent doc={doc} isAr={isAr} />
                  </a>
                ) : (
                  <DocumentButtonContent doc={doc} isAr={isAr} />
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* File Coming Soon Dialog */}
      <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
        <DialogContent className="max-w-md bg-background p-0 overflow-hidden border border-border/50 rounded-3xl shadow-2xl">
          <div className="p-8 text-center space-y-6">
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border border-dashed border-secondary/40 rounded-full scale-150"
              />
              <div className="w-16 h-16 bg-secondary/15 rounded-2xl flex items-center justify-center mx-auto border border-secondary/20 relative z-10 overflow-hidden shadow-lg">
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <Construction className="w-8 h-8 text-secondary" />
                </motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-display font-bold text-foreground">
                {isAr ? 'الملف قيد الإعداد والمراجعة' : 'Document under preparation'}
              </DialogTitle>
              <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-secondary">
                <Rocket className="w-4 h-4 animate-bounce" />
                <span>{isAr ? 'سيتوفر الملف قريباً جداً' : 'File will be available soon'}</span>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto leading-relaxed">
                {isAr
                  ? 'يقوم قسم شؤون الطلاب حالياً بإعداد الصيغة المعتمدة لهذا الملف. شكراً لتفهمكم.'
                  : 'The Student Affairs department is currently updating this document. Thank you for your patience.'}
              </p>
            </div>

            <Button
              onClick={() => setShowFileModal(false)}
              className="w-full rounded-xl h-11 font-bold"
            >
              {isAr ? 'حسناً' : 'Got it'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function DocumentButtonContent({
  doc,
  isAr,
}: {
  doc: PublicStudentAffairsDocument
  isAr: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 flex-shrink-0">
          <FileText className="w-5 h-5 text-secondary" />
        </div>
        <span className="font-bold text-sm text-foreground text-start truncate max-w-[170px]">
          {doc.title || ''}
        </span>
      </div>
      {doc.fileComingSoon || !doc.downloadUrl ? (
        <span className="text-[10px] font-bold text-secondary/60 bg-secondary/10 px-2 py-0.5 rounded-full flex-shrink-0">
          {isAr ? 'قريباً' : 'Soon'}
        </span>
      ) : (
        <Upload className="w-4 h-4 text-muted-foreground group-hover:text-secondary opacity-50 group-hover:opacity-100 transition-all rotate-180 flex-shrink-0" />
      )}
    </>
  )
}
