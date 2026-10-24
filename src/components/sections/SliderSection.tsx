'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/i18n/LanguageProvider'
import type { PublicSliderItem } from '@/lib/payload/get-public-sliders'

export interface SliderSectionProps {
  items: PublicSliderItem[]
  /** Enable autoplay (default true). */
  autoplay?: boolean
  /** Autoplay interval in milliseconds (default 5000). */
  interval?: number
  className?: string
}

export function SliderSection({
  items,
  autoplay = true,
  interval = 5000,
  className,
}: SliderSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  // Respect `prefers-reduced-motion`: users with vestibular sensitivities
  // should not be subjected to autoplay transitions (a11y / reduced-motion).
  const shouldReduceMotion = useReducedMotion()
  const enableAutoplay = autoplay && !shouldReduceMotion

  const [selectedIndex, setSelectedIndex] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: isAr ? 'rtl' : 'ltr' },
    enableAutoplay
      ? [Autoplay({ delay: interval, stopOnInteraction: false, stopOnMouseEnter: true })]
      : [],
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  // Keyboard nav: ArrowLeft / ArrowRight move between slides. In RTL the
  // semantics flip — ArrowLeft visually advances forward (matches the writing
  // direction). Embla's `scrollPrev`/`scrollNext` are direction-aware (we set
  // `direction: 'rtl'` above), so we always feed ArrowLeft → scrollPrev and
  // let Embla handle the visual mapping.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!emblaApi) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        emblaApi.scrollPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        emblaApi.scrollNext()
      }
    },
    [emblaApi],
  )

  if (items.length === 0) return null

  const snaps = Array.from({ length: items.length })

  return (
    <section
      className={cn('relative w-full overflow-hidden bg-primary', className)}
      aria-roledescription="carousel"
      aria-label={isAr ? 'الشرائح الرئيسية' : 'Hero Slider'}
    >
      <div
        className="overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        ref={emblaRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={isAr ? 'محتوى الشرائح' : 'Slider content'}
        onKeyDown={handleKeyDown}
      >
        <div className="flex">
          {items.map((slide, idx) => (
            <div
              key={slide.id || idx}
              className="relative flex-[0_0_100%] min-w-0"
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} / ${items.length}`}
            >
              {/* Background image */}
              <div className="relative h-[60vh] min-h-[420px] md:h-[75vh] md:min-h-[520px] w-full">
                {slide.image ? (
                  <Image
                    src={slide.image}
                    alt={slide.title || ''}
                    fill
                    priority={idx === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#111] to-primary" />
                )}
                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-black/35 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 via-transparent to-transparent rtl:from-transparent rtl:to-black/60" />
              </div>

              {/* Slide content */}
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4">
                  <div className="max-w-2xl">
                    {slide.title && (
                      <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 drop-shadow-lg leading-tight">
                        {slide.title}
                      </h2>
                    )}
                    {slide.subtitle && (
                      <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 drop-shadow-md leading-relaxed line-clamp-3">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.linkUrl && (
                      <Button asChild variant="primary" size="lg">
                        <Link
                          href={slide.linkUrl}
                          {...(slide.linkNewTab
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          {isAr ? 'اعرف المزيد' : 'Learn More'}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {snaps.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => emblaApi?.scrollTo(idx)}
            aria-label={isAr ? `الشريحة ${idx + 1}` : `Slide ${idx + 1}`}
            className={cn(
              'h-2.5 rounded-full transition-all duration-300',
              idx === selectedIndex
                ? 'w-8 bg-secondary shadow-gold'
                : 'w-2.5 bg-card/50 hover:bg-card/80',
            )}
          />
        ))}
      </div>
    </section>
  )
}

export default SliderSection
