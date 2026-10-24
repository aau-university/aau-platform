# `src/utilities/`

Generic, stateless helpers ported (with AAU adaptations) from the official
Payload website template. Consumed by routes, blocks, and metadata
generators across the public site.

## Convention

- **Generic helpers only.** No Payload collection knowledge beyond a slug
  string. No AAU business rules.
- **AAU-specific business logic lives in `src/lib/`.** If a helper needs to
  know about a specific collection's access rules, college scoping, or
  public-facing projection shape, it belongs in `src/lib/payload/`, not
  here.
- **Re-exports are OK.** `deepMerge` re-exports the implementation from
  `src/fields/deepMerge.ts` so callers can import from a single
  `@/utilities` barrel.
- **No side effects at module scope.** Every helper is a pure function or
  an async loader that takes its dependencies as arguments (env, payload
  instance, cookies).

## Index

| Helper                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `canUseDOM`           | Browser-environment guard.                               |
| `deepMerge`           | Deep-merge objects (arrays replaced).                    |
| `formatAuthors`       | Comma-separated user full-names for bylines.             |
| `formatDateTime`      | Locale-aware date string via `Intl.DateTimeFormat`.      |
| `generateMeta`        | Build Next.js `Metadata` from a Payload doc + SEO fields. |
| `generatePreviewPath` | Build `/next/preview?...` path for Live Preview.         |
| `getCachedRedirects`  | `unstable_cache` wrapper for the `redirects` collection. |
| `getDocument`         | Cached single-doc fetch by slug.                         |
| `getGlobals`          | Cached multi-global fetch.                               |
| `getMeUser`           | Resolve the current Payload user from the JWT cookie.    |
| `getMediaUrl`         | Absolute URL + cache-bust for a `Media` doc.             |
| `getURL`              | Server/client origin resolution (`NEXT_PUBLIC_SERVER_URL`). |
| `mergeOpenGraph`      | Merge per-page OG with site defaults.                    |
| `toKebabCase`         | camelCase/PascalCase/snake_case → kebab-case.            |

Import via the barrel: `import { generateMeta, getDocument } from '@/utilities'`.
