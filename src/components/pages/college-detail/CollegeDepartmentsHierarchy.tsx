'use client'

import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, ChevronRight, User, Clock, CalendarDays, CheckCircle2, Users } from 'lucide-react'
import Link from 'next/link'
import { buildAcademicProgramPath } from '@/utilities/collectionRoutes'
import Image from 'next/image'

import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicCollegeDepartmentItem, PublicCollegeProgramItem } from '@/lib/payload/get-public-colleges'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TeamMemberCard } from '@/components/cards/TeamMemberCard'
import { getDegreeLabel } from '@/components/pages/program-detail/ProgramStats'

interface CollegeDepartmentsHierarchyProps {
  collegeSlug: string
  departments: PublicCollegeDepartmentItem[]
}

function ProgramCard({ program, collegeSlug }: { program: PublicCollegeProgramItem; collegeSlug: string }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <Link href={buildAcademicProgramPath(collegeSlug, program.slug) ?? '#'}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        className={cn(
          "group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 transition-all duration-300",
          "hover:border-secondary/30 hover:bg-primary-foreground/10 hover:shadow-xl hover:shadow-secondary/5"
        )}
      >
        <div>
          <div className="mb-3 flex items-start justify-between">
            <Badge variant="outline" className="border-secondary/20 bg-secondary/5 text-secondary">
              {program.degreeType
                ? `${isAr ? 'درجة' : 'Degree'}: ${getDegreeLabel(program.degreeType, language)}`
                : isAr
                  ? 'برنامج أكاديمي'
                  : 'Academic Program'}
            </Badge>
            <div className="rounded-full bg-primary-foreground/5 p-2 text-primary-foreground/60 transition-colors group-hover:bg-secondary/20 group-hover:text-secondary">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <h4 className="mb-2 text-lg font-bold text-primary-foreground transition-colors group-hover:text-secondary">
            {program.name}
          </h4>
          <p className="line-clamp-2 text-sm text-primary-foreground/70">
            {program.description}
          </p>
          
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-primary-foreground/70">
            {program.duration && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-secondary" />
                <span>{program.duration}</span>
              </div>
            )}
            {program.studyYears && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-secondary" />
                <span>{program.studyYears} {isAr ? 'سنوات' : 'Years'}</span>
              </div>
            )}
            {program.highSchoolType && (
              <div className="col-span-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span className="truncate">{program.highSchoolType}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-primary-foreground/10 pt-4 text-sm font-medium text-secondary">
          <span>{isAr ? 'التفاصيل' : 'View Details'}</span>
          <ChevronRight className={cn("h-4 w-4 transition-transform", isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
        </div>
      </motion.div>
    </Link>
  )
}

export function CollegeDepartmentsHierarchy({
  collegeSlug,
  departments,
}: CollegeDepartmentsHierarchyProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!departments || departments.length === 0) return null

  return (
    <section className="relative overflow-hidden py-24 bg-primary text-primary-foreground">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/10 via-primary to-primary" />
      
      <Container className="relative z-10">
        <SectionHeader
          icon={GraduationCap}
          badge={isAr ? 'الهيكلة الأكاديمية' : 'Academic Structure'}
          title={isAr ? 'أقسام الكلية وبرامجها' : 'College Departments & Programs'}
          description={isAr ? 'تعرف على الأقسام الأكاديمية ونخبة البرامج المتاحة للتسجيل' : 'Explore our academic departments and available programs'}
          className="[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/70 [&_div.text-primary]:text-secondary"
        />

        <div className="mt-16 flex flex-col gap-12">
          {departments.map((dept) => (
            <motion.div
              key={dept.id}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              variants={animationPresets.fadeUp}
              className="relative rounded-3xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 md:p-10 backdrop-blur-xl shadow-2xl"
            >
              {/* Department Header */}
              <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h3 className="mb-4 text-3xl font-bold text-primary-foreground">{dept.name}</h3>
                  {dept.description && (
                    <p className="max-w-3xl text-lg text-primary-foreground/70">
                      {dept.description}
                    </p>
                  )}
                </div>
                
                {/* Head of Department Badge */}
                {dept.headOfDepartment && (
                  <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
                    {dept.headOfDepartment.photo ? (
                      <Image
                        src={dept.headOfDepartment.photo} 
                        alt={dept.headOfDepartment.fullName}
                        width={64}
                        height={64}
                        className="size-16 rounded-full border-2 border-secondary/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-secondary/50 bg-secondary/20 text-secondary">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                        {isAr ? 'رئيس القسم' : 'Head of Department'}
                      </div>
                      <div className="text-lg font-bold text-primary-foreground">
                        {dept.headOfDepartment.fullName}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Programs Grid inside Department */}
              {dept.programs && dept.programs.length > 0 ? (
                <div className="mb-8">
                  <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-primary-foreground/90">
                    <BookOpen className="h-5 w-5 text-secondary" />
                    {isAr ? 'البرامج الأكاديمية' : 'Academic Programs'}
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {dept.programs.map((program) => (
                      <ProgramCard key={program.id} program={program} collegeSlug={collegeSlug} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-8 mb-8 rounded-xl border border-dashed border-primary-foreground/10 bg-primary-foreground/5 p-8 text-center text-primary-foreground/50">
                  {isAr ? 'لا توجد برامج مسجلة في هذا القسم حالياً' : 'No programs registered in this department currently'}
                </div>
              )}

              {/* Faculty Grid inside Department */}
              {dept.faculty && dept.faculty.length > 0 && (
                <div className="border-t border-primary-foreground/10 pt-8 mt-4">
                  <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-primary-foreground/90">
                    <Users className="h-5 w-5 text-secondary" />
                    {isAr ? 'أعضاء هيئة التدريس بالقسم' : 'Department Faculty'}
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {dept.faculty.map((member) => {
                      const adaptedMember = {
                        id: member.id,
                        name: member.fullName,
                        jobTitle: member.academicTitle,
                        image: member.photo,
                        bio: member.biography,
                      };
                      return (
                        <div key={member.id} className="h-full">
                          <TeamMemberCard member={adaptedMember as any} className="!bg-primary-foreground/5 !border-primary-foreground/10 hover:!border-secondary/30" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
