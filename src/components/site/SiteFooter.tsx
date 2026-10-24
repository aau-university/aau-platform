'use client'

import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import type { PublicNavItem } from '@/lib/site/public-routes'
import type { PublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import type { PublicFooterSettings, PublicFooterItem } from '@/lib/payload/get-public-footer-settings'
import { SiteLogo } from './SiteLogo'

interface SiteFooterProps {
  nav: PublicNavItem[]
  settings: PublicSiteSettings
  footerSettings: PublicFooterSettings
}

const SOCIAL_ICON: Record<string, LucideIcon> = {
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
}

/**
 * Group footer items by their `group` field. Items without a group go into
 * a default "Links" column. Preserves insertion order within each group.
 */
function groupFooterItems(items: PublicFooterItem[]): Map<string, PublicFooterItem[]> {
  const groups = new Map<string, PublicFooterItem[]>()
  for (const item of items) {
    const key = item.group || 'Links'
    const arr = groups.get(key)
    if (arr) {
      arr.push(item)
    } else {
      groups.set(key, [item])
    }
  }
  return groups
}

/**
 * SiteFooter — CMS-driven footer with dynamic columns.
 *
 * - Brand column: logo tile + siteName + tagline + description (from
 *   SiteSettings, no longer hardcoded).
 * - Dynamic columns: grouped from FooterSettings.footerItems by the
 *   `group` field. Falls back to the header `nav` when footerItems is
 *   empty (backward compat).
 * - Contact column: phone + email + address (from SiteSettings) +
 *   social icons.
 * - Copyright bar: © {year} {siteName}. {copyright} | {footerPowered}
 */
export function SiteFooter({ nav, settings, footerSettings }: SiteFooterProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const brand = settings.siteName
  const tagline = settings.tagline
  const description = settings.description
  const year = new Date().getFullYear()

  // Contact info — prefer SiteSettings; fall back to FooterSettings.address
  const phone = settings.contactPhone
  const email = settings.contactEmail
  const address = settings.address || footerSettings.address

  // Footer link columns — from FooterSettings, or fall back to nav
  const hasFooterItems = footerSettings.footerItems.length > 0
  const groups = hasFooterItems
    ? groupFooterItems(footerSettings.footerItems)
    : new Map<string, PublicFooterItem[]>([
        [
          isAr ? 'روابط سريعة' : 'Quick Links',
          nav
            .filter((item) => item.href !== '/')
            .map((item) => ({
              label: item.label ?? item.href,
              href: item.href,
              newTab: Boolean(item.openInNewTab),
              group: null,
            })),
        ],
      ])

  const groupEntries = Array.from(groups.entries())

  // Background style (image/video with overlay)
  const hasBgImage = footerSettings.footerBackgroundType === 'image' && footerSettings.footerBackgroundImage
  const hasBgVideo = footerSettings.footerBackgroundType === 'video' && footerSettings.footerBackgroundVideo
  const overlayOpacity = footerSettings.footerBackgroundOverlayOpacity

  const copyrightText = settings.copyright || (isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.') || ''
  const poweredBy = footerSettings.footerPowered

  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Optional background media */}
      {hasBgImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={footerSettings.footerBackgroundImage ?? undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-primary"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}
      {hasBgVideo && footerSettings.footerBackgroundVideo && (
        <>
          <video
            src={footerSettings.footerBackgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-primary"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      <Container className="py-12 relative z-10">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8">
          {/* Brand column (always first) */}
          <div className="flex flex-col gap-6">
            <Link href="/" aria-label={brand} className="group flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
              <SiteLogo
                logo={settings.logo}
                siteName={brand}
                width={56}
                height={56}
                className="size-14 rounded-xl transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none"
              />
              <div>
                <h2 className="text-xl font-display font-bold text-white leading-tight">
                  {brand}
                </h2>
                {tagline && (
                  <p className="text-[10px] tracking-[0.2em] uppercase text-secondary mt-1 font-bold">
                    {tagline}
                  </p>
                )}
              </div>
            </Link>
            {description && (
              <p className="text-primary-foreground/80 leading-relaxed max-w-md">
                {description}
              </p>
            )}
          </div>

          {/* Dynamic link columns */}
          {groupEntries.map(([groupName, items]) => (
            <div key={groupName} className="md:px-4">
              <h2 className="text-lg font-bold text-white mb-6 relative inline-block">
                {groupName}
                <span className="absolute -bottom-2 start-0 h-1 w-8 rounded-full bg-secondary" />
              </h2>
              <ul className="flex flex-col gap-3">
                {items.map((item, idx) => (
                  <li key={`${groupName}-${idx}`}>
                    <Link
                      href={item.href}
                      {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="inline-block min-h-11 py-2.5 text-primary-foreground/80 transition-colors duration-300 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact column (always last) */}
          <div>
            <h2 className="text-lg font-bold text-white mb-6 relative inline-block">
              {isAr ? 'تواصل معنا' : 'Contact'}
              <span className="absolute -bottom-2 start-0 h-1 w-8 rounded-full bg-secondary" />
            </h2>
            <ul className="flex flex-col gap-4 mb-8 text-primary-foreground/80">
              {phone && (
                <li className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-card/5 flex items-center justify-center group-hover:bg-secondary transition-colors shrink-0">
                    <Phone className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <a href={`tel:${phone}`} className="hover:text-secondary transition-colors" dir="ltr">
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-card/5 flex items-center justify-center group-hover:bg-secondary transition-colors shrink-0">
                    <Mail className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <a href={`mailto:${email}`} className="hover:text-secondary transition-colors break-all" dir="ltr">
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-3 group">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-card/5 flex items-center justify-center group-hover:bg-secondary transition-colors mt-0.5">
                    <MapPin className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                  </div>
                  <span className="leading-relaxed">{address}</span>
                </li>
              )}
            </ul>

            {settings.socialLinks.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {settings.socialLinks.map((link) => {
                  const Icon = SOCIAL_ICON[link.platform.toLowerCase()]
                  if (!Icon) return null
                  return (
                    <a
                      key={link.platform + link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.platform}
                      className="relative flex size-11 items-center justify-center rounded-full bg-card/10 transition-all duration-300 hover:-translate-y-1 hover:bg-secondary hover:text-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Copyright bar */}
        <div className="pt-6 border-t border-border/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start text-primary-foreground/70 text-sm">
          <p>{`© ${year} ${brand}. ${copyrightText}`}</p>
          {poweredBy && (
            <p className="text-primary-foreground/50 text-xs">{poweredBy}</p>
          )}
        </div>
      </Container>
    </footer>
  )
}
