'use client'

import { useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Eye, Flag, Heart, Target, Quote, User, Info } from 'lucide-react'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { useLanguage } from '@/i18n/LanguageProvider'
import type { AboutPage, TeamMember } from '@/payload-types'

const identityIcons = {
  vision: Eye,
  mission: Target,
  goals: Flag,
  values: Heart,
} as const

type IdentityKey = keyof typeof identityIcons

interface IdentityEntry {
  key: IdentityKey
  data: NonNullable<AboutPage['vision']>
}

interface AboutPageClientProps {
  aboutPage: AboutPage
}

interface UnifiedMember {
  id: string | number
  name: string
  jobTitle?: string | null
  group: string
  image?: any
  bio?: any
  displayOrder?: number | null
}

interface GroupedTeam {
  groupName: string
  members: UnifiedMember[]
}

function isPopulatedTeamMember(
  entry: number | TeamMember,
): entry is TeamMember {
  return typeof entry === 'object' && entry !== null
}

export function AboutPageClient({ aboutPage }: AboutPageClientProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [selectedMember, setSelectedMember] = useState<UnifiedMember | null>(null)

  const {
    header,
    intro,
    vision,
    mission,
    goals,
    values,
    president,
    teamSection,
    teamMembersRelationship,
    teamMembers,
  } = aboutPage

  const identityEntries: IdentityEntry[] = ([
    { key: 'vision', data: vision },
    { key: 'mission', data: mission },
    { key: 'goals', data: goals },
    { key: 'values', data: values },
  ] as const).filter((entry): entry is IdentityEntry => {
    if (!entry.data) return false
    return Boolean(entry.data.title) || Boolean(entry.data.description)
  })

  // 1. Unify team members from relationship (preferred) and legacy inline array
  const populatedTeamMembers = (teamMembersRelationship ?? []).filter(
    isPopulatedTeamMember,
  )

  const unifiedMembers: UnifiedMember[] = []

  if (populatedTeamMembers.length > 0) {
    populatedTeamMembers.forEach((member) => {
      unifiedMembers.push({
        id: member.id,
        name: member.name,
        jobTitle: member.jobTitle,
        group: member.group || (isAr ? 'فريق العمل' : 'Our Team'),
        image: member.image,
        bio: member.bio,
        displayOrder: member.displayOrder ?? 0,
      })
    })
  } else if (teamMembers && teamMembers.length > 0) {
    teamMembers.forEach((member, index) => {
      if (member.fullName) {
        unifiedMembers.push({
          id: member.id || index,
          name: member.fullName,
          jobTitle: member.jobTitle,
          group: member.groupName || (isAr ? 'فريق العمل' : 'Our Team'),
          image: member.memberImage,
          displayOrder: member.displayOrder ?? 0,
        })
      }
    })
  }

  // Sort unified list by displayOrder (ascending)
  unifiedMembers.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  // Group by group name
  const groupedGroups: { [key: string]: UnifiedMember[] } = {}
  unifiedMembers.forEach((member) => {
    const g = member.group
    if (!groupedGroups[g]) {
      groupedGroups[g] = []
    }
    groupedGroups[g].push(member)
  })

  const groupedTeams: GroupedTeam[] = Object.keys(groupedGroups).map((groupName) => ({
    groupName,
    members: groupedGroups[groupName],
  }))

  const hasPageContent = Boolean(
    header?.badge ||
      header?.title ||
      header?.description ||
      intro?.body ||
      intro?.image ||
      identityEntries.length > 0 ||
      president?.name ||
      president?.messageIntro ||
      president?.messageBody ||
      president?.messageClosing ||
      groupedTeams.length > 0,
  )

  if (!hasPageContent) {
    return (
      <section id="main-content" className="min-h-[60vh] bg-background py-20 sm:py-24">
        <Container className="max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold text-secondary">
            {isAr ? 'عن الجامعة' : 'About'}
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            {isAr ? 'المحتوى غير متاح حالياً' : 'Content is currently unavailable'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {isAr
              ? 'لم تتم إضافة محتوى هذه الصفحة بعد.'
              : 'Content has not been added to this page yet.'}
          </p>
        </Container>
      </section>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div id="main-content" className="min-h-screen bg-background pb-20">
        {/* Page Hero Header */}
        <section className="relative overflow-hidden border-b border-secondary/25 bg-primary py-20 text-center text-primary-foreground lg:py-28">
          <Container className="relative z-10">
            {header?.badge && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6 inline-flex items-center rounded-full border border-secondary/30 px-4 py-2 text-xs font-bold text-secondary sm:text-sm"
              >
                {header.badge}
              </motion.div>
            )}
            <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-6 font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight"
              >
                {header?.title || (isAr ? 'عن الجامعة' : 'About')}
              </motion.h1>
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto mb-8 h-1 w-24 rounded-full bg-secondary" 
            />
            {header?.description && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mx-auto max-w-3xl text-base font-medium leading-relaxed text-primary-foreground/75 sm:text-lg lg:text-xl"
              >
                {header.description}
              </motion.p>
            )}
          </Container>
        </section>

      {/* Main Content Container */}
      <Container className="mt-16 space-y-24">
        {/* Intro Section */}
        {intro && (
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div 
              className="space-y-6 text-start"
              initial={{ opacity: 0, x: isAr ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={defaultViewport}
              transition={{ duration: 0.6 }}
            >
              {intro.body && (
                <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed font-medium">
                  <RichText content={intro.body} />
                </div>
              )}
            </motion.div>
            
            {intro.image && typeof intro.image !== 'number' && (
              <motion.div 
                className="relative overflow-hidden rounded-3xl shadow-elegant border border-border/60 bg-card/50 aspect-video lg:aspect-square"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={defaultViewport}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Media resource={intro.image} className="h-full w-full object-cover hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent pointer-events-none" />
              </motion.div>
            )}
          </div>
        )}

        {/* Core Pillars (Vision, Mission, Goals, Values) */}
        {identityEntries.length > 0 && (
          <div className="space-y-12">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary bg-secondary/10 px-4 py-1.5 rounded-full border border-secondary/20">
                {isAr ? 'ركائزنا وقيمنا' : 'Our Values & Pillars'}
              </span>
              <h2 className="text-3xl font-bold font-display mt-4 text-foreground">
                {isAr ? 'الرؤية والرسالة والأهداف' : 'Vision, Mission & Goals'}
              </h2>
            </div>
            
            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              variants={animationPresets.stagger}
            >
              {identityEntries.map(({ key, data }) => {
                const Icon = identityIcons[key]
                return (
                  <motion.div key={key} variants={animationPresets.staggerItem} className="h-full">
                    <Card className="relative overflow-hidden h-full p-8 border border-border/60 bg-card/70 shadow-elegant backdrop-blur-md hover:border-secondary/40 hover:shadow-gold/15 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col group rounded-3xl">
                      {/* Interactive top gradient border */}
                      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-secondary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="rounded-2xl bg-secondary/10 p-4 text-secondary w-fit mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-secondary/10">
                        <Icon className="h-6 w-6" />
                      </div>
                      
                      {data.title && (
                        <h3 className="mb-3 text-xl font-bold font-display text-foreground group-hover:text-secondary transition-colors duration-300">
                          {data.title}
                        </h3>
                      )}
                      {data.description && (
                        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed flex-1">
                          <RichText content={data.description} />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        )}

        {/* President Message */}
        {president &&
          (president.name ||
            president.messageIntro ||
            president.messageBody ||
            president.messageClosing) && (
            <div className="space-y-12">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary bg-secondary/10 px-4 py-1.5 rounded-full border border-secondary/20">
                  {isAr ? 'القيادة والريادة' : 'Leadership & Vision'}
                </span>
              </div>
              
              <Card className="relative overflow-hidden border border-border/60 bg-card/70 shadow-elegant backdrop-blur-md p-8 md:p-12 rounded-3xl">
                {/* Large Background Quote Symbol */}
                <Quote className="absolute right-6 top-6 h-28 w-28 text-secondary/5 -scale-x-100 pointer-events-none hidden md:block" />
                
                <div className="flex flex-col items-center gap-10 md:flex-row md:items-start relative z-10">
                  {president.image && typeof president.image !== 'number' && (
                    <div className="relative group shrink-0 mx-auto md:mx-0">
                      <div className="relative h-48 w-48 overflow-hidden rounded-2xl border-2 border-secondary shadow-gold/25 shadow-xl group-hover:scale-105 transition-transform duration-500">
                        <Media resource={president.image} className="h-full w-full object-cover" />
                      </div>
                      <div className="absolute -inset-1.5 border border-secondary/30 rounded-3xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-500 pointer-events-none" />
                    </div>
                  )}
                  
                  <div className="flex-1 text-start">
                    {president.sectionTitle && (
                      <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
                        {president.sectionTitle}
                        <div className="h-1 w-16 bg-secondary mt-2 rounded-full" />
                      </h2>
                    )}
                    
                    <div className="space-y-4">
                      {president.messageIntro && (
                        <div className="prose prose-lg text-foreground/80 font-medium leading-relaxed">
                          <RichText content={president.messageIntro} />
                        </div>
                      )}
                      
                      {president.messageBody && (
                        <div className="prose text-muted-foreground leading-relaxed">
                          <RichText content={president.messageBody} />
                        </div>
                      )}
                      
                      {president.messageClosing && (
                        <div className="prose text-muted-foreground italic leading-relaxed pt-2">
                          <RichText content={president.messageClosing} />
                        </div>
                      )}
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div>
                      {president.name && (
                        <p className="text-xl font-bold font-display text-foreground">{president.name}</p>
                      )}
                      {president.role && (
                        <p className="text-sm font-semibold text-secondary mt-0.5">{president.role}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

        {/* Grouped Team Section */}
        {groupedTeams.length > 0 && (
          <div className="space-y-12">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary bg-secondary/10 px-4 py-1.5 rounded-full border border-secondary/20">
                {isAr ? 'كوادرنا الأكاديمية والإدارية' : 'Our Faculty & Staff'}
              </span>
              {teamSection?.sectionTitle && (
                <h2 className="text-3xl font-bold font-display mt-4 text-foreground">
                  {teamSection.sectionTitle}
                </h2>
              )}
              {teamSection?.sectionDescription && (
                <p className="mx-auto max-w-2xl text-muted-foreground mt-4 leading-relaxed">
                  {teamSection.sectionDescription}
                </p>
              )}
            </div>
            
            <div className="space-y-16">
              {groupedTeams.map((group) => (
                <div key={group.groupName} className="space-y-6">
                  {/* Category Section title header */}
                  <div className="flex items-center gap-4 text-start">
                    <h3 className="text-xl font-bold font-display text-foreground shrink-0">{group.groupName}</h3>
                    <div className="h-[2px] bg-gradient-to-r from-secondary/40 to-transparent flex-1" />
                  </div>
                  
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    initial="hidden"
                    whileInView="visible"
                    viewport={defaultViewport}
                    variants={animationPresets.stagger}
                  >
                    {group.members.map((member) => (
                      <motion.div key={member.id} variants={animationPresets.staggerItem}>
                        <Card className="relative overflow-hidden p-6 border border-border/60 bg-card/70 shadow-elegant backdrop-blur-md hover:border-secondary/40 hover:shadow-gold/15 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 group flex flex-col items-center text-center h-full rounded-3xl">
                          {member.image && typeof member.image !== 'number' ? (
                            <div className="relative mb-6 h-28 w-28 overflow-hidden rounded-full border-2 border-transparent group-hover:border-secondary transition-all duration-500 shadow-md">
                              <Media resource={member.image} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="relative mb-6 h-28 w-28 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-sm">
                              <User className="h-10 w-10" />
                            </div>
                          )}
                          
                          <h4 className="font-bold text-lg font-display text-foreground mb-1 group-hover:text-secondary transition-colors duration-300 line-clamp-1">
                            {member.name}
                          </h4>
                          
                          {member.jobTitle && (
                            <p className="text-sm text-muted-foreground font-medium mb-4 flex-1 line-clamp-2">
                              {member.jobTitle}
                            </p>
                          )}
                          
                          {/* Render biography trigger button if richText bio exists */}
                          {member.bio && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 min-h-11 shrink-0 rounded-xl border-secondary/30 text-xs font-bold text-secondary transition-colors duration-200 hover:bg-secondary hover:text-primary motion-reduce:transition-none"
                              onClick={() => setSelectedMember(member)}
                            >
                              <Info className="h-3.5 w-3.5 me-1" />
                              {isAr ? 'السيرة الذاتية' : 'Biography'}
                            </Button>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Biography Modal Dialog */}
      <Dialog open={selectedMember !== null} onOpenChange={(open) => { if (!open) setSelectedMember(null) }}>
        <DialogContent className="max-h-[90vh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-border/40 bg-card p-6 shadow-2xl [&>button]:h-11 [&>button]:w-11 [&>button]:p-3 rtl:[&>button]:left-4 rtl:[&>button]:right-auto">
          {selectedMember && (
            <div className="flex flex-col gap-6 md:flex-row items-start text-start">
              {selectedMember.image && typeof selectedMember.image !== 'number' ? (
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-elegant border-2 border-secondary shrink-0 mx-auto md:mx-0">
                  <Media resource={selectedMember.image} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border-2 border-secondary/30 shrink-0 mx-auto md:mx-0">
                  <User className="w-16 h-16" />
                </div>
              )}
              
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <DialogTitle className="pe-10 font-display text-2xl font-bold leading-tight text-foreground">
                    {selectedMember.name}
                  </DialogTitle>
                  {selectedMember.jobTitle && (
                    <p className="text-sm font-semibold text-secondary mt-1">{selectedMember.jobTitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedMember.group}</p>
                </div>
                
                <Separator />
                
                {selectedMember.bio ? (
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed max-h-[300px] overflow-y-auto pr-2">
                    <RichText content={selectedMember.bio} />
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    {isAr ? 'لا توجد سيرة ذاتية متوفرة.' : 'No biography available.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </MotionConfig>
  )
}
