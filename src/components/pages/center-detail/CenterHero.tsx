import Image from 'next/image'
import { Building2, MapPin, Phone, Mail, GraduationCap, Briefcase } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import type { Locale } from '@/i18n/locale'
import type { PublicCenterDetail } from '@/lib/payload/get-public-centers'

export interface CenterHeroProps {
  center: PublicCenterDetail
  locale: Locale
}

export function CenterHero({ center, locale }: CenterHeroProps) {
  const isAr = locale === 'ar'

  const getKindDetails = () => {
    switch (center.kind) {
      case 'center':
        return {
          label: isAr ? 'مركز متخصص' : 'Specialized Center',
          icon: Building2,
        }
      case 'service':
        return {
          label: isAr ? 'مركز خدمي' : 'Service Center',
          icon: Briefcase,
        }
      case 'universityCenter':
        return {
          label: isAr ? 'مركز جامعي' : 'University Center',
          icon: GraduationCap,
        }
      default:
        return {
          label: isAr ? 'مركز' : 'Center',
          icon: Building2,
        }
    }
  }

  const kind = getKindDetails()
  const KindIcon = kind.icon

  const contactItems = [
    { label: isAr ? 'الموقع' : 'Location', value: center.location, icon: MapPin },
    { label: isAr ? 'الهاتف' : 'Phone', value: center.phone, icon: Phone, dir: 'ltr' },
    { label: isAr ? 'البريد الإلكتروني' : 'Email', value: center.email, icon: Mail },
  ].filter((item) => !!item.value)

  return (
    <div className="relative flex min-h-[50vh] flex-col justify-center overflow-hidden bg-primary pb-16 pt-36">
      {/* Background Image / Mesh */}
      <div className="absolute inset-0 z-0">
        {center.image ? (
          <Image
            src={center.image}
            alt={center.title}
            fill
            className="object-cover scale-105 animate-in zoom-in duration-1000 ease-out opacity-50"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-transparent" />
        {/* Subtle Gold Blur light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[35rem] h-[35rem] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <Container className="relative z-10 flex flex-col items-center text-center">
        <Breadcrumb
          locale={locale}
          items={[
            { label: isAr ? 'المراكز' : 'Centers', href: '/centers' },
            { label: center.title },
          ]}
        />

        <div className="mt-8 max-w-4xl mx-auto flex flex-col items-center">
          <Badge className="mb-6 bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold shadow-gold rounded-full px-4 py-1.5 text-xs tracking-wide border border-secondary/20">
            <KindIcon className="w-4 h-4 me-1.5 inline shrink-0" />
            {kind.label}
          </Badge>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground drop-shadow-2xl md:text-6xl">
            {center.title}
          </h1>

          {/* Integrated Contact Info Pills inside the flow for better spacing & mobile safety */}
          {contactItems.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-4 max-w-3xl">
              {contactItems.map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full border border-border/20 bg-primary/60 px-4 py-2 shadow-elegant backdrop-blur-md transition-colors duration-300 hover:border-secondary/30"
                >
                  <stat.icon className="w-4 h-4 text-secondary shrink-0" />
                  <span
                    className="break-all text-xs font-medium text-primary-foreground/90 sm:text-sm"
                    dir={stat.dir}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
export default CenterHero
