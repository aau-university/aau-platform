'use client'

import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Upload, CheckCircle2 } from 'lucide-react'

interface FileUploadProps {
  label: string
  subLabel?: string
  value: any
  onChange: (file: File | null) => void
  isAr?: boolean
  required?: boolean
}

export function FileUploadZone({
  label,
  subLabel,
  value,
  onChange,
  isAr = false,
  required = false,
}: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0] || null
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(isAr ? 'حجم الملف كبير جداً (الأقصى 5 ميجابايت)' : 'File size is too large (Max 5MB)')
          return
        }
        onChange(file)
      }
    },
    // Mirrors the server-side allowlist in join-request submission: passive,
    // signature-verifiable formats only.
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={[
        'group min-h-11 border border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer select-none bg-card hover:bg-secondary/5',
        isDragActive ? 'border-secondary bg-secondary/5 shadow-gold' : 'border-border hover:border-secondary',
      ].join(' ')}
    >
      <input {...getInputProps({ required, 'aria-label': label })} />
      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
        <Upload className="w-5 h-5 text-secondary" />
      </div>
      <span className="text-foreground text-xs font-bold block mb-0.5">
        {label} {required ? <span aria-hidden="true" className="text-destructive">*</span> : null}
      </span>
      {subLabel && (
        <span className="text-[10px] text-muted-foreground block font-normal">
          {subLabel}
        </span>
      )}
      {value && (
        <motion.div
          className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5 bg-green-500/10 p-1.5 rounded-xl border border-green-500/15"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate max-w-[130px] font-bold">{(value as File).name}</span>
        </motion.div>
      )}
    </div>
  )
}
