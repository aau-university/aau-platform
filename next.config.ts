import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
const isWindows = process.platform === 'win32'
const forceStandalone = process.env.NEXT_OUTPUT_STANDALONE === 'true'
const s3Endpoint = process.env.S3_ENABLED === 'true' ? process.env.S3_ENDPOINT : undefined
const r2PublicUrl = process.env.R2_PUBLIC_URL

function s3RemotePatterns() {
  const patterns: Array<{
    protocol: 'http' | 'https'
    hostname: string
    port?: string
    pathname: string
  }> = []

  // S3 API endpoint (for pre-signed URLs / private media)
  if (s3Endpoint) {
    try {
      const url = new URL(s3Endpoint)
      patterns.push({
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port,
        pathname: '/**',
      })
    } catch {
      // ignore invalid URL
    }
  }

  // R2 public domain (for public media URLs served via generateFileURL)
  if (r2PublicUrl) {
    try {
      const url = new URL(r2PublicUrl)
      patterns.push({
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port,
        pathname: '/**',
      })
    } catch {
      // ignore invalid URL
    }
  }

  return patterns
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Required for the Dockerfile in this repo (multi-stage build copies
  // .next/standalone). Windows local builds can fail when Next copies
  // traced dependencies through symlinks, so local development omits it on
  // Windows unless release tests explicitly request the production artifact.
  ...(isWindows && !forceStandalone ? {} : { output: 'standalone' as const }),
  // Keep project TypeScript out of the production runtime image.
  //
  // `@vercel/nft` cannot statically resolve the paths in modules that use
  // `node:fs` (the private-media download route and the local upload
  // helpers), so it conservatively copies those *source* files into
  // `.next/standalone` alongside the compiled output. Only the compiled
  // bundle is ever executed, so the raw `.ts` copies are dead weight — and
  // they are exactly the project-source leakage the deployment contract
  // forbids in the runner image.
  //
  // Only `.ts`/`.tsx` are excluded: compiled `.js` assets (such as Payload's
  // generated import map) must still be traced. `scripts/assert-runner-image.sh`
  // asserts the result, and the Docker production simulation proves the
  // runtime still works without them.
  outputFileTracingExcludes: {
    '**/*': ['./src/**/*.ts', './src/**/*.tsx'],
  },
  // sharp 0.35 moved its native binding and libvips out of the `sharp` package
  // into per-platform `@img/*` packages. The tracer cannot follow them: what it
  // sees is a `require` behind a runtime platform check, so it traces `sharp`
  // itself and nothing it actually needs to run. A plain version bump therefore
  // produced a runner image that started and then failed every request with
  // `ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3`, and had to be reverted.
  //
  // Naming them here is the supported way to tell the tracer about a dependency
  // it cannot infer, and it keeps the runner minimal — these two packages, not
  // the whole node_modules tree. Linux x64 is the only platform the runner
  // image targets; a developer's machine installs its own platform build
  // outside the image.
  //
  // `package.json` also pins sharp tree-wide via `pnpm.overrides`, because Next
  // depends on sharp itself: without that, both 0.34.5 and 0.35.3 resolve, and
  // the glob below would carry the *vulnerable* libvips 8.17.3 into the image
  // alongside the fixed 8.18.3 — leaving the advisory unfixed while looking
  // fixed. `assert-runner-image.sh` proves the outcome by loading sharp in the
  // built image and resizing, and the production simulation drives a real
  // `/_next/image` request through the optimizer.
  //
  // The `@img/*/**/*` shape (rather than `@img/**/*`) is load-bearing on Next
  // 16.3+: pnpm links libvips into the platform package's own `@img` directory
  // as a SYMLINK, `@img/**/*` matches that symlink entry itself, and Turbopack
  // then fails the whole build trying to read it as a file —
  //
  //   TurbopackInternalError: reading file ".../@img/sharp-libvips-linux-x64"
  //   Caused by: Is a directory (os error 21)
  //
  // Requiring at least one more path segment matches everything INSIDE both
  // packages, through the symlink, while never matching the link entry itself.
  outputFileTracingIncludes: {
    '**/*': [
      './node_modules/.pnpm/@img+sharp-linux-x64@*/node_modules/@img/*/**/*',
      './node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/*/**/*',
    ],
  },
  images: {
    qualities: [75, 100],
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        pathname: '/assets/**',
      },
    ],
    remotePatterns: [
      ...s3RemotePatterns(),
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/**',
      }
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
