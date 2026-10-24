'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  BookOpen,
  GraduationCap,
  Award,
  Briefcase,
  ExternalLink,
  Info,
  Lightbulb,
  Sparkles,
} from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RichText, type RichTextContent } from '@/components/RichText'
import type { Locale } from '@/i18n/locale'
import type { FacultyMember } from '@/payload-types'

export interface FacultyInfoProps {
  member: FacultyMember
  locale: Locale
  sidebar: ReactNode
}

function asRichText(value: FacultyMember['biography']): RichTextContent | null {
  return (value as RichTextContent | null | undefined) ?? null
}

export function FacultyInfo({ member, locale, sidebar }: FacultyInfoProps) {
  const isAr = locale === 'ar'
  const biography = asRichText(member.biography)
  const hasResearchInterests = Boolean(member.researchInterests?.trim())

  const publications = member.publications ?? []
  const courses = member.courses ?? []
  const education = member.education ?? []
  const experience = member.experience ?? []
  const skills = member.skills ?? []

  const hasOverview = Boolean(biography) || hasResearchInterests
  const hasAnyContent =
    hasOverview ||
    publications.length > 0 ||
    courses.length > 0 ||
    education.length > 0 ||
    experience.length > 0 ||
    skills.length > 0

  type TabKey = 'overview' | 'timeline' | 'publications' | 'courses'
  const tabs = [
    {
      key: 'overview' as TabKey,
      label: isAr ? 'السيرة والاهتمامات' : 'Bio & Interests',
      icon: User,
      hasContent: hasOverview,
    },
    {
      key: 'timeline' as TabKey,
      label: isAr ? 'المسيرة والتعليم' : 'Career & Education',
      icon: Award,
      hasContent: education.length > 0 || experience.length > 0,
    },
    {
      key: 'publications' as TabKey,
      label: isAr ? 'المنشورات والأبحاث' : 'Publications',
      icon: BookOpen,
      hasContent: publications.length > 0,
    },
    {
      key: 'courses' as TabKey,
      label: isAr ? 'المقررات والمهارات' : 'Courses & Skills',
      icon: GraduationCap,
      hasContent: courses.length > 0 || skills.length > 0,
    },
  ]
  const availableTabs = tabs.filter((tab) => tab.hasContent)
  const [activeTab, setActiveTab] = useState<TabKey>(
    () => availableTabs[0]?.key ?? 'overview',
  )

  const currentTab = activeTab

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    const currentIndex = availableTabs.findIndex((tab) => tab.key === currentTab)
    const physicalDirection = event.key === 'ArrowRight' ? 1 : -1
    const direction = isAr ? -physicalDirection : physicalDirection
    const nextIndex = (currentIndex + direction + availableTabs.length) % availableTabs.length
    const nextTab = availableTabs[nextIndex]

    if (!nextTab) return
    event.preventDefault()
    setActiveTab(nextTab.key)
    document.getElementById(`faculty-tab-${nextTab.key}`)?.focus()
  }

  return (
    <section className="py-16 bg-background relative overflow-hidden">
      {/* Decorative Gold & Bronze Blur Orbs in the background */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 rtl:left-0 ltr:right-0 w-1/4 h-full bg-secondary/[0.03] rounded-br-[100px] rtl:rounded-br-none rtl:rounded-bl-[100px] z-0 pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Main Content Column */}
          <div className="space-y-8 lg:col-span-2">
            
            {hasAnyContent ? (
              <div className="space-y-6">
                
                {/* Premium Frosted Glass Tab Switcher */}
                <div
                  role="tablist"
                  aria-label={isAr ? 'أقسام الملف الأكاديمي' : 'Academic profile sections'}
                  className="flex flex-wrap gap-2 rounded-[2rem] border border-border/60 bg-card/70 p-1.5 shadow-elegant backdrop-blur-md"
                >
                  {availableTabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = currentTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        id={`faculty-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`faculty-panel-${tab.key}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveTab(tab.key)}
                        onKeyDown={onTabKeyDown}
                        className={`relative flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-extrabold transition-all duration-300 ${
                          isActive 
                            ? 'text-foreground' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary to-gold-light rounded-full -z-10 shadow-gold"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className={`w-4 h-4 ${isActive ? 'text-foreground' : 'text-secondary'}`} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="min-h-[400px]">
                    <div
                      key={currentTab}
                      id={`faculty-panel-${currentTab}`}
                      role="tabpanel"
                      aria-labelledby={`faculty-tab-${currentTab}`}
                      tabIndex={0}
                    >
                      {currentTab === 'overview' && (
                        <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden hover:shadow-elegant transition-all duration-500">
                          <CardContent className="p-6 sm:p-10 space-y-8">
                            {biography ? (
                              <div className="space-y-5">
                                <h2 className="flex items-center gap-3 text-xl font-black text-foreground">
                                  <div className="h-5 w-1.5 rounded-full bg-secondary"></div>
                                  {isAr ? 'السيرة الذاتية' : 'Biography'}
                                </h2>
                                <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg prose-headings:font-bold prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground prose-strong:font-extrabold prose-ul:list-disc prose-ul:marker:text-secondary prose-ul:my-4 prose-li:my-2 prose-li:leading-relaxed prose-li:ps-1">
                                  <RichText content={biography} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm italic">
                                {isAr ? 'لم يتم إضافة السيرة الذاتية بعد.' : 'Biography has not been added yet.'}
                              </p>
                            )}

                            {hasResearchInterests && (
                              <div className="rounded-2xl bg-card/40 p-6 border border-border/60 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                                <h3 className="mb-3 flex items-center gap-2.5 text-base font-extrabold text-foreground relative z-10">
                                  <Lightbulb className="w-5 h-5 text-secondary shrink-0" />
                                  {isAr ? 'الاهتمامات البحثية والأكاديمية' : 'Research & Academic Interests'}
                                </h3>
                                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed relative z-10 font-medium">
                                  {member.researchInterests}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {currentTab === 'timeline' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Education */}
                          <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                              <h2 className="mb-6 flex items-center gap-3 text-lg font-black text-foreground">
                                <Award className="w-5 h-5 text-secondary shrink-0" />
                                {isAr ? 'التعليم والدرجات الأكاديمية' : 'Education & Degrees'}
                              </h2>
                              {education.length > 0 ? (
                                <div className="relative border-s border-border/80 ms-2 space-y-6">
                                  {education.map((edu, idx) => (
                                    <div key={edu.id ?? idx} className="relative ps-6 group/timeline">
                                      <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-secondary bg-white group-hover/timeline:bg-secondary transition-colors duration-300" />
                                      <p className="font-extrabold text-sm text-foreground/90 leading-tight">
                                        {edu.degree}
                                      </p>
                                      {edu.institution && (
                                        <p className="mt-1 text-xs text-muted-foreground font-medium">
                                          {edu.institution}
                                        </p>
                                      )}
                                      {edu.year && (
                                        <p className="mt-1 text-[10px] font-bold text-secondary">
                                          {edu.year}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">
                                  {isAr ? 'لم يتم إضافة السجلات التعليمية بعد.' : 'No education records added yet.'}
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Experience */}
                          <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                              <h2 className="mb-6 flex items-center gap-3 text-lg font-black text-foreground">
                                <Briefcase className="w-5 h-5 text-secondary shrink-0" />
                                {isAr ? 'الخبرات المهنية والعملية' : 'Professional Experience'}
                              </h2>
                              {experience.length > 0 ? (
                                <div className="relative border-s border-border/80 ms-2 space-y-6">
                                  {experience.map((exp, idx) => (
                                    <div key={exp.id ?? idx} className="relative ps-6 group/timeline">
                                      <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-secondary bg-white group-hover/timeline:bg-secondary transition-colors duration-300" />
                                      <p className="font-extrabold text-sm text-foreground/90 leading-tight">
                                        {exp.position}
                                      </p>
                                      {exp.organization && (
                                        <p className="mt-1 text-xs text-muted-foreground font-medium">
                                          {exp.organization}
                                        </p>
                                      )}
                                      {exp.period && (
                                        <p className="mt-1 text-[10px] font-bold text-secondary">
                                          {exp.period}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">
                                  {isAr ? 'لم يتم إضافة الخبرات المهنية بعد.' : 'No professional experience records added yet.'}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {currentTab === 'publications' && (
                        <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden">
                          <CardContent className="p-6 sm:p-10">
                            <h2 className="mb-6 flex items-center gap-3 text-xl font-black text-foreground">
                              <div className="h-5 w-1.5 rounded-full bg-secondary"></div>
                              {isAr ? 'الأبحاث والمنشورات العلمية' : 'Publications & Research'}
                            </h2>
                            {publications.length > 0 ? (
                              <ul className="space-y-4">
                                {publications.map((pub, idx) => (
                                  <li
                                    key={pub.id ?? idx}
                                    className="group/pub flex items-start gap-4 p-4 rounded-2xl border border-border/65 bg-card/45 hover:border-secondary/25 hover:bg-secondary/5 transition-all duration-300"
                                  >
                                    <div className="flex-grow min-w-0">
                                      <p className="font-extrabold text-sm sm:text-base text-foreground/90 group-hover/pub:text-secondary transition-colors leading-relaxed">
                                        {pub.title}
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                                        {pub.journal && (
                                          <span className="bg-card/60 border border-white px-2.5 py-0.5 rounded-md">
                                            {pub.journal}
                                          </span>
                                        )}
                                        {pub.year && (
                                          <span className="bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-md font-bold">
                                            {pub.year}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {pub.link && (
                                      <a
                                        href={pub.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-card/80 border border-border/60 text-secondary hover:bg-secondary hover:text-foreground transition-all duration-300 shadow-sm"
                                        aria-label={isAr ? 'فتح الرابط' : 'Open link'}
                                      >
                                        <ExternalLink className="h-4.5 w-4.5" />
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground text-sm italic">
                                {isAr ? 'لم يتم إضافة أوراق علمية أو منشورات بعد.' : 'No scientific publications added yet.'}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {currentTab === 'courses' && (
                        <div className="space-y-6">
                          {/* Courses Taught */}
                          <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden">
                            <CardContent className="p-6 sm:p-10 space-y-6">
                              <h2 className="flex items-center gap-3 text-xl font-black text-foreground">
                                <div className="h-5 w-1.5 rounded-full bg-secondary"></div>
                                {isAr ? 'المقررات التي يدرسها' : 'Teaching Courses'}
                              </h2>
                              {courses.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {courses.map((course, idx) => (
                                    <div
                                      key={course.id ?? idx}
                                      className="group/course relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/60 to-card/30 p-5 transition-all duration-300 hover:border-secondary/35 hover:-translate-y-0.5 shadow-sm"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent opacity-0 group-hover/course:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                      <div className="relative z-10 flex items-start gap-3">
                                        {course.code && (
                                          <Badge className="shrink-0 bg-secondary/15 hover:bg-secondary/20 text-secondary border-none font-extrabold rounded-lg px-2.5 py-1 text-xs">
                                            {course.code}
                                          </Badge>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="font-extrabold text-sm sm:text-base text-foreground/90 group-hover/course:text-secondary transition-colors leading-snug">
                                            {course.name}
                                          </p>
                                          {course.semester && (
                                            <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                                              {course.semester}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">
                                  {isAr ? 'لم يتم إضافة مقررات تدريسية بعد.' : 'No teaching courses added yet.'}
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Skills (المهارات) Section */}
                          <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] overflow-hidden">
                            <CardContent className="p-6 sm:p-10 space-y-6">
                              <h2 className="flex items-center gap-3 text-xl font-black text-foreground">
                                <div className="h-5 w-1.5 rounded-full bg-secondary"></div>
                                <Sparkles className="w-5 h-5 text-secondary" />
                                {isAr ? 'المهارات الأكاديمية والمهنية' : 'Academic & Professional Skills'}
                              </h2>
                              {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2.5">
                                  {skills.map((skill, idx) => (
                                    <span
                                      key={skill.id ?? idx}
                                      className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-card/60 border border-white hover:border-secondary/30 text-foreground transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-gold/5"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-secondary me-2 shrink-0"></span>
                                      {skill.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">
                                  {isAr ? 'لم يتم إضافة المهارات بعد.' : 'No skills added yet.'}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            ) : (
              <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-elegant rounded-[2rem] p-12 text-center">
                <CardContent>
                  <Info className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
                  <p className="text-muted-foreground text-lg">
                    {isAr
                      ? 'لم يتم إكمال الملف الشخصي لهذا العضو بعد.'
                      : 'This faculty member\'s profile has not been completed yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sticky Sidebar Column */}
          <aside className="lg:col-span-1">
            {sidebar}
          </aside>
        </div>
      </Container>
    </section>
  )
}

export default FacultyInfo
