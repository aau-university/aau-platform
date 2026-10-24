import Image from 'next/image'
import { Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'

import type { TeamMember } from '@/payload-types'

export type TeamMemberCardProps = {
  member: Pick<TeamMember, 'name' | 'jobTitle' | 'group'> & {
    id?: string | number
    image?: any
  }
  className?: string
}

export function TeamMemberCard({
  member,
  className,
}: TeamMemberCardProps) {
  const { name, jobTitle, image, group } = member

  return (
    <article
      className={cn(
        'group bg-card/40 backdrop-blur-sm rounded-2xl p-6 text-center shadow border border-border/5 hover:shadow-elegant transition-all duration-500 h-full flex flex-col',
        className,
      )}
    >
      <div className="relative w-24 h-24 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border-2 border-primary/20 group-hover:border-primary transition-colors duration-300 shrink-0">
        {image && typeof image === 'string' ? (
          <Image 
            src={image} 
            alt={name} 
            fill 
            sizes="96px" 
            className="object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : image && typeof image !== 'number' ? (
          <Media
            resource={image}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <Users className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors duration-300" />
        )}
      </div>
      
      <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors mb-1">{name}</h3>
      
      {jobTitle && (
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{jobTitle}</p>
      )}
      
      {group && (
        <div className="mt-4 shrink-0">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {group}
          </span>
        </div>
      )}
    </article>
  )
}

export default TeamMemberCard
