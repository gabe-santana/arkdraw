# syntax=docker/dockerfile:1
#
# ArkDraw web edition: static build served by nginx.
#
#   docker build -t arkdraw .
#   docker run --rm -p 8080:8080 arkdraw          → http://localhost:8080
#
# Runtime env: PORT (default 8080), FRAME_ANCESTORS (who may iframe the app,
# default *). See docs/web.md.

# ---- build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
# Sub-path deployments (behind a prefix-stripping proxy): --build-arg BASE_PATH=/arkdraw/
ARG BASE_PATH=/
# Build, render the nginx template with the CSP script hashes, drop the
# Netlify-style _headers file (nginx sets headers itself), and pre-compress
# text assets for gzip_static (originals kept for clients without gzip).
RUN npm run build:web -- --base="${BASE_PATH}" \
 && node scripts/web/csp.mjs dist --nginx deploy/nginx.conf /tmp/default.conf.template \
 && rm -f dist/_headers \
 && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' \
      -o -name '*.webmanifest' -o -name '*.txt' -o -name '*.md' \) -size +1k -exec gzip -9 -k -n {} +

# ---- serve -------------------------------------------------------------------
FROM nginx:1.27-alpine

ENV PORT=8080 \
    FRAME_ANCESTORS="*"

# Rendered to /etc/nginx/conf.d/default.conf by the image's envsubst entrypoint.
COPY --from=build /tmp/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
