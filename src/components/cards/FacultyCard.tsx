'use client'

import Link from 'next/link'
import { User, Mail, GraduationCap, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { FacultyMember, Media, College } from '@/payload-types'

export interface FacultyCardProps {
  member: FacultyMember
  isAr?: boolean
  className?: string
}

function isPopulatedMedia(value: FacultyMember['photo']): value is Media {
  return typeof value === 'object' && value !== null
}

function isPopulatedCollege(value: FacultyMember['college']): value is College {
  return typeof value === 'object' && value !== null
}

export function FacultyCard({ member, isAr = false, className }: FacultyCardProps) {
  const photo = isPopulatedMedia(member.photo) ? member.photo : null
  const college = isPopulatedCollege(member.college) ? member.college : null

  const initials = member.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

  return (
    <Link
      href={`/faculty/${member.slug}`}
      className={cn('group block h-full cursor-pointer', className)}
      aria-label={member.fullName}
    >
      <Card className="relative h-full overflow-hidden border border-border/80 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-gold hover:border-secondary/35 transition-all duration-500 rounded-2xl flex flex-col pt-1">
        {/* Top Gold Border Decorator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80 group-hover:opacity-100 transition-opacity" />

        <CardContent className="flex flex-col items-center p-6 text-center flex-grow">
          {/* Avatar Container with Glow & Scale Effects */}
          <div className="relative mb-5 shrink-0">
            <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-md transition-all duration-500 group-hover:border-secondary/40 group-hover:scale-105 group-hover:shadow-elegant">
              {photo?.url ? (
                <AvatarImage
                  src={photo.url}
                  alt={member.fullName}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-2xl font-extrabold text-white">
                {initials ? initials : <User className="h-10 w-10 text-white/80" />}
              </AvatarFallback>
            </Avatar>
            
            {/* Small hovering academic cap badge icon */}
            <div className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground p-1.5 rounded-lg border border-border/80 shadow-md transition-transform duration-500 group-hover:rotate-12">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Member Name */}
          <h3 className="mb-1.5 line-clamp-1 text-lg font-bold text-foreground group-hover:text-secondary transition-colors duration-300">
            {member.fullName}
          </h3>

          {/* Academic Title */}
          {member.academicTitle && (
            <Badge className="mb-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-2.5 py-0.5 rounded-full text-xs shadow-sm">
              {member.academicTitle}
            </Badge>
          )}

          {/* Affiliation / College */}
          {college && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 justify-center">
              <Building2 className="h-3.5 w-3.5 text-secondary/70 shrink-0" />
              <span className="line-clamp-1 font-medium">{college.name}</span>
            </div>
          )}

          {/* Contact Email */}
          {member.email && (
            <div className="mt-auto w-full pt-3 border-t border-border/40 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 font-medium">
              <Mail className="h-3.5 w-3.5 text-secondary/80" />
              <span className="truncate max-w-[180px]" dir="ltr">
                {member.email}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default FacultyCard
