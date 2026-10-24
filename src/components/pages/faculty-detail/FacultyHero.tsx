'use client'

import { motion } from 'framer-motion'
import { User, GraduationCap, Building2 } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Locale } from '@/i18n/locale'
import type { FacultyMember, Media, College } from '@/payload-types'

export interface FacultyHeroProps {
  member: FacultyMember
  locale: Locale
}

function isPopulatedMedia(value: FacultyMember['photo']): value is Media {
  return typeof value === 'object' && value !== null
}

function isPopulatedCollege(value: FacultyMember['college']): value is College {
  return typeof value === 'object' && value !== null
}

export function FacultyHero({ member, locale }: FacultyHeroProps) {
  const isAr = locale === 'ar'
  const photo = isPopulatedMedia(member.photo) ? member.photo : null
  const college = isPopulatedCollege(member.college) ? member.college : null

  const initials = member.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  }

  return (
    <div className="relative min-h-[48vh] flex flex-col justify-center overflow-hidden pb-16 pt-36 bg-black">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-foreground via-foreground to-foreground" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,169,97,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground via-black/40 to-transparent" />
      
      {/* Subtle Gold blur light source */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-secondary/10 rounded-full blur-[130px] pointer-events-none" />

      <Container className="relative z-10 flex flex-col items-center text-center">
        {/* Breadcrumb container with animation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Breadcrumb
            locale={locale}
            items={[
              { label: isAr ? 'الكادر التعليمي' : 'Faculty', href: '/faculty' },
              { label: member.fullName },
            ]}
          />
        </motion.div>

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Large Avatar container with premium frame and hover animations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            className="relative mb-6"
          >
            {/* Outer soft glowing rings */}
            <div className="absolute inset-0 scale-105 rounded-full bg-secondary/20 blur-md" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-secondary/50 via-transparent to-secondary/30 opacity-70" />
            
            <Avatar className="relative h-32 w-32 md:h-40 md:w-40 border-4 border-secondary/40 shadow-elegant bg-foreground overflow-hidden z-10 transition-transform duration-500 group-hover:scale-105">
              {photo?.url ? (
                <AvatarImage 
                  src={photo.url} 
                  alt={member.fullName} 
                  className="object-cover transition-transform duration-700 group-hover:scale-110" 
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-foreground/80 to-foreground text-4xl font-extrabold text-secondary">
                {initials ? initials : <User className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>

            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground p-2.5 rounded-2xl border border-black/80 shadow-gold z-20"
            >
              <GraduationCap className="h-5 w-5" />
            </motion.div>
          </motion.div>

          {/* Academic Title Badge */}
          {member.academicTitle && (
            <motion.div
              {...fadeInUp}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <Badge className="mb-5 bg-gradient-to-r from-secondary/90 to-secondary hover:from-secondary hover:to-secondary/90 text-secondary-foreground font-extrabold shadow-md rounded-full px-5 py-1.5 text-xs tracking-wider border border-secondary/20">
                {member.academicTitle}
              </Badge>
            </motion.div>
          )}

          {/* Member Name with elegant gold text shadow */}
          <motion.h1
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 tracking-tight text-white drop-shadow-2xl leading-tight font-display"
          >
            {member.fullName}
          </motion.h1>

          {/* College link */}
          {college && (
            <motion.div
              {...fadeInUp}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/5 bg-card/[0.03] backdrop-blur-sm text-white/80 text-sm font-medium hover:text-secondary hover:border-secondary/20 hover:bg-secondary/[0.02] transition-all duration-300">
                <Building2 className="h-4 w-4 text-secondary shrink-0" />
                <span>{college.name}</span>
              </div>
            </motion.div>
          )}
        </div>
      </Container>
    </div>
  )
}

export default FacultyHero
