'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Phone, Clock, Building, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import type { Locale } from '@/i18n/locale'
import type { FacultyMember, College } from '@/payload-types'

export interface FacultySidebarProps {
  member: FacultyMember
  locale: Locale
}

function isPopulatedCollege(value: FacultyMember['college']): value is College {
  return typeof value === 'object' && value !== null
}

export function FacultySidebar({ member, locale }: FacultySidebarProps) {
  const isAr = locale === 'ar'
  const college = isPopulatedCollege(member.college) ? member.college : null
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const displayEmail = member.email?.trim()
  const displayPhone = member.phone?.trim()
  const displayOfficeHours = member.officeHours?.trim()

  const contactItems = [
    { 
      label: isAr ? 'البريد الإلكتروني' : 'Email Address', 
      value: displayEmail, 
      icon: Mail, 
      href: displayEmail ? `mailto:${displayEmail}` : undefined, 
      dir: 'ltr' 
    },
    { 
      label: isAr ? 'رقم الهاتف' : 'Phone Number', 
      value: displayPhone, 
      icon: Phone, 
      href: displayPhone ? `tel:${displayPhone}` : undefined, 
      dir: 'ltr' 
    },
    { 
      label: isAr ? 'الساعات المكتبية' : 'Office Hours', 
      value: displayOfficeHours, 
      icon: Clock 
    },
  ].filter((item) => !!item.value)

  return (
    <motion.div 
      initial={{ opacity: 0, x: isAr ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="sticky top-24 space-y-6"
    >
      {/* Contact Card with Light Frosted Glass */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/75 backdrop-blur-md shadow-elegant transition-all duration-500 group/contact">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        {/* Sleek Dark Header for visual anchors */}
        <div className="relative overflow-hidden bg-primary p-6 text-center border-b border-border/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,97,0.15),transparent_70%)] pointer-events-none" />
          <Mail className="mx-auto mb-3 h-8 w-8 text-secondary" />
          <h3 className="relative z-10 text-base font-extrabold text-white tracking-wide uppercase">
            {isAr ? 'معلومات التواصل والعمل' : 'Contact & Office Info'}
          </h3>
          <div className="mx-auto mt-2 h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent via-secondary to-transparent"></div>
        </div>

        <div className="p-6 space-y-4">
          {contactItems.map((item, idx) => {
            const Icon = item.icon
            const content = (
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/65 bg-card/45 hover:border-secondary/30 hover:bg-secondary/5 transition-all duration-300 group/item">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/5 text-secondary group-hover/item:bg-secondary group-hover/item:text-foreground transition-colors duration-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    {item.label}
                  </span>
                  <span className="block text-sm font-extrabold text-foreground/90 truncate group-hover/item:text-secondary transition-colors" dir={item.dir}>
                    {item.value}
                  </span>
                </div>
              </div>
            )

            if (item.href) {
              return (
                <a key={idx} href={item.href} className="block group/item-link">
                  {content}
                </a>
              )
            }

            return <div key={idx}>{content}</div>
          })}
        </div>

        {/* Footer Gradient Highlight */}
        <div className="h-1.5 bg-gradient-to-r from-secondary/40 via-secondary to-secondary/40" />
      </div>

      {/* College Info Card with Light Frosted Glass */}
      {college && (
        <Card className="rounded-[2rem] border border-border/60 bg-card/75 backdrop-blur-md p-6 shadow-elegant text-center relative overflow-hidden group/college">
          <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <CardContent className="p-0 relative z-10">
            <Building className="mx-auto mb-3 h-8 w-8 text-secondary group-hover/college:scale-110 transition-transform duration-300" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              {isAr ? 'الكلية التابع لها' : 'Affiliated College'}
            </h3>
            <p className="text-lg font-black text-foreground mb-5 leading-snug tracking-tight font-display">
              {college.name}
            </p>
            
            <Button asChild variant="outline" className="w-full rounded-full border-secondary/35 hover:border-secondary hover:bg-secondary hover:text-secondary-foreground group/btn text-xs py-3 font-extrabold shadow-sm transition-all duration-300">
              <Link href={`/colleges/${college.slug}`} className="flex items-center justify-center gap-2">
                <span>{isAr ? 'عرض الكلية وتفاصيلها' : 'View College Details'}</span>
                <Arrow className="w-4 h-4 transition-transform group-hover/btn:translate-x-1.5 rtl:group-hover/btn:-translate-x-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

export default FacultySidebar
