'use client'

import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { motion } from 'framer-motion'

import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { TeamMemberCard } from '@/components/cards/TeamMemberCard'
import { animationPresets } from '@/lib/animation'
import type { PublicCollegeFacultyItem, PublicCollegeDepartmentItem } from '@/lib/payload/get-public-colleges'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FacultyDirectoryProps {
  collegeName: string
  faculty: PublicCollegeFacultyItem[]
  departments: PublicCollegeDepartmentItem[]
}

export function FacultyDirectory({ collegeName, faculty, departments }: FacultyDirectoryProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')

  const filteredFaculty = faculty.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (member.academicTitle && member.academicTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesDept = selectedDepartment === 'all' || member.departmentId === selectedDepartment

    return matchesSearch && matchesDept
  })

  return (
    <div className="py-20 bg-background min-h-[60vh]">
      <Container>
        <header className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-foreground/25 bg-secondary/10 px-4 py-2 text-xs font-bold tracking-wide text-gold-foreground shadow-sm sm:text-sm">
            <Users className="size-4" aria-hidden="true" />
            <span>{isAr ? 'الدليل الشامل' : 'Comprehensive Directory'}</span>
          </div>
          <h1 className="mb-6 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            {isAr
              ? `دليل أعضاء هيئة التدريس - ${collegeName}`
              : `Faculty Directory - ${collegeName}`}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? 'ابحث عن أعضاء هيئة التدريس في الكلية وتعرف على تخصصاتهم'
              : 'Search for college faculty members and explore their specializations'}
          </p>
        </header>

        {/* Filters */}
        <div className="mx-auto mb-12 flex max-w-3xl flex-col gap-4 md:flex-row">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="faculty-search" className="text-sm font-semibold text-foreground">
              {isAr ? 'البحث بالاسم أو المسمى الأكاديمي' : 'Search by name or academic title'}
            </label>
            <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input 
              id="faculty-search"
              type="search"
              placeholder={isAr ? "ابحث بالاسم أو التخصص..." : "Search by name or title..."} 
              className="min-h-11 border-border bg-card ps-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 md:w-64">
            <label id="faculty-department-label" className="text-sm font-semibold text-foreground">
              {isAr ? 'القسم الأكاديمي' : 'Academic department'}
            </label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger aria-labelledby="faculty-department-label" className="min-h-11 border-border bg-card">
                <SelectValue placeholder={isAr ? "جميع الأقسام" : "All Departments"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "جميع الأقسام" : "All Departments"}</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {filteredFaculty.length > 0 ? (
          <motion.div 
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={animationPresets.stagger}
          >
            {filteredFaculty.map((member) => {
              const adaptedMember = {
                id: member.id,
                name: member.fullName,
                jobTitle: member.academicTitle,
                image: member.photo,
                bio: member.biography,
              };
              return (
                <motion.div key={member.id} variants={animationPresets.staggerItem} className="h-full">
                  <TeamMemberCard member={adaptedMember as any} />
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <section role="status" aria-live="polite" className="rounded-3xl border border-border bg-card py-20 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="mb-2 text-xl font-bold text-foreground">
              {isAr ? "لا توجد نتائج" : "No results found"}
            </h2>
            <p className="text-muted-foreground">
              {isAr ? "حاول تغيير كلمات البحث أو القسم" : "Try changing your search terms or department filter"}
            </p>
          </section>
        )}
      </Container>
    </div>
  )
}
