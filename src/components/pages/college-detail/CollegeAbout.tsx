import Image from 'next/image'
import { Users, Quote } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Badge } from '@/components/ui/badge'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'

export function CollegeAbout({ college, locale }: { college: PublicCollegeDetail; locale: Locale }) {
  if (!college.description && !college.deanName) return null;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 rtl:left-0 ltr:right-0 w-1/3 h-full bg-secondary/5 rounded-br-[100px] rtl:rounded-br-none rtl:rounded-bl-[100px] z-0" />
      
      <Container className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <div className="w-full lg:w-5/12">
            <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-background relative bg-muted/50 flex items-center justify-center group">
              {college.deanImage ? (
                <Image
                  src={college.deanImage}
                  alt={college.deanName || college.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              ) : college.image ? (
                <Image
                  src={college.image}
                  alt={college.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover opacity-90"
                />
              ) : (
                <Users className="w-32 h-32 text-muted-foreground/30" />
              )}
              {/* Subtle Gold Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-60" />
              
              {college.deanName && (
                <div className="absolute bottom-8 left-8 right-8 z-10 text-white text-center">
                  <p className="font-bold text-2xl">{college.deanName}</p>
                  <p className="text-secondary font-medium">{locale === 'ar' ? 'عميد الكلية' : 'College Dean'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-7/12 flex flex-col justify-center">
            <Badge variant="outline" className="w-fit mb-6 bg-secondary/10 text-secondary border-secondary/20 px-4 py-1.5 text-sm font-bold">
              {locale === 'ar' ? 'نبذة عن الكلية' : 'About the College'}
            </Badge>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-foreground leading-tight">
              {locale === 'ar' ? 'مرحباً بكم في صرح التميز الأكاديمي' : 'Welcome to the Edifice of Academic Excellence'}
            </h2>
            
            <div className="relative">
              <Quote className="absolute -top-6 rtl:-right-6 ltr:-left-6 w-16 h-16 text-secondary/10 rotate-180" />
              <div className="text-xl leading-relaxed text-muted-foreground border-s-4 border-secondary ps-4 sm:ps-8 py-2 relative z-10">
                {college.description ? (
                  <div className="prose prose-lg max-w-none text-muted-foreground prose-p:leading-relaxed">
                    <RichText content={college.description} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  )
}
