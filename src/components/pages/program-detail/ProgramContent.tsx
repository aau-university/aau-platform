'use client'

import Link from 'next/link'
import { Sparkles, Target, Briefcase, ListChecks } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { RichText, type RichTextContent } from '@/components/RichText'
import type { AcademicProgram } from '@/payload-types'
import type { Locale } from '@/i18n/locale'

function asRichText(value: AcademicProgram['description']): RichTextContent | null {
  return (value as RichTextContent | null | undefined) ?? null
}

function Section({
  icon: Icon,
  title,
  content,
}: {
  icon: typeof Target
  title: string
  content: AcademicProgram['description']
}) {
  const rich = asRichText(content)
  if (!rich) return null

  return (
    <section className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        {title}
      </h2>
      <div className="prose prose-lg max-w-3xl text-muted-foreground">
        <RichText content={rich} />
      </div>
    </section>
  )
}

export function ProgramContent({
  program,
  locale,
  studyPlanHref,
}: {
  program: AcademicProgram
  locale: Locale
  studyPlanHref?: string
}) {
  const description = asRichText(program.description)
  const isAr = locale === 'ar'

  return (
    <Container className="py-14 md:py-20">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        {/* Main Content Area */}
        <article className="order-2 flex min-w-0 flex-col gap-10 lg:order-1">
          {description && (
            <div className="prose prose-lg max-w-3xl text-foreground/90 leading-relaxed md:prose-xl">
              <RichText content={description} />
            </div>
          )}

          <div className="flex flex-col gap-8">
            <Section
              icon={Sparkles}
              title={isAr ? 'لماذا هذا البرنامج؟' : 'Why This Program?'}
              content={program.whyProgram}
            />

            <Section
              icon={Target}
              title={isAr ? 'الأهداف' : 'Objectives'}
              content={program.objectives}
            />

            <Section
              icon={Briefcase}
              title={isAr ? 'آفاق المهنة' : 'Career Prospects'}
              content={program.careerProspects}
            />

            <Section
              icon={ListChecks}
              title={isAr ? 'خطوات التقديم' : 'Application Steps'}
              content={program.applicationSteps}
            />
          </div>
        </article>

        {/* Sidebar Sticky Area */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-28">
           <div className="p-6 rounded-3xl border border-secondary/20 bg-gradient-to-b from-secondary/10 to-transparent">
             <h3 className="text-lg font-bold text-foreground mb-4">
               {isAr ? 'روابط سريعة' : 'Quick Links'}
             </h3>
             {/*
               Issue #18 — these used to look clickable but had no
               `href`, so clicks did nothing. The study plan now links to
               its dedicated route when the program has one; admission /
               contact-college routes are still deferred, so they stay as
               plain informational list items (no fake interactivity).
             */}
              <ul className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
               {studyPlanHref ? (
                 <li>
                   <Link
                     href={studyPlanHref}
                     className="group flex items-center gap-2 rounded-lg -mx-2 px-2 py-1 font-semibold text-foreground transition-colors hover:text-secondary"
                   >
                     <div className="w-1.5 h-1.5 rounded-full bg-secondary transition-transform group-hover:scale-150" />
                     {isAr ? 'تصفح الخطة الدراسية' : 'View Study Plan'}
                   </Link>
                 </li>
               ) : (
                 <li className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                   {isAr ? 'تصفح الخطة الدراسية' : 'View Study Plan'}
                 </li>
               )}
               <li className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                 {isAr ? 'شروط القبول' : 'Admission Req.'}
               </li>
               <li className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                 {isAr ? 'تواصل مع الكلية' : 'Contact College'}
               </li>
              </ul>
            </div>
          </aside>
        </div>
    </Container>
  )
}
