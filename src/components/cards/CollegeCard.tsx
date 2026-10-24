'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, GraduationCap, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { buttonVariants } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import type { College } from '@/payload-types'

export type CollegeCardProps = {
  college: Pick<College, 'name' | 'slug'> & {
    id?: string | number
    image?: string | number | College['image']
    description?: string | College['description']
    programsCount?: number
    facultyCount?: number
  }
  href?: string
  subtitle?: string
  className?: string
  isAr?: boolean
}

export function CollegeCard({
  college,
  href,
  subtitle,
  className,
  isAr = false,
}: CollegeCardProps) {
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const { name, slug, description, image, programsCount, facultyCount } = college
  const linkHref = href ?? (slug ? `/colleges/${slug}` : '#')

  return (
    <Link
      href={linkHref}
      className="group block h-full"
      aria-label={isAr ? `استكشف ${name}` : `Explore ${name}`}
    >
      <article
        className={cn(
          'group relative bg-card/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-border/5 hover:shadow-elegant transition-shadow h-full flex flex-col',
          className,
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary via-[#1a1a1a] to-primary shrink-0">
          {image && typeof image === 'string' ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : image && typeof image === 'object' ? (
            <Media
              resource={image}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent" />

          <div className="absolute top-4 right-4 w-14 h-14 bg-card/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-border/30 transition-transform duration-500 group-hover:rotate-[360deg] group-hover:scale-110">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="text-2xl font-bold mb-2 line-clamp-2">{name}</h3>
            <div className="flex items-center gap-4 text-white/80 text-sm mt-2">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {programsCount ?? 0} {isAr ? 'برامج' : 'Programs'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {facultyCount ?? 0} {isAr ? 'عضو تدريس' : 'Faculty'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col flex-1">
          {subtitle && (
            <p className="mb-2 text-sm font-medium text-secondary">{subtitle}</p>
          )}

          {description && typeof description === 'string' ? (
            <p className="text-muted-foreground mb-4 sm:mb-6 line-clamp-2 flex-1">
              {description}
            </p>
          ) : description && typeof description === 'object' ? (
            <div className="line-clamp-3 text-sm text-muted-foreground prose prose-sm max-w-none flex-1 mb-4">
              <RichText content={description} />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-auto pt-4">
            <span
              className={cn(
                buttonVariants({ variant: 'primary' }),
                'w-full group/btn relative overflow-hidden',
              )}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isAr ? 'استكشف الكلية' : 'Explore College'}
                <Arrow className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1" />
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default CollegeCard
