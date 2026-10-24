'use client'

import { motion } from 'framer-motion'
import { Users, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicKeyInstructorItem } from '@/lib/payload/get-public-colleges'
import { cn } from '@/lib/utils'

interface ProgramKeyInstructorsProps {
  instructors: PublicKeyInstructorItem[]
  collegeSlug: string
}

export function ProgramKeyInstructors({ instructors, collegeSlug }: ProgramKeyInstructorsProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!instructors || instructors.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-muted/20 py-16 md:py-20">
      <Container>
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end mb-12">
          <div className="flex-1">
            <SectionHeader
              icon={Users}
              badge={isAr ? 'الهيئة التدريسية' : 'Faculty Members'}
              title={isAr ? 'نخبة من أساتذة البرنامج' : 'Key Program Instructors'}
              description={isAr ? 'تعرف على الكفاءات الأكاديمية التي سترافقك في رحلتك التعليمية' : 'Meet the academic experts guiding your educational journey'}
            />
          </div>
          <Link
            href={`/colleges/${collegeSlug}#faculty`}
            className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-all hover:bg-secondary/10 hover:text-secondary"
          >
            {isAr ? 'عرض كافة الدكاترة' : 'View All Faculty'}
            <ArrowRight className={cn("h-4 w-4 transition-transform", isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
          </Link>
        </div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {instructors.map((instructor) => (
            <motion.div
              key={instructor.id}
              variants={animationPresets.staggerItem}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
            >
              <div className="mb-6 flex justify-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-background shadow-lg">
                  {instructor.photo ? (
                    <Image
                      src={instructor.photo}
                      alt={instructor.fullName}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <User className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center">
                <h4 className="mb-1 text-lg font-bold text-foreground">
                  {instructor.fullName}
                </h4>
                <p className="text-sm font-medium text-secondary">
                  {instructor.academicTitle}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
