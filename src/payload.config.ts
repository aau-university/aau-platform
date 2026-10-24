import { postgresAdapter } from '@payloadcms/db-postgres'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { getServerSideURL } from './utilities/getURL'
import { resolveDatabaseConnectionString } from './lib/database-url'
import { migrations } from './migrations'
import { runIdentityBootstrap } from './bootstrap/identity-bootstrap-runner'
import { runtimeBootstrapEnabled, runtimeMigrationsEnabled } from './lib/runtime-mode'
import { defaultLexical } from './fields/defaultLexical'
import { afterErrorLogger } from './hooks/afterErrorLogger'
import { withPublicUnpublishCapture } from './hooks/revalidatePublicCache'
import { plugins } from './plugins'

// Collections
import { Users } from './collections/Users'
import { Roles } from './collections/Roles'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { NavigationMenus } from './collections/NavigationMenus'
import { News } from './collections/News'
import { Colleges } from './collections/Colleges'
import { AcademicDepartments } from './collections/AcademicDepartments'
import { AcademicPrograms } from './collections/AcademicPrograms'
import { FacultyMembers } from './collections/FacultyMembers'
import { ContactMessages } from './collections/ContactMessages'
import { JoinRequests } from './collections/JoinRequests'
import { Events } from './collections/Events'
import { BlogPosts } from './collections/BlogPosts'
import { FAQs } from './collections/FAQs'
import { EmailRequests } from './collections/EmailRequests'
import { TeamMembers } from './collections/TeamMembers'
import { Categories } from './collections/Categories'
import { StudyPlans } from './collections/StudyPlans'
import { PrivateMedia } from './collections/PrivateMedia'
import { Centers } from './collections/Centers'
import { Projects } from './collections/Projects'
import { ResearchPublications } from './collections/ResearchPublications'
import { CampusLife } from './collections/CampusLife'
import { Offers } from './collections/Offers'
import { Partners } from './collections/Partners'
import { Sliders } from './collections/Sliders'
import { StudentAffairsDocuments } from './collections/StudentAffairsDocuments'
import { Announcements } from './collections/Announcements'
import { AdmissionRequirements } from './collections/AdmissionRequirements'

// Globals
import { SiteSettings } from './globals/SiteSettings'
import { AboutPage } from './globals/AboutPage'
import { ContactSettings } from './globals/ContactSettings'
import { SmartChatSettings } from './globals/SmartChatSettings'
import { NavbarSettings } from './globals/NavbarSettings'
import { FooterSettings } from './globals/FooterSettings'
import { AnalyticsSettings } from './globals/AnalyticsSettings'
import { DashboardMetrics } from './globals/DashboardMetrics'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const isProduction = process.env.NODE_ENV === 'production'
const payloadDbPushRequested = process.env.PAYLOAD_DB_PUSH === 'true'

if (isProduction && payloadDbPushRequested) {
  throw new Error(
    'PAYLOAD_DB_PUSH must not be true in production. Apply official Payload migrations instead.',
  )
}

const serverURL = getServerSideURL()

/**
 * Production trusts only the explicitly configured public origin.
 *
 * `getServerSideURL()` already fails closed in the production runtime unless
 * the origin is a real public HTTPS URL, so this list cannot silently become
 * `['http://localhost:3000']` on the VPS. Development and test keep localhost
 * so local HTTP work and the standalone browser suite stay usable.
 *
 * Guarded by `src/__tests__/config/production-origin.test.ts` so a future
 * refactor cannot re-add localhost to the production allow-list.
 */
const corsAndCsrf: [string, ...string[]] = (
  isProduction ? [serverURL] : [...new Set([serverURL, 'http://localhost:3000'])]
).filter(Boolean) as [string, ...string[]]

function requirePayloadSecret(): string {
  const value = process.env.PAYLOAD_SECRET?.trim()

  if (!value) {
    throw new Error('PAYLOAD_SECRET must be set before Payload starts.')
  }

  if (value === 'CHANGE_ME_TO_A_RANDOM_SECRET_32_CHARS' || value.length < 32) {
    throw new Error('PAYLOAD_SECRET must not be empty or weak in production; replace it with a strong secret of at least 32 characters.')
  }

  return value
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    // Live Preview is configured per collection via `collectionPreview()`
    // (see `utilities/generatePreviewPath.ts`), which wires `admin.preview`
    // and `admin.livePreview` together and gets their two different argument
    // shapes right. The root block this replaces covered `pages` only and
    // supplied no `admin.preview`, so Pages had the iframe but no way to open
    // the real page — and its `collectionConfig?.slug ?? 'pages'` fallback
    // would have silently mislabelled any collection later added to the list.
    components: {
      beforeLogin: ['@/components/BeforeLogin/index'],
      beforeDashboard: ['@/components/BeforeDashboard/index'],
      // Replace Payload's default logo (login screen) and icon (nav header)
      // with the university mark — no Payload branding in the admin UI.
      graphics: {
        Icon: '@/components/AdminGraphics/Icon#AdminIcon',
        Logo: '@/components/AdminGraphics/Logo#AdminLogo',
      },
    },
    // Browser-tab identity for every admin page, including /admin/login:
    // the default suffix is "- Payload" and the default favicon is the
    // Payload mark — both replaced with the university identity.
    meta: {
      description: 'لوحة تحكم جامعة الجيل الجديد',
      icons: [
        {
          rel: 'icon',
          type: 'image/png',
          url: '/assets/university-logo.png',
        },
      ],
      titleSuffix: '- جامعة الجيل الجديد',
    },
  },
  collections: [
    Users, Roles, Media, Pages, NavigationMenus, News, Colleges,
    AcademicDepartments, AcademicPrograms, FacultyMembers, ContactMessages,
    JoinRequests, Events, BlogPosts, FAQs, EmailRequests, TeamMembers,
    Categories, StudyPlans, PrivateMedia, Centers, Projects, ResearchPublications,
    CampusLife, Offers, Partners, Sliders, StudentAffairsDocuments,
    Announcements, AdmissionRequirements,
  ].map(withPublicUnpublishCapture),
  globals: [
    SiteSettings, AboutPage, ContactSettings, SmartChatSettings,
    NavbarSettings, FooterSettings, AnalyticsSettings, DashboardMetrics,
  ],
  editor: defaultLexical,
  secret: requirePayloadSecret(),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // Admin Panel interface language (distinct from content `localization`
  // below). Payload ships built-in translations; we expose Arabic +
  // English only and default to Arabic (RTL is applied automatically for
  // `ar`). Each admin user can still switch language in their account
  // settings, and Payload auto-detects from the request when possible.
  i18n: {
    supportedLanguages: { ar, en },
    fallbackLanguage: 'ar',
  },
  // Native Payload localization — localized content fields use one schema
  // field with `localized: true`, read via Payload's `locale` parameter.
  localization: {
    locales: [
      { code: 'ar', label: 'Arabic', rtl: true },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ar',
    fallback: true,
  },
  db: postgresAdapter({
    pool: {
      // Prefer the direct URL when set because migrations and Payload
      // transactions require a direct PostgreSQL connection; otherwise assemble
      // the URI from the discrete DATABASE_* variables.
      //
      // The VPS profile supplies the discrete form on purpose: embedding the
      // application password inside a URI in the env file duplicated it (once
      // as APP_DB_PASSWORD, twice inside URIs) in an encoding the operator had
      // to get right by hand. A password containing `@` or `:` silently
      // produced a different host or a truncated secret. See
      // `src/lib/database-url.ts`.
      connectionString: resolveDatabaseConnectionString(),
    },
    migrationDir: path.resolve(dirname, 'migrations'),
    // Local development may opt into schema push. Production always uses the
    // versioned Payload migrations in `src/migrations`.
    push: !isProduction && payloadDbPushRequested,
    // Source-free production migrations. The adapter runs these from inside
    // `db.connect()` when `NODE_ENV === 'production'`, so the VPS needs no
    // repository checkout, no Payload CLI and no `operations` image.
    //
    // The import is deliberately static: Next's standalone file tracing
    // follows static `import` graphs, so `src/migrations/**` is emitted into
    // `.next/standalone`. A dynamic/globbed migration loader would not be
    // traced. `scripts/assert-runner-image.sh` asserts the traced output.
    //
    // Gated on the runtime flag so `next build` — which also evaluates this
    // config under `NODE_ENV=production` — never APPLIES migrations or
    // bootstraps. (Next's static generation can still open a Payload Local API
    // connection attempt during the build, logging harmless ECONNREFUSED with
    // no database present; the build is DB-independent, not connection-free.)
    prodMigrations: runtimeMigrationsEnabled() ? migrations : undefined,
    generateSchemaOutputFile: path.resolve(dirname, 'payload-generated-schema.ts'),
  }),
  sharp,
  serverURL,
  cors: corsAndCsrf,
  csrf: corsAndCsrf,
  // Minimal production identity bootstrap. Payload runs `onInit` after
  // `db.connect()` has completed — which is where `prodMigrations` apply — so
  // this always sees a fully migrated schema.
  //
  // This is NOT the broad canonical Seed: it only creates canonical system
  // Roles that do not exist yet and the configured Super Admin account.
  // `runSeed`, `rolesStage` and `defaultSeedStages` are never reachable from
  // here.
  //
  // Payload SWALLOWS errors thrown from `onInit` (measured — see
  // `identity-bootstrap-runner.ts`), so simply letting the error propagate
  // would leave a broken deployment reporting healthy. The runner records the
  // failure for `/api/health` and terminates the process instead.
  onInit: async (payload) => {
    if (!runtimeBootstrapEnabled()) return
    await runIdentityBootstrap(payload)
  },
  hooks: { afterError: [afterErrorLogger] },
  // The application uses Payload's Local and REST APIs. Keeping the unused
  // GraphQL schema and HTTP surface enabled only increases production attack
  // surface, so disable it through Payload's supported root configuration.
  graphQL: { disable: true },
  plugins,
})
