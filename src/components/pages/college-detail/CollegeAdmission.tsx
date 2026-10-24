import { Container } from '@/components/ui/Container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'

export function CollegeAdmission({ college, locale }: { college: PublicCollegeDetail; locale: Locale }) {
  if (!college.admissionRequirements) return null;

  return (
    <section className="py-24 bg-black text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <Container className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="w-full lg:w-5/12 text-center lg:text-start lg:rtl:text-right">
            <Badge variant="outline" className="mb-6 bg-card/10 text-white border-border/20 px-4 py-1.5 font-bold">
              {locale === 'ar' ? 'انضم إلينا' : 'Join Us'}
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white leading-tight">
              {locale === 'ar' ? 'متطلبات القبول' : 'Admission Requirements'}
            </h2>
            <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
              {locale === 'ar' ? 'تعرف على الشروط المطلوبة وانضم إلى نخبة الطلاب في جامعتنا وبادر بتأمين مقعدك الآن.' : 'Check the required conditions and join the elite students at our university. Secure your seat now.'}
            </p>
            <Button size="lg" className="rounded-full bg-secondary text-primary hover:bg-secondary/90 px-10 h-14 text-lg font-bold w-full sm:w-auto shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              {locale === 'ar' ? 'سجل الآن' : 'Apply Now'}
            </Button>
          </div>
          
          <div className="w-full lg:w-7/12">
            <div className="bg-foreground/80 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-10 md:p-14 border border-border shadow-2xl prose prose-invert prose-lg max-w-none prose-li:marker:text-secondary">
              <RichText content={college.admissionRequirements} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
