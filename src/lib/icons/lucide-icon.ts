import {
  Activity,
  Atom,
  Brain,
  Briefcase,
  Building2,
  BookOpen,
  Calculator,
  Code,
  Cpu,
  Database,
  FlaskConical,
  Gavel,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Languages,
  Leaf,
  type LucideIcon,
  Microscope,
  Palette,
  Pill,
  Scale,
  Scroll,
  Stethoscope,
  Wrench,
} from 'lucide-react'

/**
 * Curated map of the lucide icon *names* that the Colleges `icon` text
 * field is expected to hold (seed fixtures use PascalCase lucide names
 * like `Stethoscope`, `Heart`, `Cpu`, `Briefcase`). The field is free
 * text in the admin panel, so an editor can type any of these; anything
 * unmapped falls back to a sensible default rather than rendering the raw
 * string as literal text.
 *
 * Keys are stored lowercased so lookups are case-insensitive and tolerant
 * of kebab-case (`graduation-cap`) or spaced (`book open`) variants.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  atom: Atom,
  brain: Brain,
  briefcase: Briefcase,
  building: Building2,
  building2: Building2,
  bookopen: BookOpen,
  calculator: Calculator,
  code: Code,
  cpu: Cpu,
  database: Database,
  flask: FlaskConical,
  flaskconical: FlaskConical,
  gavel: Gavel,
  globe: Globe,
  graduationcap: GraduationCap,
  heart: Heart,
  landmark: Landmark,
  languages: Languages,
  leaf: Leaf,
  microscope: Microscope,
  palette: Palette,
  pill: Pill,
  scale: Scale,
  scroll: Scroll,
  stethoscope: Stethoscope,
  wrench: Wrench,
}

/**
 * Resolve a stored icon name to a lucide component. Returns `null` when
 * the name is empty or unknown so callers can decide their own fallback.
 */
export function resolveLucideIcon(name?: string | null): LucideIcon | null {
  if (!name || typeof name !== 'string') return null
  const key = name.trim().toLowerCase().replace(/[\s_-]/g, '')
  return ICON_MAP[key] ?? null
}
