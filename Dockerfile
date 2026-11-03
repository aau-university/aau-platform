# syntax=docker/dockerfile:1
# This build uses BuildKit-only features (`RUN --mount=type=cache`), so the
# Dockerfile frontend is declared explicitly rather than relying on the
# daemon's default.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS base

ENV PNPM_HOME=/pnpm
ENV COREPACK_HOME=/usr/local/share/corepack
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@10.34.4 --activate \
  && chmod -R a+rX "$COREPACK_HOME"

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=aau-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS dev
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh
COPY . .
RUN sha256sum package.json pnpm-lock.yaml \
  | sha256sum \
  | awk '{print $1}' > node_modules/.aau-pnpm-lock-hash
ENV NODE_ENV=development
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "dev"]

# One-shot production operations image. Payload migrations run from the exact
# same source and dependency graph as the application, while the runtime image
# remains a minimal Next.js standalone image.
FROM deps AS operations
COPY . .
ENV NODE_ENV=production
RUN mkdir -p /app/uploads/media /app/uploads/private \
  && chown -R 10001:10001 /app/uploads
USER 10001:10001
CMD ["pnpm", "payload", "migrate"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV S3_ENABLED=false
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Runtime-only behaviour must never be triggered by `next build`, which
# evaluates the Payload config in `NODE_ENV=production`. Pinning both flags
# off here is defence in depth on top of the runtime guards in
# `src/lib/runtime-mode.ts`: the build never APPLIES migrations or bootstraps,
# and needs no database credentials or reachable server. (Next's static
# generation can still make a Payload Local API connection ATTEMPT during the
# build — harmless ECONNREFUSED with no database present. The build is
# DB-independent, not connection-free.)
ENV PAYLOAD_RUNTIME_MIGRATIONS=false
ENV PAYLOAD_RUNTIME_BOOTSTRAP=false

# Next.js collects completely anonymous telemetry data about general usage.
# https://nextjs.org/telemetry — disabled so image builds stay hermetic.
ENV NEXT_TELEMETRY_DISABLED=1

# Validate the origin HERE, where it is baked in.
#
# `NEXT_PUBLIC_SERVER_URL` is inlined by `next build`, so an origin carrying a
# path, query, fragment, userinfo or a non-HTTPS scheme becomes a permanent
# property of the artifact — and the failure it causes (a CORS entry that never
# matches a browser's bare Origin header, or absolute URLs with a stray path
# segment) does not surface until the release is live. The check runs the same
# `normalizePublicOrigin` the runtime uses, so the build and the application
# cannot disagree about what a valid origin is. A localhost/loopback origin is
# still allowed for local and CI builds; the production PUBLISH policy is a
# separate, stricter gate in .github/workflows/build-publish.yml.
RUN if [ "${NEXT_PUBLIC_SERVER_URL#https://}" != "${NEXT_PUBLIC_SERVER_URL}" ]; then \
      pnpm exec tsx scripts/check-production-origin.ts "$NEXT_PUBLIC_SERVER_URL"; \
    else \
      echo "non-HTTPS origin ${NEXT_PUBLIC_SERVER_URL}: local/CI build, canonical-origin gate not applicable"; \
    fi

# The disposable secret below only satisfies Payload's config-time strength
# check so the config can be evaluated during compilation. It is scoped to
# this single RUN rather than declared as ENV, so no secret-named variable is
# recorded in any image layer or inherited by a downstream stage.
#
# Real production secrets are NEVER build inputs: PAYLOAD_SECRET, DATABASE_URI,
# DATABASE_DIRECT_URI, POSTGRES_*, registry credentials and the bootstrap
# password all arrive at container start. Build args and ENV are not secret
# storage — they are readable in the image history.
RUN PAYLOAD_SECRET=build-only-non-production-secret-not-used-at-runtime \
  pnpm run build

# Production image, copy all the files and run next
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-secret release identity. CI passes the real values; local builds get
# empty labels rather than misleading ones. The deployed identity of record is
# always the registry digest, not these labels.
ARG IMAGE_REVISION=""
ARG IMAGE_SOURCE=""
ARG IMAGE_VERSION=""
ARG IMAGE_CREATED=""
LABEL org.opencontainers.image.revision=$IMAGE_REVISION \
  org.opencontainers.image.source=$IMAGE_SOURCE \
  org.opencontainers.image.version=$IMAGE_VERSION \
  org.opencontainers.image.created=$IMAGE_CREATED \
  org.opencontainers.image.title="aau-payload-platform" \
  org.opencontainers.image.licenses="MIT"

# ── Debian security updates ───────────────────────────────────────────────
# The release gate's image scan BLOCKS on fixable HIGH/CRITICAL findings in this
# image, and it found libpcre2-8-0 CVE-2026-86145 (fixed in 10.42-1+deb12u1)
# shipped by the base. libpcre2 is a base system library — unlike npm's vendored
# copies above, it cannot simply be deleted — so the fix is to take the update.
#
# `upgrade`, not a named package: the gate blocks on whatever is fixable, so
# patching one package by name only moves the failure to the next CVE in the
# base. This image is a thin runtime whose packages are base utilities, and
# `assert-runner-image.sh` plus the production simulation prove it still works
# afterwards.
#
# The base is still digest-pinned, so what changes between builds is bounded to
# the Debian security pocket — and this layer only exists because a pinned base
# necessarily lags its distribution's security updates between rebuilds.
RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 10001 nodejs
# `--ingroup nodejs` makes nodejs (GID 10001) the user's PRIMARY group. Without
# it, `adduser --system` defaults the primary group to `nogroup` (GID 65534),
# so the container would run as 10001:65534 — writes to /app/uploads still work
# (it is owned by the nextjs user), but the runtime GID would not be the nodejs
# group the image intends. assert-runner-image.sh checks the GID, not just write
# access, so this is enforced.
RUN adduser --system --uid 10001 --ingroup nodejs nextjs
RUN mkdir -p /app/uploads/media /app/uploads/private \
  && chown -R nextjs:nodejs /app/uploads

# A source-free production runtime has no use for a package manager, and the
# npm CLI the base image bundles is the single largest source of vulnerable
# code in this image: its vendored tar, ip-address, undici and brace-expansion
# copies are what the release gate's image scan reports, not anything this
# application depends on. Removing them is the fix, not an exemption — and it
# is the same invariant the VPS itself is held to: no build tooling in
# production. `assert-runner-image.sh` fails the build if any of them return.
RUN rm -rf /usr/local/lib/node_modules/npm \
  /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm \
  /usr/local/bin/npx \
  /usr/local/bin/corepack \
  /usr/local/bin/yarn \
  /usr/local/bin/yarnpkg \
  /opt/yarn-v*

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
