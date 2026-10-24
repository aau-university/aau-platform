import Image from 'next/image'
import { FolderOpen } from 'lucide-react'
import { RichText } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { PublicProjectDetail } from '@/lib/payload/get-public-projects'

export interface ProjectContentProps {
  project: PublicProjectDetail
  locale: Locale
}

export function ProjectContent({ project, locale }: ProjectContentProps) {
  const isAr = locale === 'ar'

  return (
    <div className="space-y-8">
      {/* Featured Image or Image Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 shadow-elegant md:aspect-video">
          {project.image ? (
            <Image
              src={project.image}
              alt={project.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          ) : project.images && project.images.length > 0 && project.images[0].image ? (
            <Image
              src={project.images[0].image}
              alt={project.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent text-muted-foreground/20">
              <FolderOpen className="h-24 w-24 stroke-[1.1]" />
            </div>
          )}
        </div>

        {/* Gallery Grid (under the main image if multiple images exist) */}
        {project.images && project.images.length > 1 && (
          <div className="grid grid-cols-3 gap-4">
            {project.images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/40 bg-muted/20 shadow-sm transition-colors duration-300 hover:border-secondary/50"
              >
                {img.image && (
                  <Image
                    src={img.image}
                    alt={`${project.title} ${i + 1}`}
                    fill
                    sizes="150px"
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description Overview Card */}
      {project.description && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <h2 className="mb-4 text-xl font-bold md:text-2xl flex items-center gap-2 border-b border-muted pb-4">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'نبذة عن المشروع' : 'Project Abstract'}
          </h2>
          <p className="max-w-[72ch] text-lg leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        </div>
      )}

      {/* Details RichText Card */}
      {project.details && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-elegant backdrop-blur-md">
          <h2 className="mb-6 text-xl font-bold md:text-2xl flex items-center gap-2 border-b border-muted pb-4">
            <div className="h-6 w-1 rounded-full bg-secondary" />
            {isAr ? 'شرح تفصيلي' : 'Technical Details'}
          </h2>
          <div className="prose prose-lg max-w-[72ch] text-muted-foreground leading-relaxed">
            <RichText content={project.details} />
          </div>
        </div>
      )}
    </div>
  )
}
