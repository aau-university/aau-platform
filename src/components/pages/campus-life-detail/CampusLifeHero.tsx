import Image from 'next/image'
import { Sparkles, Compass } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import type { Locale } from '@/i18n/locale'
import type { PublicCampusLifeDetail } from '@/lib/payload/get-public-campus-life'

export interface CampusLifeHeroProps {
  item: PublicCampusLifeDetail
  locale: Locale
}

export function CampusLifeHero({ item, locale }: CampusLifeHeroProps) {
  const isAr = locale === 'ar'

  const getKindDetails = () => {
    switch (item.kind) {
      case 'life':
        return {
          label: isAr ? 'حياة جامعية' : 'Campus Life',
          icon: Compass,
        }
      case 'activity':
        return {
          label: isAr ? 'أنشطة طلابية' : 'Student Activities',
          icon: Sparkles,
        }
      default:
        return {
          label: isAr ? 'حياة جامعية' : 'Campus Life',
          icon: Compass,
        }
    }
  }

  const kind = getKindDetails()
  const KindIcon = kind.icon

  return (
    <div className="relative flex min-h-[50vh] flex-col justify-center overflow-hidden bg-primary pb-16 pt-36">
      {/* Background Image / Mesh */}
      <div className="absolute inset-0 z-0">
        {item.image ? (
          <>
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-cover scale-105 animate-in zoom-in duration-1000 ease-out opacity-55"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/35" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
        {/* Gold Blur glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[35rem] h-[35rem] bg-secondary/15 rounded-full blur-[110px] pointer-events-none" />
      </div>

      <Container className="relative z-10 flex flex-col items-center text-center">
        <Breadcrumb
          locale={locale}
          items={[
            { label: isAr ? 'الحياة الجامعية' : 'Campus Life', href: '/campus-life' },
            { label: item.title },
          ]}
        />

        <div className="mt-8 max-w-4xl mx-auto flex flex-col items-center">
          <Badge className="mb-6 bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold shadow-gold rounded-full px-4 py-1.5 text-xs tracking-wide border border-secondary/20">
            <KindIcon className="w-4 h-4 me-1.5 inline shrink-0" />
            {kind.label}
          </Badge>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground drop-shadow-2xl md:text-6xl">
            {item.title}
          </h1>

          {item.summary && (
            <p className="max-w-[68ch] text-base leading-relaxed text-primary-foreground/80 drop-shadow-md sm:text-lg">
              {item.summary}
            </p>
          )}
        </div>
      </Container>
    </div>
  )
}

export default CampusLifeHero
