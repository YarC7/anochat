## Multi-stage build for Next.js (standalone) + WS + migrations
## Targets:
## - app-runner: minimal runtime for Next standalone server
## - ws-runner: websocket server runtime
## - migrate-runner: tooling image to run DB migrations

# --- Dependencies (build-time) ---
FROM node:20-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci

# --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- App Runner (Next standalone) ---
FROM node:20-alpine AS app-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output contains its own minimal node_modules + server.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

# --- WebSocket Runner ---
FROM node:20-alpine AS ws-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY scripts ./scripts

EXPOSE 8080
CMD ["node", "scripts/ws-server.js"]

# --- Migration Runner (tooling) ---
FROM node:20-alpine AS migrate-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Needs drizzle-kit (devDependency) + schema files
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY drizzle.config.ts ./drizzle.config.ts
COPY db ./db
COPY drizzle ./drizzle

CMD ["npx", "drizzle-kit", "push"]
