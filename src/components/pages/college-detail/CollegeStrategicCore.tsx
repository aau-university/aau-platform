import { Eye, Flag, Target, Gem, Compass, Award } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Badge } from '@/components/ui/badge'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicCollegeDetail } from '@/lib/payload/get-public-colleges'

function StrategicItem({ title, icon: Icon, content }: { title: string, icon: any, content: any }) {
  if (!content) return null;
  return (
    <div className="flex flex-row items-start gap-4 sm:gap-6 p-5 sm:p-6 md:p-8 rounded-3xl bg-background border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-xl transition-all duration-300 group text-start">
      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-muted/50 group-hover:bg-secondary/10 flex items-center justify-center transition-colors">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-secondary" />
      </div>
      <div className="w-full min-w-0">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 text-foreground group-hover:text-secondary transition-colors">{title}</h3>
        <div className="prose max-w-none text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
          <RichText content={content} />
        </div>
      </div>
    </div>
  )
}

export function CollegeStrategicCore({ college, locale }: { college: PublicCollegeDetail; locale: Locale }) {
  const hasInfo = college.vision || college.mission || college.goals || college.values || college.strategy || college.quality;
  if (!hasInfo) return null;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <Container>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">

          {/* Main Focus (Vision) - Black & Gold Contrast */}
          <div className="lg:sticky lg:top-32">
            <Badge variant="outline" className="mb-6 bg-secondary/10 text-secondary border-secondary/20 px-4 py-1.5 font-bold">
              {locale === 'ar' ? 'التوجه الاستراتيجي' : 'Strategic Direction'}
            </Badge>
            <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold mb-8 text-foreground">
              {locale === 'ar' ? 'رؤيتنا ورسالتنا' : 'Vision & Mission'}
            </h2>
            {college.vision && (
              <div className="bg-black text-white p-8 md:p-10 xl:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-border shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-[60px] -z-0" />
                <div className="relative z-10">
                  <Eye className="w-10 h-10 md:w-12 md:h-12 text-secondary mb-6" />
                  <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white">{locale === 'ar' ? 'الرؤية' : 'Vision'}</h3>
                  <div className="text-lg md:text-xl leading-relaxed text-muted-foreground font-medium prose prose-invert">
                    <RichText content={college.vision} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Elements */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <StrategicItem title={locale === 'ar' ? 'الرسالة' : 'Mission'} icon={Flag} content={college.mission} />
            <StrategicItem title={locale === 'ar' ? 'الأهداف' : 'Goals'} icon={Target} content={college.goals} />
            <StrategicItem title={locale === 'ar' ? 'القيم' : 'Values'} icon={Gem} content={college.values} />
            <StrategicItem title={locale === 'ar' ? 'الاستراتيجية' : 'Strategy'} icon={Compass} content={college.strategy} />
            <StrategicItem title={locale === 'ar' ? 'الجودة' : 'Quality'} icon={Award} content={college.quality} />
          </div>

        </div>
      </Container>
    </section>
  )
}
