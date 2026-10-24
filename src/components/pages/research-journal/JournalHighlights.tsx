import { BookOpen, GraduationCap } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import type { Locale } from '@/i18n/locale'

export interface JournalHighlightsProps {
  locale: Locale
}

export function JournalHighlights({ locale }: JournalHighlightsProps) {
  const isAr = locale === 'ar'

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
      <Container>
        <h2 className="sr-only">
          {isAr ? 'أبرز مميزات المجلة العلمية' : 'Scientific journal highlights'}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Peer-Reviewed Card */}
          <div className="group rounded-3xl border border-border/60 bg-card/75 p-8 text-center shadow-elegant backdrop-blur-md hover:border-secondary/40 hover:-translate-y-1.5 transition-all duration-500">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-secondary group-hover:text-white duration-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">
              {isAr ? 'أبحاث محكمة' : 'Peer-Reviewed'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? 'جميع المقالات المنشورة تخضع لعمليات تقييم ومراجعة الأقران لضمان الرصانة العلمية.'
                : 'All publications undergo rigorous double-blind peer-review processes to guarantee academic rigor.'}
            </p>
          </div>

          {/* Academic Faculty Card */}
          <div className="group rounded-3xl border border-border/60 bg-card/75 p-8 text-center shadow-elegant backdrop-blur-md hover:border-secondary/40 hover:-translate-y-1.5 transition-all duration-500">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-white duration-500">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">
              {isAr ? 'كوادر أكاديمية متميزة' : 'Academic Faculty'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? 'حاضنة للنتاج المعرفي للأقسام العلمية ومخرجات الهيئة التدريسية المتميزة بالجامعة.'
                : 'Showcasing distinguished research output and monographs from academic scholars at Al-Jeel Al-Jadeed University.'}
            </p>
          </div>

          {/* Multi-Disciplinary Card */}
          <div className="group rounded-3xl border border-border/60 bg-card/75 p-8 text-center shadow-elegant backdrop-blur-md hover:border-secondary/40 hover:-translate-y-1.5 transition-all duration-500">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-secondary group-hover:text-white duration-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">
              {isAr ? 'تغطية متعددة التخصصات' : 'Multi-Disciplinary'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? 'تغطي المجلة طيفاً واسعاً من المجالات الهندسية، الطبية، التقنية، والإدارية.'
                : 'Covering a comprehensive spectrum of fields including engineering, medical sciences, tech, and business.'}
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
