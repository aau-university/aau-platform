import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

/**
 * AAU public-site Tailwind configuration.
 *
 * Scoped to the public frontend (`src/app/(frontend)/**` + `src/components/**`)
 * so we don't accidentally restyle Payload's admin UI. Tokens mirror the
 * legacy frontend identity:
 *   - black + gold (--secondary)
 *   - Tajawal as the single typeface
 *   - generous radii (--radius: 0.75rem)
 *
 * Token wiring uses HSL channels (`hsl(var(--name))`) so we can swap the
 * theme via CSS variables later (dark mode is intentionally NOT enabled in
 * this port — defer to Phase 1.5).
 */
const config = {
  darkMode: ['class'],
  content: [
    './src/app/(frontend)/**/*.{ts,tsx,css}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/i18n/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        link: 'hsl(var(--link))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          light: 'hsl(var(--gold-light))',
          dark: 'hsl(var(--gold-dark))',
          foreground: 'hsl(var(--gold-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          inset: 'hsl(var(--surface-inset))',
          inverse: 'hsl(var(--surface-inverse))',
          'inverse-foreground': 'hsl(var(--surface-inverse-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        sans: ['var(--font-body)'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
      },
      boxShadow: {
        gold: 'var(--shadow-gold)',
        elegant: 'var(--shadow-elegant)',
        glow: 'var(--shadow-glow)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config

export default config
