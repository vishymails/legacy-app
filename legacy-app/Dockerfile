# =============================================================================
# 12-Factor App Dockerfile
# -----------------------------------------------------------------------------
# Factor II  — Dependencies : all deps declared in package.json; npm ci gives
#              a reproducible, locked install from package-lock.json only.
# Factor III — Config       : runtime config (PORT) injected via env vars.
# Factor V   — Build/Run    : multi-stage build keeps build tooling out of the
#              production image; runner stage contains only compiled JS + prod deps.
# Factor VII — Port binding : app binds to $PORT; EXPOSE documents the default.
# Factor XI  — Logs         : process writes to stdout/stderr; no log files.
# =============================================================================

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so this layer is cached unless deps change (Factor II)
COPY package*.json tsconfig.json tsconfig.build.json ./

# Install ALL dependencies (including devDeps needed for tsc)
RUN npm ci

# Copy application source — no tests, no deploy artefacts
COPY src/ ./src/

# Compile TypeScript → JavaScript using the production-only tsconfig
RUN npx tsc --project tsconfig.build.json

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Principle of least privilege: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what production needs
COPY package*.json ./

# Install production dependencies only — no TypeScript, no Jest, no ts-node
RUN npm ci --omit=dev

# Copy compiled JavaScript from the builder stage
# rootDir="." + outDir="dist" → compiled src lands at dist/src/
COPY --from=builder /app/dist/src ./dist/src

# Factor III — default port; override at runtime with -e PORT=XXXX
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Drop to non-root before starting the process
USER appuser

# Factor XI — node writes to stdout by default; no wrapper needed
CMD ["node", "dist/src/index.js"]
