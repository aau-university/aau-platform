'use client'

import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Award, BookOpen, GraduationCap, Users } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { animationPresets } from '@/lib/animation'
import type { HomeFallbackStat } from '@/lib/fallback/home-fallback-data'

const ICONS = {
  students: GraduationCap,
  faculty: Users,
  programs: BookOpen,
  colleges: Award,
} as const

export interface StatsSectionProps {
  stats: HomeFallbackStat[]
  disableInnerContainer?: boolean
}

export function StatsSection({
  stats,
  disableInnerContainer = false,
}: StatsSectionProps) {
  // Respect `prefers-reduced-motion`: skip the staggered entrance and the
  // continuous `rotate: 360` hover spin (a known vestibular trigger).
  const shouldReduceMotion = useReducedMotion()
  const Wrapper = disableInnerContainer ? Fragment : Container
  return (
    <section id="stats" className="relative z-20 py-12 md:py-16 px-4 bg-background">
      <Wrapper>
        {shouldReduceMotion ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, statIndex) => {
              const Icon = ICONS[stat.icon] ?? GraduationCap
              return (
                <div
                  key={`${stat.key}-${statIndex}`}
                  className="relative bg-secondary/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 transition-colors duration-500 shadow-lg border border-secondary/20 hover:border-secondary hover:shadow-glow group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6 rounded-2xl bg-secondary/20 flex items-center justify-center transition-colors shadow-inner">
                    <Icon className="w-8 h-8 text-secondary drop-shadow-md" />
                  </div>
                  <div className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 text-center font-display drop-shadow-sm">
                    {stat.number}
                  </div>
                  <div className="relative z-10 text-muted-foreground text-sm sm:text-base font-bold text-center uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={animationPresets.stagger}
          >
            {stats.map((stat, statIndex) => {
              const Icon = ICONS[stat.icon] ?? GraduationCap
              return (
                <motion.div
                  key={`${stat.key}-${statIndex}`}
                  className="relative bg-secondary/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 transition-all duration-500 shadow-lg border border-secondary/20 hover:border-secondary hover:shadow-glow group hover:-translate-y-2 overflow-hidden"
                  variants={animationPresets.scaleIn}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <motion.div
                    className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6 rounded-2xl bg-secondary/20 flex items-center justify-center transition-colors shadow-inner"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.8, ease: 'backOut' }}
                  >
                    <Icon className="w-8 h-8 text-secondary drop-shadow-md" />
                  </motion.div>
                  <div className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 text-center font-display drop-shadow-sm">
                    {stat.number}
                  </div>
                  <div className="relative z-10 text-muted-foreground text-sm sm:text-base font-bold text-center uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </Wrapper>
    </section>
  )
}
