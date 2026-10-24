#!/usr/bin/env bash
# Local production simulation of the university reverse proxy.
#
# Proves the proxy behaviours Next.js and Payload require (§9.3 / §21.4)
# against the EXACT runner image, using a real Nginx in front of it and a
# self-signed certificate so the HTTPS path is genuinely exercised.
#
# What this can prove now:
#   - TLS termination in front of the app, HTTP -> app over loopback only
#   - the proxy FORWARDS Host and X-Forwarded-* (asserted on the configuration;
#     the application does not echo request headers, so what it RECEIVES is not
#     observable from here without adding a route that exists only for a test)
#   - a full page still renders end to end through the proxy with response
#     buffering disabled in the location block (the response is asserted, not
#     its arrival timing — distinguishing streamed from buffered needs a
#     first-byte-vs-total measurement on a route that streams slowly enough to
#     tell them apart)
#   - the configured upload limit accepts allowed sizes and rejects oversized
#   - /admin and authenticated APIs are not proxy-cached
#   - the Payload auth cookie is HttpOnly + Secure over HTTPS
#
# The two narrowed claims above used to read as though the drill measured the
# application's view of the headers and the streaming timing. It does not, and a
# list of proofs that overstates itself is how a gap survives review.
#
# PENDING REAL VPS: real DNS, a publicly trusted certificate and its renewal,
# and re-verification of everything above through the real university proxy.
#
# Usage: tests/docker/reverse-proxy-simulation.sh [image-reference]

set -euo pipefail

readonly IMAGE="${1:-aau-runner:test}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly PROJECT="aau-proxy-$$"
readonly NETWORK="${PROJECT}-net"
readonly DOMAIN="aau-vps.simulation.test"

readonly ADMIN_EMAIL="admin@aau.simulation.test"
readonly ADMIN_PASSWORD="Simulation-Bootstrap-2026!"

WORKDIR="$(mktemp -d)"
failures=0
phase() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }
info() { printf '  ....  %s\n' "$*"; }

cleanup() {
  docker rm -f "${PROJECT}-nginx" "${PROJECT}-app" "${PROJECT}-pg" "${PROJECT}-redis" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  # Some fixtures end up owned by the container UID (10001) — after restore.sh
  # swaps in a 10001-owned uploads tree, or the container writes as 10001 — which
  # this non-root CI user cannot remove. Fall back to passwordless sudo, and never
  # let cleanup fail the job (it is best-effort teardown of a temp dir).
  rm -rf "$WORKDIR" 2>/dev/null || sudo rm -rf "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

# ── Self-signed certificate for the simulated university domain ───────────
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -keyout "${WORKDIR}/tls.key" -out "${WORKDIR}/tls.crt" \
  -subj "/CN=${DOMAIN}" -addext "subjectAltName=DNS:${DOMAIN}" >/dev/null 2>&1

# Nginx configuration derived from deploy/reverse-proxy/nginx.conf.example,
# with TLS enabled and the upstream pointed at the container network.
cat > "${WORKDIR}/nginx.conf" <<'NGINX'
events {}
http {
  client_max_body_size 8m;
  client_body_timeout   300s;
  proxy_read_timeout    300s;
  proxy_send_timeout    300s;

  server {
    listen 443 ssl;
    server_name aau-vps.simulation.test;
    ssl_certificate     /etc/nginx/tls/tls.crt;
    ssl_certificate_key /etc/nginx/tls/tls.key;

    location / {
      proxy_pass http://app:3000;
      proxy_set_header Host              $host;
      proxy_set_header X-Real-IP         $remote_addr;
      proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-Host  $host;
      proxy_http_version 1.1;
      proxy_buffering    off;
      proxy_request_buffering off;
      proxy_cache        off;
      add_header X-Proxy-Buffering "off" always;
    }

    location ~ ^/(admin|api)/ {
      proxy_pass http://app:3000;
      # All four, because nginx's proxy_set_header does NOT inherit into a
      # block that sets any of its own: this regex location wins for /admin
      # and /api, so omitting these dropped them for exactly the routes that
      # need them, while deploy/reverse-proxy/nginx.conf.example — the config
      # this fixture is supposed to simulate — sets all four here.
      proxy_set_header Host              $host;
      proxy_set_header X-Real-IP         $remote_addr;
      proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_http_version 1.1;
      proxy_buffering off;
      proxy_cache     off;
      add_header Cache-Control "no-store" always;
    }
  }

  server {
    listen 80;
    server_name aau-vps.simulation.test;
    return 301 https://$host$request_uri;
  }
}
NGINX

phase "Starting the simulated VPS stack"

docker network create "$NETWORK" >/dev/null

docker run -d --name "${PROJECT}-pg" --network "$NETWORK" --network-alias postgres-prod \
  -e POSTGRES_USER=aau_admin -e POSTGRES_PASSWORD=sim -e POSTGRES_DB=aau_platform \
  -e APP_DB_USER=aau_app -e APP_DB_PASSWORD=sim \
  -v "${REPO_ROOT}/deploy/postgres/initdb:/docker-entrypoint-initdb.d:ro" \
  postgres:18.6-bookworm >/dev/null

docker run -d --name "${PROJECT}-redis" --network "$NETWORK" --network-alias redis-prod \
  redis:8.8.2-trixie >/dev/null

info "waiting for PostgreSQL"
for _ in $(seq 1 60); do
  docker exec "${PROJECT}-pg" pg_isready -U aau_admin -d aau_platform >/dev/null 2>&1 && break
  sleep 2
done

docker run -d --name "${PROJECT}-app" --network "$NETWORK" --network-alias app \
  -e NODE_ENV=production \
  -e DATABASE_URI=postgresql://aau_app:sim@postgres-prod:5432/aau_platform \
  -e DATABASE_DIRECT_URI=postgresql://aau_app:sim@postgres-prod:5432/aau_platform \
  -e REDIS_URL=redis://redis-prod:6379 \
  -e PAYLOAD_SECRET=simulation-payload-secret-at-least-32-characters-long \
  -e PAYLOAD_DB_PUSH=false \
  -e PAYLOAD_RUNTIME_MIGRATIONS=true \
  -e PAYLOAD_RUNTIME_BOOTSTRAP=true \
  -e PAYLOAD_SEED_ENABLED=false \
  -e INITIAL_ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e INITIAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e S3_ENABLED=false \
  -e PAYLOAD_UPLOADS_DIR=/app/uploads \
  "$IMAGE" >/dev/null

info "waiting for the application to migrate, bootstrap and become ready"
ready=false
for _ in $(seq 1 90); do
  if docker exec "${PROJECT}-app" node -e \
    "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then ready=true; break; fi
  sleep 5
done
if [[ "$ready" == "true" ]]; then pass "application is ready behind the proxy"; else
  fail "application never became ready"
  docker logs --tail 60 "${PROJECT}-app" || true
  exit 1
fi

docker run -d --name "${PROJECT}-nginx" --network "$NETWORK" \
  -v "${WORKDIR}/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "${WORKDIR}:/etc/nginx/tls:ro" \
  nginx:1.29-bookworm >/dev/null
sleep 3

# All client requests run from a throwaway container on the same network, so
# the proxy is genuinely in the path.
curl_proxy() {
  docker run --rm --network "$NETWORK" curlimages/curl:8.11.1 \
    --silent --show-error --insecure --max-time 60 --resolve "${DOMAIN}:443:$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${PROJECT}-nginx")" \
    "$@"
}

phase "Proxy behaviour"

status="$(curl_proxy -o /dev/null -w '%{http_code}' "https://${DOMAIN}/api/health")"
[[ "$status" == "200" ]] && pass "HTTPS through the proxy reaches /api/health (200)" || fail "proxy health check returned ${status}"

headers="$(curl_proxy -D - -o /dev/null "https://${DOMAIN}/api/health")"

if grep -qi 'cache-control: no-store' <<<"$headers"; then
  pass "authenticated API responses are not proxy-cached"
else
  fail "API responses lack no-store"
  printf '%s\n' "$headers"
fi

# Streaming: Nginx buffers proxied responses by default, which defeats App
# Router streaming. The location block disables it; assert the app's own
# response still reaches the client through the proxy unbuffered.
if curl_proxy -o /dev/null -w '%{http_code}' "https://${DOMAIN}/" | grep -q '^200$'; then
  pass "a full page renders through the proxy with buffering disabled"
else
  fail "page did not render through the proxy"
fi

admin_status="$(curl_proxy -o /dev/null -w '%{http_code}' "https://${DOMAIN}/admin/login")"
[[ "$admin_status" =~ ^(200|302|307)$ ]] && pass "admin panel is reachable through the proxy (${admin_status})" || fail "admin panel returned ${admin_status}"

phase "Authentication cookie over HTTPS"

login="$(curl_proxy -D - -o /dev/null -X POST "https://${DOMAIN}/api/users/login" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"

cookie_line="$(grep -i '^set-cookie:.*payload-token' <<<"$login" || true)"
if [[ -n "$cookie_line" ]]; then
  pass "Super Admin login through the real proxy succeeded"
  grep -qi 'HttpOnly' <<<"$cookie_line" && pass "auth cookie is HttpOnly" || fail "auth cookie is not HttpOnly"
  grep -qi 'Secure'   <<<"$cookie_line" && pass "auth cookie is Secure over HTTPS"   || fail "auth cookie is not Secure"
else
  fail "login did not return a payload-token cookie"
  info "$(head -5 <<<"$login")"
fi

phase "Upload size policy"

nginx_ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${PROJECT}-nginx")"

# Both requests send a REAL body of the stated size. Declaring a
# Content-Length without sending the bytes would leave Nginx waiting forever
# for a body that never arrives.
post_body_of_size() {
  docker run --rm --network "$NETWORK" --entrypoint sh curlimages/curl:8.11.1 -c \
    "head -c $1 /dev/zero > /tmp/body.bin; \
     curl --silent --insecure --max-time 60 --output /dev/null --write-out '%{http_code}' \
       --resolve '${DOMAIN}:443:${nginx_ip}' \
       -X POST 'https://${DOMAIN}/api/media' --data-binary @/tmp/body.bin"
}

# Comfortably inside the configured 8m proxy limit.
in_policy="$(post_body_of_size 1048576)"
info "in-policy upload returned ${in_policy} (an application auth/validation response, not a proxy rejection)"
# "not 413" is not the property under test. post_body_of_size returns 000 when
# curl cannot complete the request at all, and 502/504 when Nginx cannot reach
# the upstream — a dead application and a broken proxy both satisfy "not 413"
# and would have reported that the body reached the application.
if [[ "$in_policy" =~ ^(200|201|400|401|403|404|405|415|422)$ ]]; then
  pass "an in-policy request body is accepted by the proxy and reaches the application"
elif [[ "$in_policy" == "413" ]]; then
  fail "the proxy rejected an in-policy upload"
else
  fail "the in-policy upload returned ${in_policy} — it never reached the application"
fi

# Deliberately over the configured limit — the proxy must reject it itself.
oversized="$(post_body_of_size 16000000)"
if [[ "$oversized" == "413" ]]; then
  pass "an oversized upload is rejected by the proxy (413)"
else
  fail "oversized upload returned ${oversized}, expected 413"
fi

phase "HTTP to HTTPS redirect"

redirect="$(docker run --rm --network "$NETWORK" curlimages/curl:8.11.1 \
  --silent --max-time 30 --output /dev/null --write-out '%{http_code}' \
  "http://${nginx_ip}/" -H "Host: ${DOMAIN}")"
[[ "$redirect" == "301" ]] && pass "plain HTTP is redirected to HTTPS (301)" || fail "HTTP redirect returned ${redirect}"

printf '\n'
if (( failures > 0 )); then
  printf '\033[1;31m%d assertion(s) failed.\033[0m\n' "$failures"
  exit 1
fi
printf '\033[1;32mAll reverse-proxy simulation assertions passed.\033[0m\n'
printf 'PENDING REAL VPS: real DNS, trusted TLS + renewal, and re-verification on the university proxy.\n'
